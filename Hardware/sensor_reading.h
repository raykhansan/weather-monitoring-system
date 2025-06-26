#ifndef SENSOR_READING_H
#define SENSOR_READING_H

#include "sensor_setup.h"

bool readSensors(float& temp, float& hum, float& pressure, float& co2_ppm) {
  temp = dht.readTemperature();
  hum = dht.readHumidity();

  sensors_event_t event;
  bmp.getEvent(&event);
  pressure = event.pressure;

  int analogValue = analogRead(MQ135_PIN);
  float voltage = analogValue * (3.3 / 4095.0);
  co2_ppm = pow(10.0, ((voltage * -1.179) + 4.385));

  return !(isnan(temp) || isnan(hum) || pressure == 0.0);
}

#endif
