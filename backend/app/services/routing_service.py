from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models.all_models import Category, Department

# Canonical mapping
CATEGORY_DEPARTMENT_MAPPING = {
    "Potholes and Damaged Roads": "Roads and Public Works",
    "Garbage Accumulation": "Sanitation",
    "Overflowing Dustbins": "Sanitation",
    "Water Leakage": "Water Supply",
    "Sewage Overflow": "Sewerage and Drainage",
    "Broken Streetlights": "Electrical and Street Lighting",
    "Open Drains": "Sewerage and Drainage",
    "Damaged Footpaths": "Roads and Public Works",
    "Public Park Maintenance": "Parks and Recreation",
    "Other Civic Issues": "General Civic Administration"
}

def normalize_category_name(raw_category: str) -> str:
    """Matches raw model category output to official allowed category names."""
    if not raw_category:
        return "Other Civic Issues"
    
    clean = raw_category.strip().lower()

    if "pothole" in clean or "road" in clean or "asphalt" in clean or "crater" in clean:
        return "Potholes and Damaged Roads"
    if "dustbin" in clean or "trash bin" in clean or "overflowing bin" in clean:
        return "Overflowing Dustbins"
    if "garbage" in clean or "trash" in clean or "waste" in clean or "dump" in clean or "litter" in clean:
        return "Garbage Accumulation"
    if "leak" in clean or "pipe" in clean or "water supply" in clean:
        return "Water Leakage"
    if "sewage" in clean or "sewer" in clean or "manhole" in clean:
        return "Sewage Overflow"
    if "streetlight" in clean or "street light" in clean or "lamp" in clean or "electrical" in clean:
        return "Broken Streetlights"
    if "drain" in clean or "gutter" in clean:
        return "Open Drains"
    if "footpath" in clean or "sidewalk" in clean or "pavement" in clean or "curb" in clean:
        return "Damaged Footpaths"
    if "park" in clean or "garden" in clean or "playground" in clean or "tree" in clean or "grass" in clean:
        return "Public Park Maintenance"

    # Exact key match check
    for cat in CATEGORY_DEPARTMENT_MAPPING:
        if cat.lower() == clean:
            return cat

    return "Other Civic Issues"

def resolve_department_for_category(category_name: str) -> str:
    normalized = normalize_category_name(category_name)
    return CATEGORY_DEPARTMENT_MAPPING.get(normalized, "General Civic Administration")

def get_db_category_and_department(db: Session, category_id_or_name: str) -> Tuple[Optional[Category], Optional[Department]]:
    """Fetches Category and Department database records by ID or by Name."""
    # Try by ID first
    cat = db.query(Category).filter(Category.id == category_id_or_name).first()
    if not cat:
        # Try by Name
        cat = db.query(Category).filter(Category.name.ilike(category_id_or_name)).first()
    
    if not cat:
        # Fallback to 'Other Civic Issues'
        cat = db.query(Category).filter(Category.name == "Other Civic Issues").first()

    if not cat:
        return None, None

    dept = db.query(Department).filter(Department.id == cat.department_id).first()
    return cat, dept
