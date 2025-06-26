#ifndef WIFI_SETUP_H
#define WIFI_SETUP_H

#include <WiFi.h>

#define WIFI_SSID "NCC_InstituteOfScience"
#define WIFI_PASSWORD "CrazySci3ntist"

void setupWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWi-Fi connected. IP: " + WiFi.localIP().toString());
}

#endif
