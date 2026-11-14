import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="citizen")  # citizen, officer, admin
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    department = relationship("Department", back_populates="officers")
    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    updates = relationship("ComplaintUpdate", back_populates="officer")

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    categories = relationship("Category", back_populates="department")
    officers = relationship("User", back_populates="department")
    complaints = relationship("Complaint", back_populates="department")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), unique=True, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    department = relationship("Department", back_populates="categories")
    complaints = relationship("Complaint", back_populates="category")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tracking_id = Column(String(32), unique=True, index=True, nullable=False)
    citizen_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="Medium")  # Low, Medium, High, Critical
    status = Column(String(30), nullable=False, default="Submitted")  # Submitted, Under Review, In Progress, Resolved, Rejected, Reopened
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=False)
    ai_detected = Column(Boolean, default=False)
    ai_confidence = Column(String(20), nullable=True)  # Low, Medium, High
    ai_reasoning_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    category = relationship("Category", back_populates="complaints")
    department = relationship("Department", back_populates="complaints")
    updates = relationship("ComplaintUpdate", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintUpdate.created_at.asc()")
    ai_logs = relationship("AIAnalysisLog", back_populates="complaint")

class ComplaintUpdate(Base):
    __tablename__ = "complaint_updates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    resolution_image_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    complaint = relationship("Complaint", back_populates="updates")
    officer = relationship("User", back_populates="updates")

class AIAnalysisLog(Base):
    __tablename__ = "ai_analysis_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    complaint_id = Column(String(36), ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    model_name = Column(String(100), nullable=False)
    detected_category = Column(String(120), nullable=True)
    suggested_priority = Column(String(20), nullable=True)
    suggested_department = Column(String(120), nullable=True)
    analysis_status = Column(String(30), nullable=False)  # success, failed, no_issue
    created_at = Column(DateTime(timezone=True), default=utc_now)

    complaint = relationship("Complaint", back_populates="ai_logs")
