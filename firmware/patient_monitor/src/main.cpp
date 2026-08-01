// Patient Monitor - ESP32 firmware
//
// Reads pulse rate + SpO2 from a MAX30100 and body temperature from an NTC
// thermistor divider, pushes readings to Supabase, and drives a local
// red/green LED + buzzer so bedside staff get an alert even if the network
// or web app is down. See docs/hardware.md for the pin map.

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <MAX30100_PulseOximeter.h>
#include <LiquidCrystal_I2C.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

#include "config.h"

PulseOximeter pox;
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLS, LCD_ROWS);

uint32_t lastReportAt = 0;
uint32_t lastBeepToggleAt = 0;
uint32_t lastSensorRetryAt = 0;
uint32_t lastI2cScanAt = 0;
bool buzzerOn = false;
bool sensorReady = false;
int consecutiveOutOfRange = 0;

void onBeatDetected() {
  Serial.println("Beat detected");
}

// Diagnostic only: lists every address that ACKs on the shared SDA/SCL bus.
// Expect 0x57 (MAX30100) and LCD_I2C_ADDRESS (LCD backpack, usually 0x27 or
// 0x3F). Run this at boot, periodically, and right as the buzzer fires to
// tell apart three different failure modes on a shared-bus PCB:
//   - a device missing here at boot            -> bad solder joint/pull-ups
//   - devices present at boot but drop later    -> noise/ground/power issue
//   - devices drop specifically when the buzzer -> EMI coupling from the
//     fires                                        buzzer driver into SDA/SCL
void scanI2CBus(const char *label) {
  Serial.printf("I2C scan (%s): ", label);
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("0x%02X ", addr);
      found++;
    }
  }
  if (found == 0) Serial.print("(nothing responded)");
  Serial.printf(" [%d device%s]\n", found, found == 1 ? "" : "s");
}

// A loose wire at power-on can leave the sensor undetected forever without
// this - retry init periodically instead of only once in setup().
void ensureSensorReady() {
  if (sensorReady) return;
  if (millis() - lastSensorRetryAt < SENSOR_RETRY_MS) return;
  lastSensorRetryAt = millis();

  if (pox.begin()) {
    pox.setIRLedCurrent(MAX30100_LED_CURR_24MA);
    pox.setOnBeatDetectedCallback(onBeatDetected);
    sensorReady = true;
    Serial.println("MAX30100 ready (recovered)");
  } else {
    Serial.println("MAX30100 retry failed, check wiring");
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("Connecting to Wi-Fi \"%s\"...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_RETRY_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Wi-Fi connected, IP=%s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("Wi-Fi connect failed, will retry");
  }
}

// Steinhart-Hart approximation for a series-resistor NTC divider.
float readTemperatureC() {
  int raw = analogRead(PIN_TEMP_ADC);
  Serial.printf("Temp ADC raw=%d (0=short/GND, %d=open/3.3V)\n", raw, (int)ADC_MAX_VALUE);
  if (raw <= 0 || raw >= (int)ADC_MAX_VALUE) {
    return NAN; // open circuit / short - sensor fault
  }

  float resistance = SERIES_RESISTOR_OHMS * (ADC_MAX_VALUE / (float)raw - 1.0);

  float steinhart = resistance / THERMISTOR_NOMINAL_OHMS;
  steinhart = log(steinhart);
  steinhart /= THERMISTOR_B_COEFFICIENT;
  steinhart += 1.0 / (THERMISTOR_NOMINAL_TEMP + 273.15);
  steinhart = 1.0 / steinhart;
  steinhart -= 273.15;

  return steinhart;
}

// The MAX30100 outputs physically implausible spikes (e.g. HR > 250) when
// contact is poor rather than cleanly reporting "no signal" - treat those as
// no contact instead of real vitals, or a flaky sensor will trigger false
// alarms constantly.
bool isPlausibleHr(int hr) {
  return hr >= 25 && hr <= 240;
}

bool isPlausibleSpo2(float spo2) {
  return spo2 >= 50 && spo2 <= 100;
}

// A short/open thermistor divider (bad wiring, not a real patient reading)
// produces numbers like -60C that aren't NaN but are physically nonsense -
// exclude those from the alarm the same way isPlausibleHr/Spo2 do, or a
// wiring fault makes the buzzer sound forever.
bool isPlausibleTemp(float tempC) {
  return !isnan(tempC) && tempC >= 10.0 && tempC <= 45.0;
}

bool isOutOfRangeNow(int hr, float spo2, float tempC, bool hasContact) {
  if (!hasContact) return false;
  if (hr > 0 && (hr < HR_MIN || hr > HR_MAX)) return true;
  if (spo2 > 0 && spo2 < SPO2_MIN) return true;
  if (isPlausibleTemp(tempC) && (tempC < TEMP_MIN_C || tempC > TEMP_MAX_C)) return true;
  return false;
}

// Debounced across ALARM_CONFIRM_CYCLES so one noisy reading from a flaky
// I2C bus doesn't latch the buzzer into sounding continuously.
bool isOutOfRange(int hr, float spo2, float tempC, bool hasContact) {
  if (isOutOfRangeNow(hr, spo2, tempC, hasContact)) {
    consecutiveOutOfRange++;
  } else {
    consecutiveOutOfRange = 0;
  }
  return consecutiveOutOfRange >= ALARM_CONFIRM_CYCLES;
}

void updateIndicators(bool alarm) {
  digitalWrite(PIN_LED_GREEN, alarm ? LOW : HIGH);
  digitalWrite(PIN_LED_RED, alarm ? HIGH : LOW);

  if (!alarm) {
    digitalWrite(PIN_BUZZER, LOW);
    buzzerOn = false;
    return;
  }

  // Pulse the buzzer instead of a continuous tone.
  if (millis() - lastBeepToggleAt > 400) {
    buzzerOn = !buzzerOn;
    digitalWrite(PIN_BUZZER, buzzerOn ? HIGH : LOW);
    lastBeepToggleAt = millis();
    if (buzzerOn) scanI2CBus("right after buzzer ON");
  }
}

void updateLcd(int hr, float spo2, float tempC, bool hasContact, bool alarm) {
  lcd.setCursor(0, 0);
  if (!sensorReady) {
    lcd.print("HR:--  SpO2:--%  ");
  } else if (!hasContact) {
    lcd.print("No finger/contact ");
  } else {
    char line[17];
    snprintf(line, sizeof(line), "HR:%-3d SpO2:%-3d%%", hr, (int)round(spo2));
    lcd.print(line);
  }

  lcd.setCursor(0, 1);
  char line2[17];
  if (isnan(tempC)) {
    snprintf(line2, sizeof(line2), "T:--.-C %s", alarm ? "ALARM!" : "        ");
  } else {
    snprintf(line2, sizeof(line2), "T:%4.1fC %s", tempC, alarm ? "ALARM!" : "        ");
  }
  lcd.print(line2);
}

void postReading(int hr, float spo2, float tempC, const char *signalQuality) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/vitals_readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["device_key"] = DEVICE_KEY;
  if (hr > 0) doc["heart_rate"] = hr;
  if (spo2 > 0) doc["spo2"] = spo2;
  if (!isnan(tempC)) doc["temperature"] = round(tempC * 10) / 10.0;
  doc["signal_quality"] = signalQuality;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code < 200 || code >= 300) {
    Serial.printf("Supabase insert failed, HTTP %d: %s\n", code, http.getString().c_str());
  }
  http.end();
}

