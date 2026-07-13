-- Patient Monitor schema
-- Tables: profiles (clinicians), patients, devices, vitals_readings, alerts
-- ESP32 devices authenticate with a per-device secret (device_key) carried in
-- each insert; a trigger resolves it server-side and rejects unknown keys.
-- The Supabase anon key is only ever used for that scoped insert plus
-- clinician auth - it must never be trusted to read patient data directly
-- (RLS below denies anon SELECT everywhere).

-- ---------------------------------------------------------------------------
-- profiles: one row per clinician (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'clinician' check (role in ('clinician', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles editable by owner" on public.profiles
  for update to authenticated using (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  mrn text unique,
  full_name text not null,
  date_of_birth date,
  room text,
  bed text,
  status text not null default 'active' check (status in ('active', 'discharged')),
  thresholds jsonb not null default '{
    "hr_min": 50, "hr_max": 120,
    "spo2_min": 92,
    "temp_min": 35.5, "temp_max": 38.5
  }'::jsonb,
  admitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "patients readable by authenticated" on public.patients
  for select to authenticated using (true);

create policy "patients writable by authenticated" on public.patients
  for insert to authenticated with check (true);

create policy "patients updatable by authenticated" on public.patients
  for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- devices: one row per ESP32 monitor unit
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_key text not null unique default encode(gen_random_bytes(18), 'base64'),
  patient_id uuid references public.patients (id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;

create policy "devices readable by authenticated" on public.devices
  for select to authenticated using (true);

create policy "devices writable by authenticated" on public.devices
  for insert to authenticated with check (true);

create policy "devices updatable by authenticated" on public.devices
  for update to authenticated using (true);

-- ---------------------------------------------------------------------------
-- vitals_readings
-- ---------------------------------------------------------------------------
create table public.vitals_readings (
  id bigint generated always as identity primary key,
  device_id uuid references public.devices (id) on delete set null,
  patient_id uuid references public.patients (id) on delete set null,
  device_key text, -- write-only credential, never selected by clients
  heart_rate integer,
  spo2 numeric,
  temperature numeric,
  signal_quality text default 'ok' check (signal_quality in ('ok', 'weak', 'no_contact')),
  recorded_at timestamptz not null default now()
);

alter table public.vitals_readings enable row level security;

create index vitals_readings_patient_recorded_idx
  on public.vitals_readings (patient_id, recorded_at desc);

create policy "vitals readable by authenticated" on public.vitals_readings
  for select to authenticated using (true);

-- Devices (anon key) may insert only; device_key is validated server-side.
create policy "vitals insertable by anon device" on public.vitals_readings
  for insert to anon with check (true);

create policy "vitals insertable by authenticated" on public.vitals_readings
  for insert to authenticated with check (true);

create function public.resolve_vitals_device()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  d public.devices%rowtype;
begin
  if new.device_key is null then
    raise exception 'device_key is required';
  end if;

  select * into d from public.devices where device_key = new.device_key;
  if not found then
    raise exception 'unknown device_key';
  end if;

  new.device_id := d.id;
  new.patient_id := d.patient_id;
  new.device_key := null; -- never persist the secret
  new.recorded_at := now();

  update public.devices set last_seen_at = now() where id = d.id;

  return new;
end;
$$;

create trigger vitals_resolve_device
  before insert on public.vitals_readings
  for each row execute function public.resolve_vitals_device();

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
create table public.alerts (
  id bigint generated always as identity primary key,
  patient_id uuid references public.patients (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  reading_id bigint references public.vitals_readings (id) on delete set null,
  type text not null check (type in (
    'hr_high', 'hr_low', 'spo2_low', 'temp_high', 'temp_low', 'sensor_error'
  )),
  severity text not null check (severity in ('warning', 'critical')),
  message text not null,
  value numeric,
  acknowledged boolean not null default false,
  acknowledged_by uuid references public.profiles (id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

create index alerts_patient_created_idx on public.alerts (patient_id, created_at desc);
create index alerts_unacknowledged_idx on public.alerts (acknowledged) where not acknowledged;

create policy "alerts readable by authenticated" on public.alerts
  for select to authenticated using (true);

create policy "alerts insertable by system" on public.alerts
  for insert to authenticated, anon with check (true);

create policy "alerts updatable by authenticated" on public.alerts
  for update to authenticated using (true);

-- Evaluate a new reading against the patient's thresholds and raise alerts.
create function public.evaluate_vitals_reading()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  t jsonb;
begin
  if new.patient_id is null then
    insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
    values (null, new.device_id, new.id, 'sensor_error', 'warning',
      'Reading received from a device with no patient assigned', null);
    return new;
  end if;

  select thresholds into t from public.patients where id = new.patient_id;

  if new.heart_rate is not null then
    if new.heart_rate < (t ->> 'hr_min')::numeric then
      insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
      values (new.patient_id, new.device_id, new.id, 'hr_low',
        case when new.heart_rate < (t ->> 'hr_min')::numeric - 15 then 'critical' else 'warning' end,
        'Heart rate low: ' || new.heart_rate || ' bpm', new.heart_rate);
    elsif new.heart_rate > (t ->> 'hr_max')::numeric then
      insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
      values (new.patient_id, new.device_id, new.id, 'hr_high',
        case when new.heart_rate > (t ->> 'hr_max')::numeric + 20 then 'critical' else 'warning' end,
        'Heart rate high: ' || new.heart_rate || ' bpm', new.heart_rate);
    end if;
  end if;

  if new.spo2 is not null and new.spo2 < (t ->> 'spo2_min')::numeric then
    insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
    values (new.patient_id, new.device_id, new.id, 'spo2_low',
      case when new.spo2 < (t ->> 'spo2_min')::numeric - 6 then 'critical' else 'warning' end,
      'SpO2 low: ' || new.spo2 || '%', new.spo2);
  end if;

  if new.temperature is not null then
    if new.temperature < (t ->> 'temp_min')::numeric then
      insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
      values (new.patient_id, new.device_id, new.id, 'temp_low',
        case when new.temperature < (t ->> 'temp_min')::numeric - 1.5 then 'critical' else 'warning' end,
        'Temperature low: ' || new.temperature || ' C', new.temperature);
    elsif new.temperature > (t ->> 'temp_max')::numeric then
      insert into public.alerts (patient_id, device_id, reading_id, type, severity, message, value)
      values (new.patient_id, new.device_id, new.id, 'temp_high',
        case when new.temperature > (t ->> 'temp_max')::numeric + 1.5 then 'critical' else 'warning' end,
        'Temperature high: ' || new.temperature || ' C', new.temperature);
    end if;
  end if;

  return new;
end;
$$;

create trigger vitals_evaluate_alerts
  after insert on public.vitals_readings
  for each row execute function public.evaluate_vitals_reading();

-- ---------------------------------------------------------------------------
-- latest_vitals: most recent reading per patient, for dashboard cards
-- ---------------------------------------------------------------------------
create view public.latest_vitals
with (security_invoker = true) as
select distinct on (patient_id) *
from public.vitals_readings
where patient_id is not null
order by patient_id, recorded_at desc;

grant select on public.latest_vitals to authenticated;

-- ---------------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.vitals_readings;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.devices;
