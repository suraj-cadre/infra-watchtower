import time
from datetime import datetime
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Infra Watchtower API",
    description="Backend monitoring and utility service for Watchtower console",
    version="1.0.0"
)

# Enable CORS for the React client running on localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "service": "Infra Watchtower API",
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/ping")
def ping():
    # Return standard connection details plus simulated system stats
    # to feed a dynamic and premium frontend dashboard.
    simulated_cpu = round(random.uniform(12.5, 48.2), 1)
    simulated_ram = round(random.uniform(55.1, 58.9), 1)
    simulated_network_in = round(random.uniform(0.5, 4.8), 2)
    simulated_network_out = round(random.uniform(0.2, 2.1), 2)
    
    return {
        "status": "success",
        "message": "pong",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "server_epoch": time.time(),
        "environment": "development",
        "metrics": {
            "cpu_usage_pct": simulated_cpu,
            "memory_usage_pct": simulated_ram,
            "network_in_mbps": simulated_network_in,
            "network_out_mbps": simulated_network_out,
            "active_tasks": random.randint(3, 15)
        }
    }
