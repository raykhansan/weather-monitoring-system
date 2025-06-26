from fastapi import APIRouter, HTTPException
from model import train_and_predict, predict_with_input, WeatherInput

router = APIRouter()


@router.get("/")
def home():
    return {"message": "📊 Firebase ➝ MongoDB + CSV scheduler is running every 3 minutes."}
@router.get("/predict_temperature")
def predict():
    try:
        temp = train_and_predict()
        return {"predicted_temperature_tomorrow": f"{temp:.2f}°C"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict_custom")
def predict_custom(data: WeatherInput):
    try:
        temp = predict_with_input(data)
        return {"predicted_temperature_tomorrow": f"{temp:.2f}°C"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
