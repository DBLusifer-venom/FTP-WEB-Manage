from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    READ_WRITE = "read_write"
    READ_ONLY = "read_only"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.READ_ONLY, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    ftp_users = relationship("FTPUser", back_populates="owner", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_users_email", "email"),
    )


class FTPUser(Base):
    __tablename__ = "ftp_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    home_directory = Column(String(500), nullable=False)
    permission = Column(Enum(UserRole), default=UserRole.READ_ONLY, nullable=False)
    uid = Column(Integer)
    gid = Column(Integer)
    max_files = Column(Integer, default=0)
    max_size = Column(Integer, default=0)
    ratio_upload = Column(Integer, default=0)
    ratio_download = Column(Integer, default=0)
    bandwidth_up = Column(Integer, default=0)
    bandwidth_down = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="ftp_users")
    
    __table_args__ = (
        Index("ix_ftp_users_username", "username"),
    )


class SSLCertificate(Base):
    __tablename__ = "ssl_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    domain = Column(String(255), nullable=False)
    cert_path = Column(String(500), nullable=False)
    key_path = Column(String(500), nullable=False)
    chain_path = Column(String(500))
    issuer = Column(String(100))
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=False)
    auto_renew = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ServerConfig(Base):
    __tablename__ = "server_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(100))
    details = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )