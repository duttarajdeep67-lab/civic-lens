from typing import Optional, Literal
from pydantic import BaseModel, Field

CivicCategoryEnum = Literal[
    "Potholes and Damaged Roads",
    "Garbage Accumulation",
    "Overflowing Dustbins",
    "Water Leakage",
    "Sewage Overflow",
    "Broken Streetlights",
    "Open Drains",
    "Damaged Footpaths",
    "Public Park Maintenance",
    "Other Civic Issues"
]

PriorityEnum = Literal["Low", "Medium", "High", "Critical"]
ConfidenceEnum = Literal["Low", "Medium", "High"]

class AIAnalysisResult(BaseModel):
    issue_detected: bool = Field(..., description="Whether a civic issue is clearly visible in the image")
    title: str = Field(..., description="Concise, professional complaint title")
    category: str = Field(..., description="The standard civic issue category name")
    description: str = Field(..., description="Clear, objective description of the problem based strictly on visual evidence")
    priority: str = Field("Medium", description="Suggested priority: Low, Medium, High, or Critical")
    department: str = Field(..., description="Recommended government department")
    confidence: str = Field("Medium", description="Confidence level of detection: Low, Medium, High")
    reasoning_summary: str = Field(..., description="Brief summary of visual factors leading to this classification")

class AIAnalysisResponse(BaseModel):
    success: bool
    issue_detected: bool = False
    title: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    department: Optional[str] = None
    department_id: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    confidence: Optional[str] = "Medium"
    reasoning_summary: Optional[str] = None
    raw_message: Optional[str] = None
    is_demo: bool = False
