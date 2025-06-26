from fastapi import FastAPI
from router import router
from db import start_scheduler
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="🌤️ Weather LSTM Prediction API", version="1.0")
origins = [
    "http://localhost:5173",  # Your frontend URL (adjust port if needed)
    "http://192.168.110.63:5173",
    # You can add other allowed origins here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # or ["*"] to allow all for testing (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],  # allow all HTTP methods (GET, POST, etc)
    allow_headers=["*"],  # allow all headers
)
app.include_router(router)

@app.on_event("startup")
def startup_event():
    start_scheduler()
