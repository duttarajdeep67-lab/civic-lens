import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base
from app.api.deps import get_db
from app.core.security import get_password_hash
from app.models.all_models import User, Department, Category, Complaint, ComplaintUpdate

TEST_DB_FILE = "./test_temp.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except Exception:
        pass

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override the exact get_db dependency used across all routers
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create Departments
    dept_roads = Department(name="Roads and Public Works", description="Roads dept", is_active=True)
    dept_sanitation = Department(name="Sanitation", description="Sanitation dept", is_active=True)
    dept_water = Department(name="Water Supply", description="Water dept", is_active=True)
    dept_general = Department(name="General Civic Administration", description="General", is_active=True)
    db.add_all([dept_roads, dept_sanitation, dept_water, dept_general])
    db.flush()

    # Create Categories
    cat_pothole = Category(name="Potholes and Damaged Roads", department_id=dept_roads.id, is_active=True)
    cat_garbage = Category(name="Garbage Accumulation", department_id=dept_sanitation.id, is_active=True)
    cat_other = Category(name="Other Civic Issues", department_id=dept_general.id, is_active=True)
    db.add_all([cat_pothole, cat_garbage, cat_other])
    db.flush()

    # Create Users
    citizen = User(
        full_name="Test Citizen",
        email="citizen.test@civiclens.gov",
        password_hash=get_password_hash("Pass123!"),
        role="citizen"
    )
    other_citizen = User(
        full_name="Other Citizen",
        email="other.citizen@civiclens.gov",
        password_hash=get_password_hash("Pass123!"),
        role="citizen"
    )
    officer_roads = User(
        full_name="Officer Roads",
        email="officer.roads.test@civiclens.gov",
        password_hash=get_password_hash("Pass123!"),
        role="officer",
        department_id=dept_roads.id
    )
    officer_sanitation = User(
        full_name="Officer Sanitation",
        email="officer.sanitation.test@civiclens.gov",
        password_hash=get_password_hash("Pass123!"),
        role="officer",
        department_id=dept_sanitation.id
    )
    db.add_all([citizen, other_citizen, officer_roads, officer_sanitation])
    db.flush()

    # Create initial complaint
    c = Complaint(
        tracking_id="CIV-2026-TEST01",
        citizen_id=citizen.id,
        category_id=cat_pothole.id,
        department_id=dept_roads.id,
        title="Test Pothole on Main Road",
        description="Hazardous pothole for testing department isolation and resolution",
        priority="High",
        status="Submitted",
        image_url="/uploads/complaints/sample_pothole.jpg",
        ai_detected=True,
        ai_confidence="High"
    )
    db.add(c)
    db.flush()

    u = ComplaintUpdate(
        complaint_id=c.id,
        officer_id=None,
        previous_status=None,
        new_status="Submitted",
        note="Initial submission"
    )
    db.add(u)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
