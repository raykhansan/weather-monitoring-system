import os
from dotenv import load_dotenv

load_dotenv()

FIREBASE_CREDENTIALS = "firebase_key.json"
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")  # <-- use the ENV VAR name here

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "weather_db")
MONGO_COLLECTION_NAME = os.getenv("MONGO_COLLECTION_NAME", "three_min_averages")

CSV_FILE = os.getenv("CSV_FILE", "weather_historical_data.csv")

MODEL_PATH = os.getenv("MODEL_PATH", "model_weights.h5")
SCALERS_PATH = os.getenv("SCALERS_PATH", "scalers.joblib")
