#ifndef UPLOAD_FIREBASE_H
#define UPLOAD_FIREBASE_H

#include "firebase_setup.h"

void uploadToFirebase(float temp, float hum, float pressure, float co2, const String& timestamp) {
  String path = "/sensor_data/latest";
  Serial.println("Uploading to: " + path);

  bool success = true;
  success &= Firebase.RTDB.setFloat(&fbdo, path + "/temperature", temp);
  success &= Firebase.RTDB.setFloat(&fbdo, path + "/humidity", hum);
  success &= Firebase.RTDB.setFloat(&fbdo, path + "/pressure", pressure);
  success &= Firebase.RTDB.setFloat(&fbdo, path + "/co2", co2);
  success &= Firebase.RTDB.setString(&fbdo, path + "/datetime", timestamp);

  if (success) {
    Serial.println("Uploaded:");
    Serial.printf("  Temp: %.1f °C\n", temp);
    Serial.printf("  Humidity: %.1f %%\n", hum);
    Serial.printf("  Pressure: %.1f hPa\n", pressure);
    Serial.printf("  CO₂: %.0f ppm\n", co2);
    Serial.println("  Datetime: " + timestamp);
  } else {
    Serial.println("Upload failed: " + fbdo.errorReason());
  }
}

#endif
