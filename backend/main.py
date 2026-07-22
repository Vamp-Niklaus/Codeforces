import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(
    title="Codeforces Study Archive API",
    description="Backend service for caching Codeforces API requests and tracking user problem progress.",
    version="1.0.0"
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with frontend host URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Codeforces Study Archive API",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    # Allow running directly via 'python3 main.py'
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
