import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db, get_current_user, get_current_citizen
from app.models.all_models import Complaint, ComplaintUpdate, Category, Department, User
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintUpdateResponse
)
from app.services.storage_service import save_upload_file
from app.services.routing_service import get_db_category_and_department

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_tracking_id() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"CIV-2026-{chars}"

def format_complaint_response(c: Complaint) -> ComplaintResponse:
    return ComplaintResponse(
        id=c.id,
        tracking_id=c.tracking_id,
        citizen_id=c.citizen_id,
        citizen_name=c.citizen.full_name if c.citizen else "Citizen",
        citizen_phone=c.citizen.phone if c.citizen else None,
        category_id=c.category_id,
        category_name=c.category.name if c.category else None,
        department_id=c.department_id,
        department_name=c.department.name if c.department else None,
        title=c.title,
        description=c.description,
        priority=c.priority,
        status=c.status,
        latitude=c.latitude,
        longitude=c.longitude,
        address=c.address,
        image_url=c.image_url,
        ai_detected=c.ai_detected,
        ai_confidence=c.ai_confidence,
        ai_reasoning_summary=c.ai_reasoning_summary,
        created_at=c.created_at,
        updated_at=c.updated_at,
        resolved_at=c.resolved_at
    )

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    url = await save_upload_file(file, subfolder="complaints")
    return {"image_url": url}

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    data: ComplaintCreate,
    citizen: User = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    # Verify Category exists and get mapped department
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected civic category was not found"
        )
    
    department = db.query(Department).filter(Department.id == category.department_id).first()
    if not department:
        # Fallback to general admin department
        department = db.query(Department).filter(Department.name == "General Civic Administration").first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Responsible department configuration missing"
            )

    tracking_id = generate_tracking_id()
    # Ensure tracking_id uniqueness
    while db.query(Complaint).filter(Complaint.tracking_id == tracking_id).first():
        tracking_id = generate_tracking_id()

    complaint = Complaint(
        tracking_id=tracking_id,
        citizen_id=citizen.id,
        category_id=category.id,
        department_id=department.id,
        title=data.title.strip(),
        description=data.description.strip(),
        priority=data.priority,
        status="Submitted",
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address.strip() if data.address else None,
        image_url=data.image_url,
        ai_detected=data.ai_detected,
        ai_confidence=data.ai_confidence,
        ai_reasoning_summary=data.ai_reasoning_summary
    )
    db.add(complaint)
    db.flush()

    # Initial timeline update
    initial_update = ComplaintUpdate(
        complaint_id=complaint.id,
        officer_id=None,
        previous_status=None,
        new_status="Submitted",
        note="Complaint submitted and automatically routed to department",
        resolution_image_url=None
    )
    db.add(initial_update)
    db.commit()
    db.refresh(complaint)

    return format_complaint_response(complaint)

@router.get("/my", response_model=List[ComplaintResponse])
async def list_my_complaints(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    citizen: User = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint).filter(Complaint.citizen_id == citizen.id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Complaint.title.ilike(s)) | (Complaint.tracking_id.ilike(s)) | (Complaint.address.ilike(s)))
    if status and status != "All":
        query = query.filter(Complaint.status == status)
    if category_id and category_id != "All":
        query = query.filter(Complaint.category_id == category_id)

    offset = (page - 1) * limit
    complaints = query.order_by(desc(Complaint.created_at)).offset(offset).limit(limit).all()

    return [format_complaint_response(c) for c in complaints]

@router.get("/{id}", response_model=ComplaintDetailResponse)
async def get_complaint_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        # Check by tracking_id
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Department Isolation & Citizen Isolation
    if current_user.role == "citizen" and complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this complaint"
        )
    if current_user.role == "officer" and complaint.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This complaint belongs to a different municipal department"
        )

    base_resp = format_complaint_response(complaint)
    
    # Fetch updates
    updates_db = db.query(ComplaintUpdate).filter(ComplaintUpdate.complaint_id == complaint.id).order_by(ComplaintUpdate.created_at.asc()).all()
    updates = [
        ComplaintUpdateResponse(
            id=u.id,
            complaint_id=u.complaint_id,
            officer_id=u.officer_id,
            officer_name=u.officer.full_name if u.officer else "System / Citizen",
            previous_status=u.previous_status,
            new_status=u.new_status,
            note=u.note,
            resolution_image_url=u.resolution_image_url,
            created_at=u.created_at
        )
        for u in updates_db
    ]

    return ComplaintDetailResponse(**base_resp.model_dump(), updates=updates)

@router.get("/{id}/history", response_model=List[ComplaintUpdateResponse])
async def get_complaint_history(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    if current_user.role == "citizen" and complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    if current_user.role == "officer" and complaint.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )

    updates_db = db.query(ComplaintUpdate).filter(ComplaintUpdate.complaint_id == complaint.id).order_by(ComplaintUpdate.created_at.asc()).all()
    return [
        ComplaintUpdateResponse(
            id=u.id,
            complaint_id=u.complaint_id,
            officer_id=u.officer_id,
            officer_name=u.officer.full_name if u.officer else "System / Citizen",
            previous_status=u.previous_status,
            new_status=u.new_status,
            note=u.note,
            resolution_image_url=u.resolution_image_url,
            created_at=u.created_at
        )
        for u in updates_db
    ]
