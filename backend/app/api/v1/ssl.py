from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models import SSLCertificate, User, UserRole
from app.schemas import SSLCertificateCreate, SSLCertificateUpdate, SSLCertificate
from app.api.deps import get_current_admin_user
from app.services.ssl_service import ssl_service


router = APIRouter()


@router.get("/", response_model=List[SSLCertificate])
async def list_ssl_certificates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SSLCertificate).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{cert_id}", response_model=SSLCertificate)
async def get_ssl_certificate(
    cert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SSLCertificate).where(SSLCertificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@router.post("/", response_model=SSLCertificate, status_code=status.HTTP_201_CREATED)
async def create_ssl_certificate(
    cert_in: SSLCertificateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    cert = SSLCertificate(**cert_in.model_dump())
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return cert


@router.put("/{cert_id}", response_model=SSLCertificate)
async def update_ssl_certificate(
    cert_id: int,
    cert_in: SSLCertificateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SSLCertificate).where(SSLCertificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    update_data = cert_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cert, field, value)
    
    await db.commit()
    await db.refresh(cert)
    return cert


@router.delete("/{cert_id}")
async def delete_ssl_certificate(
    cert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(SSLCertificate).where(SSLCertificate.id == cert_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert.is_active:
        raise HTTPException(status_code=400, detail="Cannot delete active certificate")
    
    await db.delete(cert)
    await db.commit()
    return {"message": "Certificate deleted successfully"}


@router.post("/generate-self-signed")
async def generate_self_signed(
    domain: str,
    name: str,
    current_user: User = Depends(get_current_admin_user)
):
    cert_path, key_path = ssl_service.generate_self_signed(domain, name)
    return {"cert_path": cert_path, "key_path": key_path}


@router.post("/create-csr")
async def create_csr(
    domain: str,
    name: str,
    current_user: User = Depends(get_current_admin_user)
):
    csr_path, key_path = ssl_service.create_csr(domain, name)
    return {"csr_path": csr_path, "key_path": key_path}


@router.post("/install")
async def install_certificate(
    cert_path: str,
    key_path: str,
    chain_path: str = None,
    current_user: User = Depends(get_current_admin_user)
):
    success = ssl_service.install_certificate(cert_path, key_path, chain_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to install certificate")
    return {"message": "Certificate installed successfully"}


@router.post("/renew-letsencrypt")
async def renew_letsencrypt(
    domain: str,
    email: str,
    current_user: User = Depends(get_current_admin_user)
):
    success = ssl_service.renew_letsencrypt(domain, email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to renew Let's Encrypt certificate")
    return {"message": "Certificate renewed successfully"}


@router.post("/info")
async def get_certificate_info(
    cert_path: str,
    current_user: User = Depends(get_current_admin_user)
):
    info = ssl_service.get_certificate_info(cert_path)
    return info