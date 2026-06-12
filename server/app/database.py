import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def create_database_if_not_exists():
    try:
        # Connect to MySQL server without specifying database to create it
        conn = pymysql.connect(
            host=settings.DB_HOST,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            port=settings.DB_PORT,
            connect_timeout=5
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME}")
        conn.commit()
        conn.close()
        print(f"Database '{settings.DB_NAME}' verified or created.")
    except Exception as e:
        print(f"Could not automatically create database '{settings.DB_NAME}': {e}")

# Run creation helper
create_database_if_not_exists()

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

# Setup engine with pool configurations
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Proactively test connection before usage
    pool_recycle=1800,       # Recycle connections every 30 minutes to prevent timeouts
    connect_args={"connect_timeout": 5}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
