from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List
from app.core.database import get_db
from app.models import ServerConfig, User, UserRole
from app.schemas import ServerConfigCreate, ServerConfigUpdate, ServerConfig
from app.api.deps import get_current_admin_user
from app.services.vsftpd_service import vsftpd_config_service
from app.services.ftp_service import ftp_service


router = APIRouter()


@router.get("/status")
async def get_server_status(
    current_user: User = Depends(get_current_admin_user)
):
    status = await ftp_service.get_server_status()
    return status


@router.get("/config", response_model=Dict[str, str])
async def get_server_config(
    current_user: User = Depends(get_current_admin_user)
):
    return vsftpd_config_service.read_config()


@router.put("/config")
async def update_server_config(
    config: Dict[str, str],
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.write_config(config)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update configuration")
    return {"message": "Configuration updated successfully"}


@router.get("/config/validate")
async def validate_config(
    current_user: User = Depends(get_current_admin_user)
):
    valid, message = vsftpd_config_service.validate_config()
    return {"valid": valid, "message": message}


@router.get("/config/ssl", response_model=Dict[str, str])
async def get_ssl_config(
    current_user: User = Depends(get_current_admin_user)
):
    return vsftpd_config_service.get_ssl_config()


@router.put("/config/ssl")
async def update_ssl_config(
    config: Dict[str, str],
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.update_ssl_config(config)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update SSL configuration")
    return {"message": "SSL configuration updated successfully"}


@router.post("/ssl/enable")
async def enable_ssl(
    cert_path: str,
    key_path: str,
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.enable_ssl(cert_path, key_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to enable SSL")
    vsftpd_config_service.reload()
    return {"message": "SSL enabled successfully"}


@router.post("/ssl/disable")
async def disable_ssl(
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.disable_ssl()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to disable SSL")
    vsftpd_config_service.reload()
    return {"message": "SSL disabled successfully"}


@router.post("/passive-ports")
async def set_passive_ports(
    min_port: int,
    max_port: int,
    address: str = "",
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.set_passive_ports(min_port, max_port, address)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to set passive ports")
    vsftpd_config_service.reload()
    return {"message": "Passive ports updated successfully"}


@router.post("/limits")
async def set_limits(
    max_clients: int = 100,
    max_per_ip: int = 10,
    local_max_rate: int = 0,
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.set_limits(max_clients, max_per_ip, local_max_rate)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to set limits")
    vsftpd_config_service.reload()
    return {"message": "Limits updated successfully"}


@router.post("/reload")
async def reload_server(
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.reload()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reload server")
    return {"message": "Server reloaded successfully"}


@router.post("/restart")
async def restart_server(
    current_user: User = Depends(get_current_admin_user)
):
    success = vsftpd_config_service.restart()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restart server")
    return {"message": "Server restarted successfully"}