from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.api.deps import get_db
from app.models.all_models import Complaint, Department, Category

router = APIRouter(prefix="/public", tags=["Public Data"])

@router.get("/stats")
async def get_public_stats(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    resolved = db.query(Complaint).filter(Complaint.status == "Resolved").count()
    in_progress = db.query(Complaint).filter(Complaint.status.in_(["In Progress", "Under Review"])).count()
    depts_count = db.query(Department).filter(Department.is_active == True).count()
    
    rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    recent_resolved = (
        db.query(Complaint)
        .filter(Complaint.status == "Resolved")
        .order_by(desc(Complaint.resolved_at))
        .limit(3)
        .all()
    )

    resolved_items = [
        {
            "tracking_id": c.tracking_id,
            "title": c.title,
            "category": c.category.name if c.category else "Civic",
            "department": c.department.name if c.department else "Municipal",
            "image_url": c.image_url,
            "resolved_at": c.resolved_at
        }
        for c in recent_resolved
    ]

    return {
        "total_complaints": total,
        "resolved_complaints": resolved,
        "in_progress_complaints": in_progress,
        "departments_count": depts_count,
        "resolution_rate": rate,
        "recent_resolved": resolved_items
    }
