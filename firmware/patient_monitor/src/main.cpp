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

#include "config.h"

PulseOximeter pox;

uint32_t lastReportAt = 0;
uint32_t lastBeepToggleAt = 0;
bool buzzerOn = false;

void onBeatDetected() {
  Serial.println("Beat detected");
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

bool isOutOfRange(int hr, float spo2, float tempC, bool hasContact) {
  if (!hasContact) return false;
  if (hr > 0 && (hr < HR_MIN || hr > HR_MAX)) return true;
  if (spo2 > 0 && spo2 < SPO2_MIN) return true;
  if (!isnan(tempC) && (tempC < TEMP_MIN_C || tempC > TEMP_MAX_C)) return true;
  return false;
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
  }
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
  if (!pox.begin()) {
    Serial.println("MAX30100 init failed, check wiring");
  } else {
    pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
    pox.setOnBeatDetectedCallback(onBeatDetected);
    Serial.println("MAX30100 ready");
  }
}

void loop() {
  connectWiFi();
  pox.update();

  if (millis() - lastReportAt < REPORT_INTERVAL_MS) {
    // Still keep indicators live between reports using latest cached values.
    return;
  }
  lastReportAt = millis();

  int hr = (int)round(pox.getHeartRate());
  float spo2 = pox.getSpO2();
  float tempC = readTemperatureC();

  bool hasContact = hr > 0 && spo2 > 0;
  const char *signalQuality = hasContact ? "ok" : "no_contact";

  bool alarm = isOutOfRange(hr, spo2, tempC, hasContact);
  updateIndicators(alarm);

  Serial.printf("HR=%d SpO2=%.1f Temp=%.1fC quality=%s alarm=%d\n",
                hr, spo2, tempC, signalQuality, alarm);

  postReading(hr, spo2, tempC, signalQuality);
}
