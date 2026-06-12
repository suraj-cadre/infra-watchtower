from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from app.database import Base

class HealthCheckLog(Base):
    __tablename__ = "health_check_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service_name = Column(String(50), nullable=False)
    service_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # "healthy" | "unhealthy"
    latency_ms = Column(Float, nullable=True)
    message = Column(Text, nullable=True)
