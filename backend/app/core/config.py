from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List, Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "FTP Manager"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://ftpuser:ftppass@localhost:5432/ftpmanager"
    )
    
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://localhost:3000",
    ]
    
    FTP_HOST: str = os.getenv("FTP_HOST", "localhost")
    FTP_PORT: int = int(os.getenv("FTP_PORT", "21"))
    FTP_TLS_PORT: int = int(os.getenv("FTP_TLS_PORT", "990"))
    FTP_PASSIVE_PORTS: str = os.getenv("FTP_PASSIVE_PORTS", "40000:50000")
    
    VSFTPD_CONFIG_PATH: str = os.getenv("VSFTPD_CONFIG_PATH", "/etc/vsftpd.conf")
    VSFTPD_USER_DB_PATH: str = os.getenv("VSFTPD_USER_DB_PATH", "/etc/vsftpd/virtual_users.db")
    VSFTPD_USER_CONFIG_DIR: str = os.getenv("VSFTPD_USER_CONFIG_DIR", "/etc/vsftpd/user_config")
    VSFTPD_SSL_CERT: str = os.getenv("VSFTPD_SSL_CERT", "/etc/ssl/certs/vsftpd.pem")
    VSFTPD_SSL_KEY: str = os.getenv("VSFTPD_SSL_KEY", "/etc/ssl/private/vsftpd.key")
    
    SSL_CERT_DIR: str = os.getenv("SSL_CERT_DIR", "/etc/ssl/ftpmanager")
    LETSENCRYPT_EMAIL: str = os.getenv("LETSENCRYPT_EMAIL", "admin@example.com")
    LETSENCRYPT_DOMAIN: str = os.getenv("LETSENCRYPT_DOMAIN", "ftp.example.com")
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()