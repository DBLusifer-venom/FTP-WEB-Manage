from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.READ_ONLY


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class User(UserInDB):
    pass


class FTPUserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    home_directory: str = Field(..., min_length=1)
    permission: UserRole = UserRole.READ_ONLY
    uid: Optional[int] = None
    gid: Optional[int] = None
    max_files: int = 0
    max_size: int = 0
    ratio_upload: int = 0
    ratio_download: int = 0
    bandwidth_up: int = 0
    bandwidth_down: int = 0


class FTPUserCreate(FTPUserBase):
    password: str = Field(..., min_length=8)


class FTPUserUpdate(BaseModel):
    password: Optional[str] = Field(None, min_length=8)
    home_directory: Optional[str] = None
    permission: Optional[UserRole] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    max_files: Optional[int] = None
    max_size: Optional[int] = None
    ratio_upload: Optional[int] = None
    ratio_download: Optional[int] = None
    bandwidth_up: Optional[int] = None
    bandwidth_down: Optional[int] = None
    is_active: Optional[bool] = None


class FTPUserInDB(FTPUserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    owner_id: Optional[int]
    
    class Config:
        from_attributes = True


class FTPUser(FTPUserInDB):
    pass


class SSLCertificateBase(BaseModel):
    name: str
    domain: str
    cert_path: str
    key_path: str
    chain_path: Optional[str] = None
    auto_renew: bool = False


class SSLCertificateCreate(SSLCertificateBase):
    pass


class SSLCertificateUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    cert_path: Optional[str] = None
    key_path: Optional[str] = None
    chain_path: Optional[str] = None
    is_active: Optional[bool] = None
    auto_renew: Optional[bool] = None


class SSLCertificateInDB(SSLCertificateBase):
    id: int
    issuer: Optional[str]
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SSLCertificate(SSLCertificateInDB):
    pass


class ServerConfigBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class ServerConfigCreate(ServerConfigBase):
    pass


class ServerConfigUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class ServerConfigInDB(ServerConfigBase):
    id: int
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ServerConfig(ServerConfigInDB):
    pass


class FileItem(BaseModel):
    name: str
    path: str
    size: int
    modified: datetime
    is_dir: bool
    permissions: str
    owner: str
    group: str


class FileListResponse(BaseModel):
    current_path: str
    parent_path: Optional[str]
    items: List[FileItem]


class FileOperation(BaseModel):
    action: str
    source: str
    destination: Optional[str] = None


class ServerStatus(BaseModel):
    status: str
    uptime: Optional[str]
    connections: int
    version: str
    config: dict


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List


class HealthCheck(BaseModel):
    status: str
    database: str
    ftp_server: str
    redis: str