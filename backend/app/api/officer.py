from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.api.deps import get_db, get_current_officer, get_officer_department
from app.models.all_models import Complaint, ComplaintUpdate, Department, Category, User
from app.schemas.complaint import (
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintUpdateResponse,
    ComplaintStatusUpdate,
    ComplaintNoteCreate,
    ComplaintStatsResponse
)
from app.services.storage_service import save_upload_file
from app.api.complaints import format_complaint_response

router = APIRouter(prefix="/officer", tags=["Officer Portal"])

VALID_TRANSITIONS = {
    "Submitted": ["Under Review", "Rejected"],
    "Under Review": ["In Progress", "Rejected"],
    "In Progress": ["Resolved", "Rejected"],
    "Resolved": ["Reopened"],
    "Rejected": ["Under Review", "Reopened"],
    "Reopened": ["In Progress", "Under Review", "Rejected"]
}

@router.get("/dashboard", response_model=ComplaintStatsResponse)
async def get_officer_dashboard(
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    base_query = db.query(Complaint).filter(Complaint.department_id == dept.id)

    total = base_query.count()
    submitted = base_query.filter(Complaint.status == "Submitted").count()
    under_review = base_query.filter(Complaint.status == "Under Review").count()
    in_progress = base_query.filter(Complaint.status == "In Progress").count()
    resolved = base_query.filter(Complaint.status == "Resolved").count()
    rejected = base_query.filter(Complaint.status == "Rejected").count()
    reopened = base_query.filter(Complaint.status == "Reopened").count()

    # Priority distribution
    priorities = ["Low", "Medium", "High", "Critical"]
    priority_dist = {}
    for p in priorities:
        priority_dist[p] = base_query.filter(Complaint.priority == p).count()

    # Category distribution
    cat_counts = (
        db.query(Category.name, func.count(Complaint.id))
        .join(Complaint, Complaint.category_id == Category.id)
        .filter(Complaint.department_id == dept.id)
        .group_by(Category.name)
        .all()
    )
    category_dist = {cat_name: count for cat_name, count in cat_counts}

    # Recent 7-day trend
    recent_trend = []
    # Calculate simple grouped activity for the last complaints
    recent_complaints = base_query.order_by(Complaint.created_at.desc()).limit(30).all()
    day_counts: Dict[str, int] = {}
    for c in reversed(recent_complaints):
        day_str = c.created_at.strftime("%b %d")
        day_counts[day_str] = day_counts.get(day_str, 0) + 1
    
    for day, count in day_counts.items():
        recent_trend.append({"date": day, "complaints": count})

    return ComplaintStatsResponse(
        total=total,
        submitted=submitted,
        under_review=under_review,
        in_progress=in_progress,
        resolved=resolved,
        rejected=rejected,
        reopened=reopened,
        priority_distribution=priority_dist,
        category_distribution=category_dist,
        recent_trend=recent_trend
    )

@router.get("/complaints", response_model=List[ComplaintResponse])
async def list_department_complaints(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    # Enforce Department Isolation
    query = db.query(Complaint).filter(Complaint.department_id == dept.id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Complaint.title.ilike(s)) | (Complaint.tracking_id.ilike(s)) | (Complaint.address.ilike(s)))
    if status and status != "All":
        query = query.filter(Complaint.status == status)
    if priority and priority != "All":
        query = query.filter(Complaint.priority == priority)
    if category_id and category_id != "All":
        query = query.filter(Complaint.category_id == category_id)

    offset = (page - 1) * limit
    complaints = query.order_by(desc(Complaint.created_at)).offset(offset).limit(limit).all()

    return [format_complaint_response(c) for c in complaints]

@router.get("/complaints/{id}", response_model=ComplaintDetailResponse)
async def get_department_complaint_detail(
    id: str,
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    # Strict Department Isolation
    if complaint.department_id != dept.id and officer.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: This complaint belongs to {complaint.department.name if complaint.department else 'another department'}, not {dept.name}."
        )

    base_resp = format_complaint_response(complaint)
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

@router.patch("/complaints/{id}/status", response_model=ComplaintDetailResponse)
async def update_complaint_status(
    id: str,
    data: ComplaintStatusUpdate,
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if complaint.department_id != dept.id and officer.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Cannot modify complaints belonging to another department"
        )

    previous_status = complaint.status
    target_status = data.status

    # Validate transition
    allowed_transitions = VALID_TRANSITIONS.get(previous_status, [])
    if target_status not in allowed_transitions and target_status != previous_status and officer.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{previous_status}' to '{target_status}'. Allowed: {', '.join(allowed_transitions)}"
        )

    # Resolution validation
    if target_status == "Resolved":
        if not data.note or len(data.note.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A detailed resolution note (at least 5 characters) is required when marking a complaint as Resolved"
            )
        complaint.resolved_at = datetime.now(timezone.utc)
    elif target_status == "Rejected":
        if not data.note or len(data.note.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A clear rejection reason is required when rejecting a complaint"
            )

    complaint.status = target_status
    complaint.updated_at = datetime.now(timezone.utc)

    # Create audit record
    update_record = ComplaintUpdate(
        complaint_id=complaint.id,
        officer_id=officer.id,
        previous_status=previous_status,
        new_status=target_status,
        note=data.note.strip() if data.note else f"Status changed to {target_status}",
        resolution_image_url=data.resolution_image_url
    )
    db.add(update_record)
    db.commit()
    db.refresh(complaint)

    # Return full detail
    return await get_department_complaint_detail(complaint.id, officer, dept, db)

@router.post("/complaints/{id}/updates", response_model=ComplaintDetailResponse)
async def add_progress_note(
    id: str,
    data: ComplaintNoteCreate,
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if complaint.department_id != dept.id and officer.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Cannot modify complaints belonging to another department"
        )

    update_record = ComplaintUpdate(
        complaint_id=complaint.id,
        officer_id=officer.id,
        previous_status=complaint.status,
        new_status=complaint.status,
        note=data.note.strip(),
        resolution_image_url=None
    )
    db.add(update_record)
    complaint.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)

    return await get_department_complaint_detail(complaint.id, officer, dept, db)

@router.post("/complaints/{id}/resolution-image")
async def upload_resolution_image(
    id: str,
    file: UploadFile = File(...),
    officer: User = Depends(get_current_officer),
    dept: Department = Depends(get_officer_department),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_id == id).first()

    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if complaint.department_id != dept.id and officer.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Cannot modify complaints belonging to another department"
        )

    image_url = await save_upload_file(file, subfolder="resolutions")
    return {"resolution_image_url": image_url}