void setup() {
  // Disable the brownout detector: a dip from the buzzer/LED/sensor load on
  // a marginal USB/5V supply can otherwise trip a false brownout reset.
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(200);

  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  analogReadResolution(12);

  connectWiFi();

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(I2C_CLOCK_HZ);
  scanI2CBus("boot");

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Patient Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  if (pox.begin()) {
    pox.setIRLedCurrent(MAX30100_LED_CURR_24MA);
    pox.setOnBeatDetectedCallback(onBeatDetected);
    sensorReady = true;
    Serial.println("MAX30100 ready");
  } else {
    Serial.println("MAX30100 init failed, check wiring");
  }
}

#if SIMULATE_SENSORS
// Slowly-varying, always-plausible vitals so the LCD/alert/Supabase pipeline
// can be exercised without the MAX30100/thermistor wired up or working.
void simulateVitals(int &hr, float &spo2, float &tempC) {
  float t = millis() / 1000.0f;
  hr = 72 + (int)round(6.0 * sin(t / 6.0));
  spo2 = 97.0 + 1.5 * sin(t / 9.0);
  tempC = 36.8 + 0.3 * sin(t / 13.0);
}
#endif

void loop() {
  connectWiFi();
  ensureSensorReady();
  if (sensorReady) pox.update();

  if (millis() - lastI2cScanAt > 10000) {
    lastI2cScanAt = millis();
    scanI2CBus("periodic");
  }

  if (millis() - lastReportAt < REPORT_INTERVAL_MS) {
    // Still keep indicators live between reports using latest cached values.
    return;
  }
  lastReportAt = millis();

  int hr;
  float spo2;
  float tempC;
  bool hasContact;
  const char *signalQuality;

#if SIMULATE_SENSORS
  simulateVitals(hr, spo2, tempC);
  hasContact = true;
  signalQuality = "ok";
#else
  int rawHr = sensorReady ? (int)round(pox.getHeartRate()) : 0;
  float rawSpo2 = sensorReady ? pox.getSpO2() : 0;
  tempC = readTemperatureC();

  // Fold implausible spikes (poor contact, not a real vital) back to "no
  // contact" instead of letting them through as data or alarm triggers.
  hr = isPlausibleHr(rawHr) ? rawHr : 0;
  spo2 = isPlausibleSpo2(rawSpo2) ? rawSpo2 : 0;

  hasContact = hr > 0 && spo2 > 0;
  signalQuality = !sensorReady ? "no_contact" : hasContact ? "ok" : "no_contact";
#endif

  bool alarm = isOutOfRange(hr, spo2, tempC, hasContact);
  updateIndicators(alarm);
  updateLcd(hr, spo2, tempC, hasContact, alarm);

  Serial.printf("HR=%d SpO2=%.1f Temp=%.1fC quality=%s alarm=%d sensorReady=%d\n",
                hr, spo2, tempC, signalQuality, alarm, sensorReady);

  postReading(hr, spo2, tempC, signalQuality);
}
