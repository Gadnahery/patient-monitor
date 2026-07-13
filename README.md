# Patient Monitor

A small end-to-end patient monitoring system:

- **firmware/** — ESP32 firmware reading heart rate + SpO2 (MAX30100) and body
  temperature (NTC thermistor), with local LED/buzzer alerting and readings
  pushed to Supabase.
- **webapp/** — Next.js + shadcn/ui dashboard for clinical staff: live vitals
  per patient, historical charts, configurable alert thresholds, and
  real-time critical/warning alerts.
- **supabase/migrations/** — Postgres schema (patients, devices, vitals
  readings, alerts) with row-level security and automatic threshold-based
  alerting.
- **docs/hardware.md** — pin mapping derived from the provided schematic.

## Setup order

1. **Database**: open your Supabase project's SQL Editor and run
   `supabase/migrations/0001_init.sql` (or apply it with the Supabase CLI:
   `supabase link` then `supabase db push`).
2. **Web app**: see `webapp/README` section below.
3. **Firmware**: see `firmware/patient_monitor` — set Wi-Fi credentials and
   the device key in `include/config.h`, then flash with PlatformIO.

## Web app

```bash
cd webapp
npm install
cp .env.local.example .env.local   # already contains the project URL + anon key
npm run dev
```

Sign up for a clinician account at `/signup`, then:

1. Go to **Devices** → *Register device* to create a monitor and get its
   `device_key`.
2. Paste that key into the firmware's `config.h` (`DEVICE_KEY`).
3. Go to **Patients** → *Add patient*.
4. On the **Devices** page, assign the registered device to that patient.
5. Once the ESP32 boots and connects, its readings appear live on the
   dashboard, and out-of-range vitals raise alerts automatically (visible on
   the **Alerts** page and as toast notifications).

### How device auth works

The ESP32 only ever holds the Supabase **anon** key plus its own
`device_key`. Row-level security only lets the anon role `INSERT` into
`vitals_readings`; a database trigger resolves `device_key` to a
`device_id`/`patient_id` server-side and rejects unknown keys, so a stolen
anon key alone can't read any patient data or impersonate a different
device.

## Firmware

PlatformIO project targeting an ESP32-DevKitC32D. See
`firmware/patient_monitor/include/config.h` for Wi-Fi, Supabase, and pin
configuration, and `docs/hardware.md` for how those pins map to the
schematic.

```bash
cd firmware/patient_monitor
pio run           # build
pio run -t upload # flash
pio device monitor
```
