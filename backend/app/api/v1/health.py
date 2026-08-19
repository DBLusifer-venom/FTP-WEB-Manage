from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db, engine
from app.services.ftp_service import ftp_service
from app.services.vsftpd_service import vsftpd_config_service
import redis.asyncio as redis
from app.core.config import settings


router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    health = {
        "status": "healthy",
        "database": "unknown",
        "ftp_server": "unknown",
        "redis": "unknown"
    }
    
    try:
        await db.execute(text("SELECT 1"))
        health["database"] = "healthy"
    except Exception:
        health["database"] = "unhealthy"
        health["status"] = "degraded"
    
    try:
        status = await ftp_service.get_server_status()
        health["ftp_server"] = "healthy" if status.get("status") == "active" else "unhealthy"
        if health["ftp_server"] == "unhealthy":
            health["status"] = "degraded"
    except Exception:
        health["ftp_server"] = "unhealthy"
        health["status"] = "degraded"
    
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.close()
        health["redis"] = "healthy"
    except Exception:
        health["redis"] = "unhealthy"
    
    return health