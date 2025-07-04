import React, { useState, useEffect } from "react";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import ErrorBoundary from './ErrorBoundary.jsx';

import "./App.css";

// Firebase config - with fallback values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key-here",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL || "https://your-project-default-rtdb.firebaseio.com/",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123def456"
};

// Initialize Firebase only if config is properly set
let app = null;
let db = null;

try {
  if (firebaseConfig.apiKey !== "your-api-key-here") {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// API configurations
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY ;
const BASE_URL = import.meta.env.VITE_BASE_URL ;
const FORECAST_URL = import.meta.env.VITE_FORECAST_URL ;
const PREDICTION_API_URL = import.meta.env.VITE_PREDICTION_API_URL; // Added missing prediction API URL

export default function App() {
  // States for your original app
  const [city, setCity] = useState("Yangon");
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  const [tomorrow, setTomorrow] = useState(null);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);
  const [tomorrowError, setTomorrowError] = useState("");

  // --- States for new 5-day/3-hour forecast section ---
  const [inputCityForecast, setInputCityForecast] = useState("Yangon");
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  // --- Firebase sensor data listener ---
  useEffect(() => {
    if (!db) {
      console.log("Firebase not initialized - skipping sensor data");
      setLoading(false);
      return;
    }

    setLoading(true);
    const dbRef = ref(db, "sensor_data");

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const records = snapshot.val();
          const entries = Object.entries(records);
          let latestKey = "";
          let latestRecord = null;

          entries.forEach(([key, value]) => {
            if (!latestKey || key > latestKey) {
              latestKey = key;
              latestRecord = value;
            }
          });

          if (latestRecord) {
            setStats({
              latestDatetime: latestRecord.datetime,
              temperature: latestRecord.temperature,
              humidity: latestRecord.humidity,
              pressure: latestRecord.pressure,
              co2: latestRecord.co2,
            });
          }
        } else {
          setStats(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firebase error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Temperature prediction fetch
  useEffect(() => {
    if (!stats) return;

    const fetchPrediction = async () => {
      try {
        const res = await axios.get(`${PREDICTION_API_URL}/predict_temperature`);

        console.log("📦 Prediction response:", res.data, "at", new Date().toLocaleTimeString());

        const raw = res.data.predicted_temperature_tomorrow;
        const numeric = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
        setPrediction(numeric);
      } catch (err) {
        console.error("Prediction fetch failed:", err);
        setPrediction(null);
      }
    };

    fetchPrediction();
    const intervalId = setInterval(fetchPrediction, 185000);
    return () => clearInterval(intervalId);
  }, [stats]);

  // Fetch current weather (uses API_KEY env var)
  const fetchWeather = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (API_KEY === "your-openweather-api-key") {
      setError("Please set your OpenWeatherMap API key in the environment variables.");
      return;
    }

    setError("");
    setCurrent(null);
    setTomorrow(null);
    setTomorrowError("");
    setTomorrowLoading(false);

    try {
      const res = await axios.get(BASE_URL, {
        params: { q: city, appid: API_KEY, units: "metric" },
      });

      const data = res.data;
      setCurrent({
        name: data.name,
        country: data.sys.country,
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        desc: data.weather[0].description,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind: data.wind.speed,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
        lat: data.coord.lat,
        lon: data.coord.lon,
        icon: data.weather[0].icon,
      });
    } catch (err) {
      console.error("Weather fetch error:", err);
      if (err.response && err.response.status === 401) {
        setError("Invalid API key. Please check your OpenWeatherMap API key.");
      } else {
        setError("Could not fetch weather data. Please check the city name and try again.");
      }
      setCurrent(null);
    }
  };

  // --- Fetch tomorrow forecast (onecall) based on current weather lat/lon ---
  useEffect(() => {
    if (!current || !current.lat || !current.lon) {
      setTomorrow(null);
      return;
    }

    const fetchTomorrowForecast = async () => {
      setTomorrowLoading(true);
      setTomorrowError("");
      setTomorrow(null);

      try {
        const res = await axios.get(FORECAST_URL, {
          params: {
            lat: current.lat,
            lon: current.lon,
            exclude: "current,minutely,hourly,alerts",
            units: "metric",
            appid: API_KEY,
          },
        });

        const daily = res.data.daily;

        if (daily && daily.length > 1) {
          const tom = daily[1];
          setTomorrow({
            date: new Date(tom.dt * 1000).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            }),
            temp_min: tom.temp.min,
            temp_max: tom.temp.max,
            description: tom.weather[0].description,
            icon: tom.weather[0].icon,
            humidity: tom.humidity,
            wind_speed: tom.wind_speed,
            pressure: tom.pressure,
          });
        } else {
          setTomorrowError("No forecast data found.");
        }
      } catch (e) {
        console.error("Failed to fetch tomorrow forecast:", e);
        setTomorrowError("Failed to fetch tomorrow's forecast.");
      } finally {
        setTomorrowLoading(false);
      }
    };

    fetchTomorrowForecast();
  }, [current]);

  const formatLatestDatetime = (datetime) => {
    if (!datetime) return "N/A";
    const today = new Date().toISOString().split("T")[0];
    const [date] = datetime.split(" ");
    return date === today ? (
      <>
        Today
        <br />
        {date}
      </>
    ) : (
      date
    );
  };

  // Fetch current weather on first load
  useEffect(() => {
    fetchWeather();
  }, []);

  // --- New: Fetch 5-day/3-hour forecast for tomorrow at 12:00 PM ---
  const fetchForecast = async (cityName) => {
    if (API_KEY === "your-openweather-api-key") {
      setForecastError("Please set your OpenWeatherMap API key in the environment variables.");
      return;
    }

    setForecastLoading(true);
    setForecastError("");
    setForecast(null);

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        cityName
      )}&appid=${API_KEY}&units=metric&lang=en`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.status !== 200) {
        setForecastError(data.message || "Failed to fetch forecast.");
        setForecastLoading(false);
        return;
      }

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowDateStr = tomorrowDate.toISOString().split("T")[0];

      const noonForecast = data.list.find(
        (entry) =>
          entry.dt_txt.startsWith(tomorrowDateStr) &&
          entry.dt_txt.includes("12:00:00")
      );

      if (noonForecast) {
        setForecast({
          time: noonForecast.dt_txt,
          condition: noonForecast.weather[0].description,
          temp: noonForecast.main.temp,
          humidity: noonForecast.main.humidity,
          wind: noonForecast.wind.speed,
          icon: noonForecast.weather[0].icon,
        });
      } else {
        setForecastError("No forecast found for tomorrow at 12:00 PM.");
      }
    } catch (err) {
      console.error("Forecast fetch error:", err);
      setForecastError("Error fetching forecast.");
    } finally {
      setForecastLoading(false);
    }
  };

  // Fetch 5-day forecast on initial load and whenever inputCityForecast changes
  useEffect(() => {
    fetchForecast(inputCityForecast);
  }, [inputCityForecast]);

  // Form submit handler for forecast city input
  const handleForecastSubmit = (e) => {
    e.preventDefault();
    if (inputCityForecast.trim() === "") {
      setForecastError("Please enter a city name.");
      return;
    }
    setInputCityForecast(inputCityForecast.trim());
  };

  return (
    <ErrorBoundary>
      <div className="App">
        <h1 className="app-title">🌍 Weather Dashboard</h1>

        {/* Environment Variables Status */}
        <div className="env-status">
          <p>
            <strong>Environment Status:</strong>{" "}
            {API_KEY === "your-openweather-api-key" ? (
              <span style={{ color: "red" }}>❌ Missing API Key</span>
            ) : (
              <span style={{ color: "green" }}>✅ API Key Loaded</span>
            )}
            {" | "}
            {!db ? (
              <span style={{ color: "orange" }}>⚠️ Firebase Not Connected</span>
            ) : (
              <span style={{ color: "green" }}>✅ Firebase Connected</span>
            )}
          </p>
        </div>

        <div className="dashboard-grid">
          {/* Sensor Data */}
          <section className="glass-card sensor-stats">
            <h2>📡 Sensor Readings</h2><br />
            {loading ? (
              <p className="loading">⏳ Loading sensor data...</p>
            ) : stats ? (
              <>
                <div className="datetime-container">
                  <time className="datetime">{formatLatestDatetime(stats.latestDatetime)}</time>
                </div>

                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="icon">🌡️</span>
                    <span className="label">Temperature</span>
                    <span className="value">{Number(stats.temperature).toFixed(1)} °C</span>
                  </div>

                  <div className="stat-item">
                    <span className="icon">💧</span>
                    <span className="label">Humidity</span>
                    <span className="value">{Number(stats.humidity).toFixed(1)} %</span>
                  </div>

                  <div className="stat-item">
                    <span className="icon">💨</span>
                    <span className="label">Pressure</span>
                    <span className="value">{Number(stats.pressure).toFixed(2)} hPa</span>
                  </div>

                  <div className="stat-item">
                    <span className="icon">🟢</span>
                    <span className="label">CO₂</span>
                    <span className="value">{Number(stats.co2).toFixed(1)} ppm</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="no-data">❌ No sensor data available</p>
            )}
          </section>

          <section className="glass-card current-weather">
            <h2>🌤️ Current Weather</h2>
            <form onSubmit={fetchWeather} className="weather-form">
              <input
                type="text"
                placeholder="Enter city name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-text"
                aria-label="City name"
              />
              <button type="submit" className="btn-primary">Get Weather</button>
            </form>

            {error && <p className="error-message">{error}</p>}

            {current && (
              <>
                <h3 className="weather-location">
                  Weather in {current.name}, {current.country}
                </h3>

                <div className="weather-cards">
                  <div className="weather-card">
                    <div className="weather-icon">
                      <img
                        src={`https://openweathermap.org/img/wn/${current.icon}@4x.png`}
                        alt={current.desc}
                        loading="lazy"
                      />
                    </div>
                    <div className="weather-info">
                      <div className="weather-label">Condition</div>
                      <div className="weather-value">{current.desc}</div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">🌡️</div>
                    <div className="weather-info">
                      <div className="weather-label">Temperature</div>
                      <div className="weather-value">
                        {current.temp} °C (feels like {current.feels_like}°)
                      </div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">💧</div>
                    <div className="weather-info">
                      <div className="weather-label">Humidity</div>
                      <div className="weather-value">{current.humidity}%</div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">💨</div>
                    <div className="weather-info">
                      <div className="weather-label">Wind</div>
                      <div className="weather-value">{current.wind} m/s</div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">🔼</div>
                    <div className="weather-info">
                      <div className="weather-label">Pressure</div>
                      <div className="weather-value">{current.pressure} hPa</div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">🌅</div>
                    <div className="weather-info">
                      <div className="weather-label">Sunrise</div>
                      <div className="weather-value">{current.sunrise}</div>
                    </div>
                  </div>

                  <div className="weather-card">
                    <div className="weather-icon">🌇</div>
                    <div className="weather-info">
                      <div className="weather-label">Sunset</div>
                      <div className="weather-value">{current.sunset}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Temperature Prediction */}
          <section className="glass-card">
            <h3>🤖 AI Temperature Prediction (Tomorrow)</h3>
            {prediction !== null ? (
              <div className="value">{prediction.toFixed(1)} °C</div>
            ) : (
              <div className="loading">Loading prediction...</div>
            )}
          </section>
        </div>

        {/* 5-day/3-hour Forecast */}
        <section className="glass-card forecast-noon">
          <h1>🕛 Tomorrow Forecast (5-day/3-hour API)</h1>
          <form onSubmit={handleForecastSubmit} className="weather-form">
            <input
              type="text"
              placeholder="Enter city for forecast"
              value={inputCityForecast}
              onChange={(e) => setInputCityForecast(e.target.value)}
              className="input-text"
              aria-label="City name for forecast"
            />
            <button type="submit" className="btn-primary">Get Forecast</button>
          </form>

          {forecastLoading ? (
            <p className="loading">Loading forecast...</p>
          ) : forecastError ? (
            <p className="error-message">{forecastError}</p>
          ) : forecast ? (
            <div className="forecast-details">
              <img
                src={`https://openweathermap.org/img/wn/${forecast.icon}@4x.png`}
                alt={forecast.condition}
                className="icon-large"
              />
              <p><strong>{new Date(forecast.time).toLocaleString()}</strong></p>
              <p>{forecast.condition}</p>
              <div className="weather-card">
                <div className="weather-icon">🌡️</div>
                <div className="weather-info">
                  <div className="weather-label">Temperature</div>
                  <div className="weather-value">{forecast.temp} °C</div>
                </div>
              </div>

              <div className="weather-card">
                <div className="weather-icon">💧</div>
                <div className="weather-info">
                  <div className="weather-label">Humidity</div>
                  <div className="weather-value">{forecast.humidity}%</div>
                </div>
              </div>

              <div className="weather-card">
                <div className="weather-icon">💨</div>
                <div className="weather-info">
                  <div className="weather-label">Wind Speed</div>
                  <div className="weather-value">{forecast.wind} m/s</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-data">Enter a city and submit to get forecast.</p>
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}