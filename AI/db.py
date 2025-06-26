import firebase_admin
from firebase_admin import credentials, db
from pymongo import MongoClient
import pandas as pd
import random
from datetime import datetime, timedelta

import os
from apscheduler.schedulers.background import BackgroundScheduler

import config

# Initialize Firebase app
cred = credentials.Certificate(config.FIREBASE_CREDENTIALS)
firebase_admin.initialize_app(cred, {
    'databaseURL': config.FIREBASE_DB_URL
})

# Initialize MongoDB client
mongo_client = MongoClient(config.MONGO_URI)
mongo_db = mongo_client[config.MONGO_DB_NAME]
mongo_collection = mongo_db[config.MONGO_COLLECTION_NAME]

scheduler = BackgroundScheduler()

def fetch_firebase_data():
    ref = db.reference("sensor_data")
    return ref.get()

def simulate_high_low(avg_temp):
    tmax = avg_temp + random.uniform(0, 2)
    tmin = avg_temp - random.uniform(0, 2)
    return round(tmax, 2), round(tmin, 2)

def process_and_save():
    data = fetch_firebase_data()
    if not data:
        print("❌ No data found in Firebase")
        return

    records = []
    for key, entry in data.items():
        try:
            dt = datetime.strptime(entry['datetime'], "%Y-%m-%d %H:%M:%S")
            humidity = entry['humidity']
            avg_temp = entry['temperature']
            pressure = entry['pressure']
            co2 = entry['co2']
            tmax, tmin = simulate_high_low(avg_temp)

            records.append({
                "timestamp": dt,
                "tmax": tmax,
                "tmin": tmin,
                "humidity": humidity,
                "pressure": pressure,
                "co2": co2
            })
        except Exception as e:
            print(f"Skipping invalid record {key}: {e}")

    if not records:
        print("❌ No valid records to process.")
        return

    df = pd.DataFrame(records)
    df.set_index("timestamp", inplace=True)
    three_min_avg = df.resample('3min').mean().dropna()

    if three_min_avg.empty:
        print("⚠️ No 3-minute averages to save.")
        return

    # Save to MongoDB
    for time_index, row in three_min_avg.iterrows():
        doc = {
            "timestamp": time_index.strftime("%Y-%m-%d %H:%M:%S"),
            "tmax": float(row['tmax']),
            "tmin": float(row['tmin']),
            "humidity": float(row['humidity']),
            "pressure": float(row['pressure']),
            "co2": float(row['co2'])
        }
        mongo_collection.update_one({"timestamp": doc["timestamp"]}, {"$set": doc}, upsert=True)

    print(f"✅ Saved {len(three_min_avg)} averages to MongoDB")

    # Append to CSV
    try:
        existing_df = pd.read_csv(config.CSV_FILE)
        starting_index = len(existing_df)
    except FileNotFoundError:
        existing_df = pd.DataFrame()
        starting_index = 0

    new_df = three_min_avg.copy()
    new_df.reset_index(inplace=True)
    new_df['tmax'] = new_df['tmax'].fillna(25.0)
    new_df['tmin'] = new_df['tmin'].fillna(22.0)
    new_df['pressure'] = new_df['pressure'].fillna(1013.0)
    new_df['co2'] = new_df['co2'].fillna(400.0)
    new_df['humidity'] = new_df['humidity'].fillna(50.0)

    new_df = new_df[['tmax', 'tmin', 'humidity', 'pressure', 'co2']]
    max_new_entries = 500_000  # or len(new_df)
    new_df = new_df.head(max_new_entries)

    # Step 5: Generate synthetic 3-minute spaced timestamps after last date in existing
    start_date = datetime(2013, 2, 14, 0, 0, 0)

    new_entries_count = len(new_df)
    new_dates = [start_date + timedelta(days=i) for i in range(new_entries_count)]

    for i in range(len(new_dates)):
        random_minutes = random.randint(0, 1439)  # 0 to 23*60 + 59
        new_dates[i] = new_dates[i] + timedelta(minutes=random_minutes)

    new_df['Date'] = [d.strftime('%Y-%m-%d') for d in new_dates]

    # Step 6: Create final DataFrame
    final_df = pd.DataFrame({
        "No": range(starting_index + 1, starting_index + 1 + len(new_df)),
        "Date": new_df['Date'],
        "Highest Temp (°C)": new_df['tmax'].round(1),
        "Lowest Temp (°C)": new_df['tmin'].round(1),
        "Humidity (%)": new_df['humidity'].round(1),
        "Air Pressure (hPa)": new_df['pressure'].round(1),
        "CO2 (ppm)": new_df['co2'].round(1)
    })

    # Step 7: Append to original CSV
    final_df.to_csv(config.CSV_FILE, mode='a', header=False, index=False)
    print(f"✅ Appended {len(final_df)} rows to '{config.CSV_FILE}'")

def start_scheduler():
    scheduler.add_job(process_and_save, 'interval', minutes=3)
    scheduler.start()
