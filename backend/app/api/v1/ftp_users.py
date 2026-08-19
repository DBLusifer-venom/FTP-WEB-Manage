from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models import FTPUser, User, UserRole
from app.schemas import FTPUserCreate, FTPUserUpdate, FTPUser
from app.api.deps import get_current_active_user, get_current_admin_user, get_current_rw_user
from app.services.ftp_service import ftp_service


router = APIRouter()


@router.post("/", response_model=FTPUser, status_code=status.HTTP_201_CREATED)
async def create_ftp_user(
    ftp_user_in: FTPUserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(FTPUser).where(FTPUser.username == ftp_user_in.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    ftp_user = FTPUser(
        username=ftp_user_in.username,
        password_hash=get_password_hash(ftp_user_in.password),
        home_directory=ftp_user_in.home_directory,
        permission=ftp_user_in.permission,
        uid=ftp_user_in.uid,
        gid=ftp_user_in.gid,
        max_files=ftp_user_in.max_files,
        max_size=ftp_user_in.max_size,
        ratio_upload=ftp_user_in.ratio_upload,
        ratio_download=ftp_user_in.ratio_download,
        bandwidth_up=ftp_user_in.bandwidth_up,
        bandwidth_down=ftp_user_in.bandwidth_down,
        owner_id=current_user.id if current_user.role != UserRole.ADMIN else None
    )
    db.add(ftp_user)
    await db.commit()
    await db.refresh(ftp_user)
    
    await ftp_service.create_ftp_user(ftp_user)
    
    return ftp_user


@router.get("/", response_model=List[FTPUser])
async def list_ftp_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(FTPUser)
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        query = query.where(FTPUser.owner_id == current_user.id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{ftp_user_id}", response_model=FTPUser)
async def get_ftp_user(
    ftp_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(FTPUser).where(FTPUser.id == ftp_user_id))
    ftp_user = result.scalar_one_or_none()
    if not ftp_user:
        raise HTTPException(status_code=404, detail="FTP user not found")
    
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        if ftp_user.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return ftp_user


@router.put("/{ftp_user_id}", response_model=FTPUser)
async def update_ftp_user(
    ftp_user_id: int,
    ftp_user_in: FTPUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(FTPUser).where(FTPUser.id == ftp_user_id))
    ftp_user = result.scalar_one_or_none()
    if not ftp_user:
        raise HTTPException(status_code=404, detail="FTP user not found")
    
    if ftp_user_in.password is not None:
        ftp_user.password_hash = get_password_hash(ftp_user_in.password)
    
    if ftp_user_in.home_directory is not None:
        ftp_user.home_directory = ftp_user_in.home_directory
    
    if ftp_user_in.permission is not None:
        ftp_user.permission = ftp_user_in.permission
    
    if ftp_user_in.uid is not None:
        ftp_user.uid = ftp_user_in.uid
    
    if ftp_user_in.gid is not None:
        ftp_user.gid = ftp_user_in.gid
    
    if ftp_user_in.max_files is not None:
        ftp_user.max_files = ftp_user_in.max_files
    
    if ftp_user_in.max_size is not None:
        ftp_user.max_size = ftp_user_in.max_size
    
    if ftp_user_in.ratio_upload is not None:
        ftp_user.ratio_upload = ftp_user_in.ratio_upload
    
    if ftp_user_in.ratio_download is not None:
        ftp_user.ratio_download = ftp_user_in.ratio_download
    
    if ftp_user_in.bandwidth_up is not None:
        ftp_user.bandwidth_up = ftp_user_in.bandwidth_up
    
    if ftp_user_in.bandwidth_down is not None:
        ftp_user.bandwidth_down = ftp_user_in.bandwidth_down
    
    if ftp_user_in.is_active is not None:
        ftp_user.is_active = ftp_user_in.is_active
    
    await db.commit()
    await db.refresh(ftp_user)
    
    await ftp_service.update_ftp_user(ftp_user)
    
    return ftp_user


@router.delete("/{ftp_user_id}")
async def delete_ftp_user(
    ftp_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(FTPUser).where(FTPUser.id == ftp_user_id))
    ftp_user = result.scalar_one_or_none()
    if not ftp_user:
        raise HTTPException(status_code=404, detail="FTP user not found")
    
    await ftp_service.delete_ftp_user(ftp_user.username)
    
    await db.delete(ftp_user)
    await db.commit()
    return {"message": "FTP user deleted successfully"}


@router.post("/{ftp_user_id}/toggle-status", response_model=FTPUser)
async def toggle_ftp_user_status(
    ftp_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(FTPUser).where(FTPUser.id == ftp_user_id))
    ftp_user = result.scalar_one_or_none()
    if not ftp_user:
        raise HTTPException(status_code=404, detail="FTP user not found")
    
    ftp_user.is_active = not ftp_user.is_active
    await db.commit()
    await db.refresh(ftp_user)
    
    if ftp_user.is_active:
        await ftp_service.create_ftp_user(ftp_user)
    else:
        await ftp_service.delete_ftp_user(ftp_user.username)
    
    return ftp_user