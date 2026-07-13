# Hardware notes

Based on the provided schematic (ESP32-DevKitC32D + MAX30100 pulse
oximeter + NTC thermistor + buzzer/LED alert indicators):

| Function | Schematic ref | ESP32 pin | Notes |
|---|---|---|---|
| MAX30100 SDA | J4 | GPIO21 | I2C data |
| MAX30100 SCL | J4 | GPIO22 | I2C clock |
| MAX30100 INT | J4 | not connected | polling mode is used instead |
| Thermistor divider | J3 / R7 (4.7k) | GPIO34 (ADC1) | NTC to GND, R7 to +5V/+3V3 |
| Buzzer transistor | Q3 / R9 | GPIO19 | active-high through NPN driver |
| Red alert LED | Q1 / R4 / D4 | GPIO18 | active-high through NPN driver |
| Green status LED | Q2 / R5 / D3 | GPIO5 | active-high through NPN driver |
| Power-on LED (D1, yellow) | R2 | n/a | wired straight to +5V rail, not GPIO controlled |
| AC-in / bridge / 7805 regulators (U1, U2, BR2) | - | n/a | power supply only |

These pin numbers are the firmware's `include/config.h` defaults - the
schematic's hand-labelled GPIOs were ambiguous in a couple of spots, so
double check continuity from each ESP32 pin to its transistor/sensor header
before powering up, and adjust `config.h` if your board differs.

The NTC's beta coefficient and nominal resistance in `config.h`
(`THERMISTOR_B_COEFFICIENT`, `THERMISTOR_NOMINAL_OHMS`) are typical values
for a 10k NTC - replace them with your thermistor's datasheet values for
accurate readings, or calibrate against a known-good thermometer.
