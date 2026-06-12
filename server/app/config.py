import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

class Settings:
    # RDS MySQL configuration
    DB_HOST: str = os.getenv("DB_HOST")
    DB_USER: str = os.getenv("DB_USER")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD")
    DB_NAME: str = os.getenv("DB_NAME")
    DB_PORT: int = int(os.getenv("DB_PORT"))

    # Redis configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = int(os.getenv("REDIS_DB"))

    @property
    def HEALTH_CHECK_SERVICES(self) -> dict:
        return {
            "redis": {
                "name": "Redis Main Cache",
                "type": "redis",
                "credentials": {
                    "host": self.REDIS_HOST,
                    "port": self.REDIS_PORT,
                    "password": self.REDIS_PASSWORD,
                    "db": self.REDIS_DB
                }
            },
            "mysql": {
                "name": "AWS RDS MySQL",
                "type": "mysql",
                "credentials": {
                    "host": self.DB_HOST,
                    "port": self.DB_PORT,
                    "user": self.DB_USER,
                    "password": self.DB_PASSWORD,
                    "database": self.DB_NAME
                }
            }
        }

settings = Settings()
