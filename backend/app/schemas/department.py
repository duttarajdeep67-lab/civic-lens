from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
