#pragma once

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
// Project URL and anon key, from Project Settings -> API.
// The anon key is safe to embed on-device: RLS only allows it to INSERT into
// vitals_readings, gated by DEVICE_KEY below (see supabase/migrations/0001_init.sql).
#define SUPABASE_URL      "https://yrcllbptaocqzjmdqgys.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyY2xsYnB0YW9jcXpqbWRxZ3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjQwMjksImV4cCI6MjA5OTU0MDAyOX0.88-sRqLw4sX1shXWeCyMKq90BxWdNW7jRLXkvl-w5V8"

// Per-device secret. Create a row in the `devices` table from the web app
// (Devices page) and paste its generated device_key here. This is how the
// backend maps a reading to the correct patient without trusting the ESP32
// to say who it is.
#define DEVICE_KEY "PASTE_DEVICE_KEY_HERE"

// ---------------------------------------------------------------------------
// Pin map - matches the schematic in docs/. Adjust to your wiring.
// ---------------------------------------------------------------------------
#define PIN_I2C_SDA   21   // MAX30100 SDA (J1/J4)
#define PIN_I2C_SCL   22   // MAX30100 SCL (J1/J4)
#define PIN_TEMP_ADC  34   // NTC thermistor divider (J3/R7), ADC1-only pin
#define PIN_BUZZER    19   // Buzzer driver transistor Q3 (R9)
#define PIN_LED_RED   18   // Alert LED, driven by Q1 (R4/D4)
#define PIN_LED_GREEN 5    // Status-OK LED, driven by Q2 (R5/D3)

// ---------------------------------------------------------------------------
// Thermistor (NTC) - series resistor R7 = 4.7k to +5V, thermistor to GND
// ---------------------------------------------------------------------------
#define SERIES_RESISTOR_OHMS     4700.0
#define THERMISTOR_NOMINAL_OHMS  10000.0 // resistance at 25C, check your NTC datasheet
#define THERMISTOR_NOMINAL_TEMP  25.0
#define THERMISTOR_B_COEFFICIENT 3950.0  // typical for 10k NTC, check your datasheet
#define ADC_MAX_VALUE            4095.0

// ---------------------------------------------------------------------------
// Clinical thresholds used for on-device LED/buzzer alerting.
// The web app / database applies the authoritative per-patient thresholds;
// these are just sane local defaults so the unit still beeps if offline.
// ---------------------------------------------------------------------------
#define HR_MIN 50
#define HR_MAX 120
#define SPO2_MIN 92
#define TEMP_MIN_C 35.5
#define TEMP_MAX_C 38.5

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
#define REPORT_INTERVAL_MS  3000   // how often a reading is sent to Supabase
#define WIFI_RETRY_MS       10000
