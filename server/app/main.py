import time
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
import random
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db, SessionLocal
from app.models import HealthCheckLog
from app.health import run_all_checks
from app.config import settings

# Initialize the database tables on start
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {e}")

async def run_periodic_checks():
    print("Starting periodic health check background task...")
    while True:
        try:
            db = SessionLocal()
            run_all_checks(db)
            print(f"[{datetime.utcnow().isoformat()}] Periodic health checks executed successfully.")
        except Exception as e:
            print(f"Error executing periodic checks: {e}")
        finally:
            db.close()
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(run_periodic_checks())
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Infra Watchtower API",
    description="Backend monitoring and utility service for Watchtower console",
    version="1.0.0",
    lifespan=lifespan
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

@app.get("/health")
def health(db: Session = Depends(get_db)):
    """
    Get the latest status of each configured service from database logs.
    """
    results = []
    services = settings.HEALTH_CHECK_SERVICES
    for service_key, service_config in services.items():
        name = service_config.get("name", service_key)
        service_type = service_config.get("type")
        
        # Query latest log for this service name
        log = db.query(HealthCheckLog).filter(HealthCheckLog.service_name == name).order_by(HealthCheckLog.timestamp.desc()).first()
        if log:
            results.append({
                "name": log.service_name,
                "type": log.service_type,
                "status": log.status,
                "latency_ms": log.latency_ms,
                "message": log.message
            })
        else:
            results.append({
                "name": name,
                "type": service_type,
                "status": "unknown",
                "latency_ms": 0.0,
                "message": "No health check run yet."
            })
            
    overall_status = "healthy"
    if any(res["status"] != "healthy" for res in results):
        overall_status = "degraded"
        
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "results": results
    }

@app.get("/health/history")
def health_history(db: Session = Depends(get_db), service_name: str = None, limit: int = 30):
    """
    Query the last N health check records directly from the database log table,
    optionally filtered by service_name.
    """
    try:
        query = db.query(HealthCheckLog)
        if service_name:
            query = query.filter(HealthCheckLog.service_name == service_name)
        logs = query.order_by(HealthCheckLog.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": log.id,
                "timestamp": log.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if log.timestamp else None,
                "service_name": log.service_name,
                "service_type": log.service_type,
                "status": log.status,
                "latency_ms": log.latency_ms,
                "message": log.message
            }
            for log in logs
        ]
    except Exception as e:
        return {"status": "error", "message": f"Could not retrieve logs: {str(e)}"}
