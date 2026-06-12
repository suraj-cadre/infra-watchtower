import time
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.models import HealthCheckLog

def check_redis(name: str, credentials: dict) -> dict:
    start_time = time.perf_counter()
    try:
        # Initialize connection with credentials from configuration
        r = redis.Redis(
            host=credentials.get("host", "127.0.0.1"),
            port=credentials.get("port", 6379),
            password=credentials.get("password") or None,
            db=credentials.get("db", 0),
            socket_timeout=2
        )
        # Execute ping
        if r.ping():
            latency = (time.perf_counter() - start_time) * 1000
            return {
                "name": name,
                "type": "redis",
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "message": "Redis connection active and responding to ping."
            }
        else:
            raise Exception("Ping command did not return True response.")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "name": name,
            "type": "redis",
            "status": "unhealthy",
            "latency_ms": round(latency, 2),
            "message": f"Connection failed: {str(e)}"
        }

def check_mysql(name: str, credentials: dict, db: Session = None) -> dict:
    start_time = time.perf_counter()
    try:
        if db is not None:
            # Run a minimal select query to check db health using active session
            db.execute(text("SELECT 1"))
        else:
            import pymysql
            conn = pymysql.connect(
                host=credentials.get("host"),
                user=credentials.get("user"),
                password=credentials.get("password"),
                port=credentials.get("port", 3306),
                database=credentials.get("database"),
                connect_timeout=2
            )
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
            conn.close()
            
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "name": name,
            "type": "mysql",
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "message": "MySQL connection active. Query succeeded."
        }
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        return {
            "name": name,
            "type": "mysql",
            "status": "unhealthy",
            "latency_ms": round(latency, 2),
            "message": f"Database operation failed: {str(e)}"
        }

def run_all_checks(db: Session) -> list:
    results = []
    
    # Retrieve dynamic service health configuration from config settings
    services = settings.HEALTH_CHECK_SERVICES
    
    for service_key, service_config in services.items():
        name = service_config.get("name", service_key)
        service_type = service_config.get("type")
        credentials = service_config.get("credentials", {})
        
        if service_type == "redis":
            res = check_redis(name, credentials)
            results.append(res)
        elif service_type == "mysql":
            res = check_mysql(name, credentials, db=db)
            results.append(res)
        else:
            results.append({
                "name": name,
                "type": service_type,
                "status": "unhealthy",
                "latency_ms": 0.0,
                "message": f"Unsupported check type: {service_type}"
            })
    
    # Save logs to database
    for res in results:
        log_entry = HealthCheckLog(
            service_name=res["name"],
            service_type=res["type"],
            status=res["status"],
            latency_ms=res["latency_ms"],
            message=res["message"]
        )
        db.add(log_entry)
        
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Print warning but don't fail the API endpoint execution
        print(f"Warning: Could not commit health logs to database: {e}")
        
    return results
