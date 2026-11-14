from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ComplaintCreate(BaseModel):
    category_id: str
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    image_url: str
    ai_detected: bool = False
    ai_confidence: Optional[str] = None
    ai_reasoning_summary: Optional[str] = None

class ComplaintStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Under Review|In Progress|Resolved|Rejected|Reopened)$")
    note: Optional[str] = None
    resolution_image_url: Optional[str] = None

class ComplaintNoteCreate(BaseModel):
    note: str = Field(..., min_length=1)

class ComplaintUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    complaint_id: str
    officer_id: Optional[str] = None
    officer_name: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    resolution_image_url: Optional[str] = None
    created_at: datetime

class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tracking_id: str
    citizen_id: str
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    department_id: str
    department_name: Optional[str] = None
    title: str
    description: str
    priority: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    image_url: str
    ai_detected: bool
    ai_confidence: Optional[str] = None
    ai_reasoning_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

class ComplaintDetailResponse(ComplaintResponse):
    updates: List[ComplaintUpdateResponse] = []

class ComplaintStatsResponse(BaseModel):
    total: int = 0
    submitted: int = 0
    under_review: int = 0
    in_progress: int = 0
    resolved: int = 0
    rejected: int = 0
    reopened: int = 0
    priority_distribution: Dict[str, int] = {}
    category_distribution: Dict[str, int] = {}
    recent_trend: List[Dict[str, Any]] = []
