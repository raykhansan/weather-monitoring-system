import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
from pydantic import BaseModel
from typing import List

import config

# Load model and scalers once
model = load_model(config.MODEL_PATH, compile=False)
model.compile(optimizer='adam', loss='mse')

scalers = joblib.load(config.SCALERS_PATH)
scaler = scalers["feature_scaler"]
target_scaler = scalers["target_scaler"]


class SensorData(BaseModel):
    datetime: str
    temperature: float
    humidity: float
    pressure: float
    co2: float

class WeatherInput(BaseModel):
    tmax: List[float]
    tmin: List[float]
    humidity: List[float]
    pressure: List[float]
    co2: List[float]

def train_and_predict():
    df = pd.read_csv(config.CSV_FILE)
    df.columns = ['No', 'Date', 'tmax', 'tmin', 'humidity', 'pressure', 'co2']
    df.drop('No', axis=1, inplace=True)

    features = ['tmax', 'tmin', 'humidity', 'pressure', 'co2']
    last_5_days = df[features].iloc[-5:].values

    scaled_input = scaler.transform(last_5_days)
    input_sequence = scaled_input.reshape(1, 5, 5)

    scaled_prediction = model.predict(input_sequence)
    predicted_temp = target_scaler.inverse_transform(scaled_prediction)

    return predicted_temp[0][0]

def predict_with_input(data: WeatherInput):
    if not all(len(lst) == 5 for lst in [data.tmax, data.tmin, data.humidity, data.pressure, data.co2]):
        raise ValueError("Each input list must contain exactly 5 values.")

    input_array = np.array([data.tmax, data.tmin, data.humidity, data.pressure, data.co2]).T
    scaled_input = scaler.transform(input_array)
    input_sequence = scaled_input.reshape(1, 5, 5)

    scaled_prediction = model.predict(input_sequence)
    predicted_temp = target_scaler.inverse_transform(scaled_prediction)

    return predicted_temp[0][0]
