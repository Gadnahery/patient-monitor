-- The initial schema gave authenticated clinicians select/insert/update on
-- patients, devices and alerts, but never granted DELETE - so every delete
-- button in the web app (remove patient, remove device, delete alert,
-- delete all alerts) was silently blocked by RLS with no visible error.
-- This migration closes that gap.

create policy "patients deletable by authenticated" on public.patients
  for delete to authenticated using (true);

create policy "devices deletable by authenticated" on public.devices
  for delete to authenticated using (true);

create policy "alerts deletable by authenticated" on public.alerts
  for delete to authenticated using (true);

create policy "vitals deletable by authenticated" on public.vitals_readings
  for delete to authenticated using (true);
