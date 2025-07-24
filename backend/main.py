import json
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the routers
from api.video import router as video_router
from api.auth import router as auth_router 
from api.cameras import router as camera_router
from api.super_admin import router as super_admin_router
from api.admin import router as admin_router # <-- Import admin router

from core.tracker import FaceTrackingSystem
from dependencies import app_state

# Create the FastAPI app instance
app = FastAPI(
    title="Face Recognition API", 
    version="1.3.0",
    description="API for face recognition, attendance, and video streaming with role-based access control."
)

# Set up CORS (Cross-Origin Resource Sharing) middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """
    This function runs once when the FastAPI application starts.
    It loads the config, initializes the FaceTrackingSystem, and starts it.
    """
    print("--- Server is starting up ---")
    try:
        print("Loading API configuration from config.json...")
        with open("config.json", "r") as f:
            config = json.load(f)
        api_config = config.get("api", {})

        if not api_config:
            raise ValueError("API configuration not found in config.json")

        print("Initializing Face Tracking System...")
        tracker = FaceTrackingSystem(api_config=api_config)
        
        app_state["tracker"] = tracker
        
        print("Starting multi-camera tracking in a background thread...")
        tracker.start_multi_camera_tracking()
        print("--- Startup complete. Server is ready. ---")

    except FileNotFoundError:
        print("FATAL ERROR: config.json not found. The server cannot start.")
        sys.exit(1)
    except Exception as e:
        print(f"FATAL ERROR during startup: {e}")
        sys.exit(1)


@app.on_event("shutdown")
async def shutdown_event():
    """
    This function runs once when the FastAPI application shuts down.
    It gracefully stops the FaceTrackingSystem.
    """
    print("--- Server is shutting down ---")
    if "tracker" in app_state:
        app_state["tracker"].shutdown()
    print("--- Shutdown complete ---")

# Include all the application routers
app.include_router(auth_router)
app.include_router(camera_router)
app.include_router(video_router)
app.include_router(super_admin_router)
app.include_router(admin_router) # <-- Include the new router


@app.get("/", tags=["Root"])
async def read_root():
    """A simple root endpoint to confirm the server is running."""
    return {"message": "Welcome to the Face Recognition API. Please login at /auth/token."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
