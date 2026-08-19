from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import tempfile
import os
from pathlib import Path
from app.core.database import get_db
from app.models import FTPUser, User, UserRole
from app.schemas import FileItem, FileListResponse, FileOperation
from app.api.deps import get_current_active_user, get_current_rw_user
from app.services.ftp_service import ftp_service


router = APIRouter()


async def get_ftp_connection(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    ftp_user_id: Optional[int] = None
) -> FTPUser:
    if ftp_user_id:
        result = await db.execute(select(FTPUser).where(FTPUser.id == ftp_user_id))
        ftp_user = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(FTPUser).where(FTPUser.owner_id == current_user.id, FTPUser.is_active == True)
        )
        ftp_user = result.scalars().first()
    
    if not ftp_user:
        raise HTTPException(status_code=404, detail="No FTP user configured")
    
    if not ftp_user.is_active:
        raise HTTPException(status_code=400, detail="FTP user is inactive")
    
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        if ftp_user.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return ftp_user


@router.get("/list", response_model=FileListResponse)
async def list_files(
    path: str = "/",
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True)
):
    try:
        files = await ftp_service.list_files(
            host="localhost",
            username=ftp_user.username,
            password="",  # Will use the hash, need to handle auth differently
            path=path,
            use_tls=use_tls
        )
        
        parent = None
        if path != "/":
            parent = str(Path(path).parent)
            if parent == ".":
                parent = "/"
        
        return FileListResponse(
            current_path=path,
            parent_path=parent,
            items=[FileItem(**f) for f in files]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form("/"),
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True),
    current_user: User = Depends(get_current_rw_user)
):
    if ftp_user.permission == UserRole.READ_ONLY:
        raise HTTPException(status_code=403, detail="Read-only access")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        remote_path = f"{path}/{file.filename}".replace("//", "/")
        
        await ftp_service.upload_file(
            host="localhost",
            username=ftp_user.username,
            password="",
            local_path=tmp_path,
            remote_path=remote_path,
            use_tls=use_tls
        )
        
        os.unlink(tmp_path)
        return {"message": "File uploaded successfully", "path": remote_path}
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_file(
    path: str,
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True)
):
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_path = tmp.name
        
        await ftp_service.download_file(
            host="localhost",
            username=ftp_user.username,
            password="",
            remote_path=path,
            local_path=tmp_path,
            use_tls=use_tls
        )
        
        filename = Path(path).name
        return FileResponse(
            tmp_path,
            filename=filename,
            media_type='application/octet-stream'
        )
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_file(
    path: str,
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True),
    current_user: User = Depends(get_current_rw_user)
):
    if ftp_user.permission == UserRole.READ_ONLY:
        raise HTTPException(status_code=403, detail="Read-only access")
    
    try:
        await ftp_service.delete_file(
            host="localhost",
            username=ftp_user.username,
            password="",
            path=path,
            use_tls=use_tls
        )
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir")
async def create_directory(
    path: str,
    name: str,
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True),
    current_user: User = Depends(get_current_rw_user)
):
    if ftp_user.permission == UserRole.READ_ONLY:
        raise HTTPException(status_code=403, detail="Read-only access")
    
    try:
        new_path = f"{path}/{name}".replace("//", "/")
        await ftp_service.create_directory(
            host="localhost",
            username=ftp_user.username,
            password="",
            path=new_path,
            use_tls=use_tls
        )
        return {"message": "Directory created successfully", "path": new_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_file(
    old_path: str,
    new_path: str,
    ftp_user: FTPUser = Depends(get_ftp_connection),
    use_tls: bool = Query(True),
    current_user: User = Depends(get_current_rw_user)
):
    if ftp_user.permission == UserRole.READ_ONLY:
        raise HTTPException(status_code=403, detail="Read-only access")
    
    try:
        await ftp_service.rename_file(
            host="localhost",
            username=ftp_user.username,
            password="",
            old_path=old_path,
            new_path=new_path,
            use_tls=use_tls
        )
        return {"message": "File renamed successfully", "new_path": new_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))