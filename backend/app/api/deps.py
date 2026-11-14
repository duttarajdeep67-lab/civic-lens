from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_token
from app.models.all_models import User, Department

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    return user

async def get_current_citizen(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in ("citizen", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to citizens"
        )
    return current_user

async def get_current_officer(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in ("officer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to department officers"
        )
    return current_user

async def get_officer_department(
    officer: User = Depends(get_current_officer),
    db: Session = Depends(get_db)
) -> Department:
    if officer.role == "admin" and not officer.department_id:
        # Admin can view all or fallback
        first_dept = db.query(Department).first()
        return first_dept
    
    if not officer.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Officer account is not linked to any municipal department"
        )
    
    dept = db.query(Department).filter(Department.id == officer.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned department does not exist"
        )
    return dept
