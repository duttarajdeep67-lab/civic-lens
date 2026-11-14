from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.all_models import Department, Category
from app.schemas.department import DepartmentResponse
from app.schemas.category import CategoryResponse

router = APIRouter(tags=["Reference Data"])

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()
    return departments

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.name.asc()).all()
    result = []
    for cat in categories:
        result.append(CategoryResponse(
            id=cat.id,
            name=cat.name,
            department_id=cat.department_id,
            department_name=cat.department.name if cat.department else None,
            is_active=cat.is_active,
            created_at=cat.created_at
        ))
    return result
