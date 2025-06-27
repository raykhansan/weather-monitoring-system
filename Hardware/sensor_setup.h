#ifndef SENSOR_SETUP_H
#define SENSOR_SETUP_H

#include "DHT.h"
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP085_U.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 5
#define I2C_SDA 8
#define I2C_SCL 9

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP085_Unified bmp = Adafruit_BMP085_Unified(10085);

void initSensors() {
  Wire.begin(I2C_SDA, I2C_SCL);
  dht.begin();
  if (!bmp.begin()) {
    Serial.println("BMP180 not detected!");
    while (1);
  }
}

#endif
