import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.all_models import User, AIAnalysisLog
from app.services.storage_service import save_upload_file
from app.services.vision_service import vision_service
from app.services.routing_service import get_db_category_and_department
from app.schemas.ai import AIAnalysisResponse

router = APIRouter(prefix="/ai", tags=["AI Vision Analysis"])

@router.post("/analyze-image", response_model=AIAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    force_demo: Optional[bool] = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image (JPEG, PNG, or WebP)"
        )

    # Read image bytes
    image_bytes = await file.read()
    mime_type = file.content_type

    # Reset position to save file to local uploads
    await file.seek(0)
    image_url = await save_upload_file(file, subfolder="complaints")

    # Call Gemini Vision Service
    analysis = await vision_service.analyze_civic_image(
        image_bytes=image_bytes,
        mime_type=mime_type,
        force_demo=force_demo or False
    )

    category_id = None
    department_id = None

    if analysis.success and analysis.issue_detected and analysis.category:
        cat, dept = get_db_category_and_department(db, analysis.category)
        if cat:
            category_id = cat.id
            analysis.category = cat.name
        if dept:
            department_id = dept.id
            analysis.department = dept.name

    # Create AI Analysis Log
    analysis_status = "success" if (analysis.success and analysis.issue_detected) else ("failed" if not analysis.success else "no_issue")
    ai_log = AIAnalysisLog(
        complaint_id=None,
        model_name=vision_service.model,
        detected_category=analysis.category,
        suggested_priority=analysis.priority,
        suggested_department=analysis.department,
        analysis_status=analysis_status
    )
    db.add(ai_log)
    db.commit()

    analysis.category_id = category_id
    analysis.department_id = department_id

    # Attach saved image url into raw message or response if needed
    return analysis
