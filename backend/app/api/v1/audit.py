from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from app.core.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogResponse, PaginatedResponse
from app.api.deps import get_current_admin_user


router = APIRouter()


@router.get("/", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    total_result = await db.execute(select(AuditLog))
    total = len(total_result.scalars().all())
    
    result = await db.execute(
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset(skip)
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return {
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
        "items": logs
    }