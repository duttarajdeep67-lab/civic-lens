from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str
    department_id: str
    is_active: bool = True

class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    department_name: Optional[str] = None
    created_at: datetime
