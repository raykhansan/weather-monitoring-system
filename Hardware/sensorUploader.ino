#include "wifi_setup.h"
#include "firebase_setup.h"
#include "time_sync.h"
#include "sensor_setup.h"
#include "sensor_reading.h"
#include "upload_firebase.h"

void setup() {
  Serial.begin(115200);
  delay(1000);

  setupWiFi();
  syncTime();
  initSensors();
  setupFirebase();
}

void loop() {
  float temp, hum, pressure, co2;
  if (readSensors(temp, hum, pressure, co2)) {
    String timestamp = getTimestamp();
    if (Firebase.ready() && firebaseReady) {
      uploadToFirebase(temp, hum, pressure, co2, timestamp);
    }
  } else {
    Serial.println("Sensor read failed.");
  }
  delay(5000);
}
