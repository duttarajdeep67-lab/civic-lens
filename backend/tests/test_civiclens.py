import pytest
from app.models.all_models import User, Department, Category, Complaint

def test_public_stats(client):
    response = client.get("/api/public/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "departments_count" in data
    assert data["total_complaints"] >= 1

def test_reference_departments_and_categories(client):
    res_dept = client.get("/api/departments")
    assert res_dept.status_code == 200
    depts = res_dept.json()
    assert len(depts) >= 4
    assert any(d["name"] == "Roads and Public Works" for d in depts)

    res_cat = client.get("/api/categories")
    assert res_cat.status_code == 200
    cats = res_cat.json()
    assert len(cats) >= 3

def test_citizen_registration_and_login(client):
    # Register new citizen
    reg_payload = {
        "full_name": "New Citizen Test",
        "email": "new.citizen@civiclens.gov",
        "phone": "+91 9999988888",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    data = res_reg.json()
    assert "access_token" in data
    assert data["user"]["role"] == "citizen"

    # Login with credentials
    login_payload = {
        "email": "new.citizen@civiclens.gov",
        "password": "Password123!"
    }
    res_login = client.post("/api/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert login_data["user"]["email"] == "new.citizen@civiclens.gov"

def test_invalid_login(client):
    res = client.post("/api/auth/login", json={"email": "wrong@test.com", "password": "wrong"})
    assert res.status_code == 401

def test_officer_login(client):
    res = client.post("/api/auth/login", json={
        "email": "officer.roads.test@civiclens.gov",
        "password": "Pass123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "officer"
    assert data["user"]["department_name"] == "Roads and Public Works"

def test_citizen_create_complaint_and_routing(client, db_session):
    # Login citizen
    res_login = client.post("/api/auth/login", json={
        "email": "citizen.test@civiclens.gov",
        "password": "Pass123!"
    })
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch Category ID for Pothole
    cat = db_session.query(Category).filter(Category.name == "Potholes and Damaged Roads").first()

    payload = {
        "category_id": cat.id,
        "title": "Severe Pothole on 5th Cross",
        "description": "Large deep pothole creating vehicular hazard",
        "priority": "High",
        "latitude": 12.935,
        "longitude": 77.625,
        "address": "5th Cross Road, Bengaluru",
        "image_url": "/uploads/complaints/sample_pothole.jpg",
        "ai_detected": True,
        "ai_confidence": "High",
        "ai_reasoning_summary": "Road surface depression"
    }

    res = client.post("/api/complaints", json=payload, headers=headers)
    assert res.status_code == 201
    created = res.json()
    assert created["tracking_id"].startswith("CIV-2026-")
    assert created["department_name"] == "Roads and Public Works"
    assert created["status"] == "Submitted"

    # List my complaints
    res_my = client.get("/api/complaints/my", headers=headers)
    assert res_my.status_code == 200
    my_list = res_my.json()
    assert any(c["tracking_id"] == created["tracking_id"] for c in my_list)

def test_department_isolation_and_cross_access_prevention(client, db_session):
    # Roads complaint
    c_roads = db_session.query(Complaint).filter(Complaint.tracking_id == "CIV-2026-TEST01").first()

    # Login Sanitation officer
    res_san = client.post("/api/auth/login", json={
        "email": "officer.sanitation.test@civiclens.gov",
        "password": "Pass123!"
    })
    san_token = res_san.json()["access_token"]
    san_headers = {"Authorization": f"Bearer {san_token}"}

    # Sanitation officer attempts to view Roads complaint -> MUST BE FORBIDDEN 403
    res_get = client.get(f"/api/officer/complaints/{c_roads.id}", headers=san_headers)
    assert res_get.status_code == 403
    assert "Access Denied" in res_get.json()["detail"]

    # Sanitation officer attempts to modify Roads complaint -> MUST BE FORBIDDEN 403
    res_mod = client.patch(
        f"/api/officer/complaints/{c_roads.id}/status",
        json={"status": "Under Review", "note": "Illegal modification attempt"},
        headers=san_headers
    )
    assert res_mod.status_code == 403

def test_officer_authorized_status_lifecycle(client, db_session):
    # Roads complaint
    c_roads = db_session.query(Complaint).filter(Complaint.tracking_id == "CIV-2026-TEST01").first()

    # Login Roads officer
    res_roads = client.post("/api/auth/login", json={
        "email": "officer.roads.test@civiclens.gov",
        "password": "Pass123!"
    })
    roads_token = res_roads.json()["access_token"]
    roads_headers = {"Authorization": f"Bearer {roads_token}"}

    # 1. Update to Under Review
    res_rev = client.patch(
        f"/api/officer/complaints/{c_roads.id}/status",
        json={"status": "Under Review", "note": "Assigned road engineering inspector"},
        headers=roads_headers
    )
    assert res_rev.status_code == 200
    assert res_rev.json()["status"] == "Under Review"

    # 2. Update to In Progress
    res_prog = client.patch(
        f"/api/officer/complaints/{c_roads.id}/status",
        json={"status": "In Progress", "note": "Asphalt patch team in transit"},
        headers=roads_headers
    )
    assert res_prog.status_code == 200
    assert res_prog.json()["status"] == "In Progress"

    # 3. Add Progress Note
    res_note = client.post(
        f"/api/officer/complaints/{c_roads.id}/updates",
        json={"note": "Compaction roller completed layer 1"},
        headers=roads_headers
    )
    assert res_note.status_code == 200

    # 4. Attempt to resolve WITHOUT note -> MUST FAIL 400
    res_res_bad = client.patch(
        f"/api/officer/complaints/{c_roads.id}/status",
        json={"status": "Resolved", "note": ""},
        headers=roads_headers
    )
    assert res_res_bad.status_code == 400

    # 5. Resolve WITH note and resolution image
    res_res = client.patch(
        f"/api/officer/complaints/{c_roads.id}/status",
        json={
            "status": "Resolved",
            "note": "Road surface fully re-paved and sealed to standard",
            "resolution_image_url": "/uploads/resolutions/res_pothole.jpg"
        },
        headers=roads_headers
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "Resolved"
    assert res_res.json()["resolved_at"] is not None

    # Check history updates
    res_history = client.get(f"/api/complaints/{c_roads.id}/history", headers=roads_headers)
    assert res_history.status_code == 200
    history = res_history.json()
    assert len(history) >= 4

def test_reverse_geocoding_api(client):
    res = client.get("/api/location/reverse-geocode?lat=12.9352&lng=77.6245")
    assert res.status_code == 200
    data = res.json()
    assert "address" in data
    assert data["latitude"] == 12.9352
