#ifndef TIME_SYNC_H
#define TIME_SYNC_H

#include <time.h>

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 23400;  // Myanmar time (UTC+6:30)
const int daylightOffset_sec = 0;

void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.print("Syncing time");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nTime synced");
}

String getTimestamp() {
  time_t now = time(nullptr);
  char datetimeStr[30];
  strftime(datetimeStr, sizeof(datetimeStr), "%Y-%m-%d %H:%M:%S", localtime(&now));
  return String(datetimeStr);
}

#endif
