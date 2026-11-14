import os
import random
from datetime import datetime, timedelta, timezone
from PIL import Image, ImageDraw, ImageFont

from app.db.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.all_models import User, Department, Category, Complaint, ComplaintUpdate, AIAnalysisLog
from app.core.config import settings

def create_sample_image(filename: str, title: str, subtitle: str, color_bg: tuple, color_accent: tuple) -> str:
    subfolder = "complaints" if "res_" not in filename else "resolutions"
    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)
    full_path = os.path.join(target_dir, filename)

    if not os.path.exists(full_path):
        img = Image.new("RGB", (800, 500), color=color_bg)
        draw = ImageDraw.Draw(img)

        # Draw decorative grid & border
        for x in range(0, 800, 40):
            draw.line([(x, 0), (x, 500)], fill=(color_bg[0]+8, color_bg[1]+8, color_bg[2]+8), width=1)
        for y in range(0, 500, 40):
            draw.line([(0, y), (800, y)], fill=(color_bg[0]+8, color_bg[1]+8, color_bg[2]+8), width=1)

        draw.rectangle([(20, 20), (780, 480)], outline=color_accent, width=3)
        draw.rectangle([(40, 40), (760, 460)], outline=(color_bg[0]+20, color_bg[1]+20, color_bg[2]+20), width=1)

        # Draw banner badge
        draw.rectangle([(50, 60), (320, 100)], fill=color_accent)
        draw.text((65, 72), "CIVICLENS EVIDENCE", fill=(255, 255, 255))

        # Main text
        draw.text((60, 160), title.upper(), fill=(255, 255, 255))
        draw.text((60, 220), subtitle, fill=(200, 210, 225))
        draw.text((60, 400), f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", fill=(160, 175, 195))
        draw.text((60, 425), "CivicLens Verified Photographic Record", fill=color_accent)

        img.save(full_path, "JPEG", quality=90)

    return f"/uploads/{subfolder}/{filename}"

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding departments...")
        depts_data = [
            ("Roads and Public Works", "Responsible for roads, potholes, pavements, and vehicular infrastructure maintenance."),
            ("Sanitation", "Responsible for solid waste management, garbage collection, and street sweeping."),
            ("Water Supply", "Responsible for municipal water pipelines, leakage fixes, and water distribution."),
            ("Sewerage and Drainage", "Responsible for underground drainage, manholes, open stormwater drains, and sewage control."),
            ("Electrical and Street Lighting", "Responsible for public streetlights, high masts, and municipal electrical fixtures."),
            ("Parks and Recreation", "Responsible for public parks, green belts, gardens, and playground equipment."),
            ("General Civic Administration", "Responsible for miscellaneous civic issues and inter-departmental complaints.")
        ]

        dept_map = {}
        for name, desc in depts_data:
            dept = db.query(Department).filter(Department.name == name).first()
            if not dept:
                dept = Department(name=name, description=desc, is_active=True)
                db.add(dept)
                db.flush()
            dept_map[name] = dept

        print("Seeding categories...")
        categories_data = [
            ("Potholes and Damaged Roads", "Roads and Public Works"),
            ("Damaged Footpaths", "Roads and Public Works"),
            ("Garbage Accumulation", "Sanitation"),
            ("Overflowing Dustbins", "Sanitation"),
            ("Water Leakage", "Water Supply"),
            ("Sewage Overflow", "Sewerage and Drainage"),
            ("Open Drains", "Sewerage and Drainage"),
            ("Broken Streetlights", "Electrical and Street Lighting"),
            ("Public Park Maintenance", "Parks and Recreation"),
            ("Other Civic Issues", "General Civic Administration")
        ]

        cat_map = {}
        for cat_name, dept_name in categories_data:
            cat = db.query(Category).filter(Category.name == cat_name).first()
            if not cat:
                cat = Category(
                    name=cat_name,
                    department_id=dept_map[dept_name].id,
                    is_active=True
                )
                db.add(cat)
                db.flush()
            cat_map[cat_name] = cat

        print("Seeding demo users...")
        # Demo Citizen
        citizen = db.query(User).filter(User.email == "citizen@civiclens.gov").first()
        if not citizen:
            citizen = User(
                full_name="Rajesh Sharma",
                email="citizen@civiclens.gov",
                phone="+91 98765 43210",
                password_hash=get_password_hash("Citizen123!"),
                role="citizen",
                department_id=None
            )
            db.add(citizen)
            db.flush()

        # Demo Officers
        officers_data = [
            ("Vikram Malhotra", "officer.roads@civiclens.gov", "Officer123!", "Roads and Public Works"),
            ("Ananya Deshmukh", "officer.sanitation@civiclens.gov", "Officer123!", "Sanitation"),
            ("Suresh Nair", "officer.water@civiclens.gov", "Officer123!", "Water Supply"),
            ("Pooja Kulkarni", "officer.sewerage@civiclens.gov", "Officer123!", "Sewerage and Drainage"),
            ("Amit Patel", "officer.electrical@civiclens.gov", "Officer123!", "Electrical and Street Lighting")
        ]

        officer_map = {}
        for name, email, pwd, dept_name in officers_data:
            officer = db.query(User).filter(User.email == email).first()
            if not officer:
                officer = User(
                    full_name=name,
                    email=email,
                    phone="+91 91234 56789",
                    password_hash=get_password_hash(pwd),
                    role="officer",
                    department_id=dept_map[dept_name].id
                )
                db.add(officer)
                db.flush()
            officer_map[dept_name] = officer

        print("Generating sample evidence images...")
        img_pothole = create_sample_image("sample_pothole.jpg", "Hazardous Road Pothole", "Deep road depression on Outer Ring Road", (35, 42, 54), (239, 68, 68))
        img_pothole_res = create_sample_image("res_pothole.jpg", "Pothole Re-asphalted & Levelled", "Completed road repair with hot bitumen mix", (20, 50, 40), (34, 197, 94))
        
        img_garbage = create_sample_image("sample_garbage.jpg", "Garbage Dump Overflow", "Accumulated municipal waste near Market Complex", (45, 38, 30), (245, 158, 11))
        img_garbage_res = create_sample_image("res_garbage.jpg", "Sanitation Clearance Complete", "Cleared and disinfected area with new bin installed", (20, 50, 40), (34, 197, 94))
        
        img_water = create_sample_image("sample_water.jpg", "Main Pipeline Rupture", "Fresh water gushing across main avenue", (25, 45, 65), (59, 130, 246))
        img_water_res = create_sample_image("res_water.jpg", "Pipeline Repaired & Sealed", "Replaced cracked ductile iron collar joint", (20, 50, 40), (34, 197, 94))
        
        img_light = create_sample_image("sample_light.jpg", "Defective Streetlight Pole #42", "High-pressure sodium lamp damaged & non-functional", (40, 35, 55), (168, 85, 247))
        img_drain = create_sample_image("sample_drain.jpg", "Open Storm Drain Hazard", "Missing concrete slab cover near pedestrian crosswalk", (45, 25, 25), (220, 38, 38))

        print("Seeding representative complaints...")
        # Check if complaints exist
        if db.query(Complaint).count() == 0:
            now = datetime.now(timezone.utc)

            # 1. Resolved Roads complaint
            c1 = Complaint(
                tracking_id="CIV-2026-RD801",
                citizen_id=citizen.id,
                category_id=cat_map["Potholes and Damaged Roads"].id,
                department_id=dept_map["Roads and Public Works"].id,
                title="Deep Hazardous Pothole on 100ft Inner Ring Road",
                description="Large pothole measuring approximately 1.2 meters across and 15 cm deep in the middle vehicular lane. Poses severe danger to two-wheelers especially during evening traffic.",
                priority="High",
                status="Resolved",
                latitude=12.9352,
                longitude=77.6245,
                address="Near Sony World Signal, 100 Feet Road, Koramangala 4th Block, Bengaluru",
                image_url=img_pothole,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Clear asphalt surface perforation with fractured aggregate and depth hazard visible in traffic lane.",
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(hours=6),
                resolved_at=now - timedelta(hours=6)
            )
            db.add(c1)
            db.flush()

            u1_1 = ComplaintUpdate(complaint_id=c1.id, officer_id=None, previous_status=None, new_status="Submitted", note="Complaint submitted by citizen with AI vision analysis", created_at=now - timedelta(days=5))
            u1_2 = ComplaintUpdate(complaint_id=c1.id, officer_id=officer_map["Roads and Public Works"].id, previous_status="Submitted", new_status="Under Review", note="Field engineering team dispatched for volumetric assessment.", created_at=now - timedelta(days=4))
            u1_3 = ComplaintUpdate(complaint_id=c1.id, officer_id=officer_map["Roads and Public Works"].id, previous_status="Under Review", new_status="In Progress", note="Bitumen hot-mix batch allocated. Road levelling work scheduled overnight.", created_at=now - timedelta(days=2))
            u1_4 = ComplaintUpdate(complaint_id=c1.id, officer_id=officer_map["Roads and Public Works"].id, previous_status="In Progress", new_status="Resolved", note="Pothole filled, compacted with heavy roller, and road surface sealed with asphalt emulsion.", resolution_image_url=img_pothole_res, created_at=now - timedelta(hours=6))
            db.add_all([u1_1, u1_2, u1_3, u1_4])

            # 2. In Progress Roads complaint
            c2 = Complaint(
                tracking_id="CIV-2026-RD802",
                citizen_id=citizen.id,
                category_id=cat_map["Damaged Footpaths"].id,
                department_id=dept_map["Roads and Public Works"].id,
                title="Broken Concrete Paver Blocks on Pedestrian Walkway",
                description="Several sidewalk slabs have collapsed leaving exposed rubble and tripping hazard for elderly pedestrians.",
                priority="Medium",
                status="In Progress",
                latitude=12.9279,
                longitude=77.6271,
                address="Opposite BDA Complex, 80 Feet Road, Koramangala 3rd Block, Bengaluru",
                image_url=img_pothole,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Visible fragmented interlocking pavers with missing sub-base support along walking corridor.",
                created_at=now - timedelta(days=2),
                updated_at=now - timedelta(hours=14)
            )
            db.add(c2)
            db.flush()

            u2_1 = ComplaintUpdate(complaint_id=c2.id, officer_id=None, previous_status=None, new_status="Submitted", note="Citizen reported damaged sidewalk", created_at=now - timedelta(days=2))
            u2_2 = ComplaintUpdate(complaint_id=c2.id, officer_id=officer_map["Roads and Public Works"].id, previous_status="Submitted", new_status="In Progress", note="Contractor issued work order to re-lay precast concrete slabs.", created_at=now - timedelta(hours=14))
            db.add_all([u2_1, u2_2])

            # 3. Under Review Sanitation complaint
            c3 = Complaint(
                tracking_id="CIV-2026-SN301",
                citizen_id=citizen.id,
                category_id=cat_map["Garbage Accumulation"].id,
                department_id=dept_map["Sanitation"].id,
                title="Severe Waste Accumulation Beside Community Park",
                description="Uncollected municipal solid waste piled up over 4 days. Foul smell and stray animal congregation near residential entry.",
                priority="High",
                status="Under Review",
                latitude=12.9340,
                longitude=77.6101,
                address="Near Rose Garden, 5th Main, BTM Layout 1st Stage, Bengaluru",
                image_url=img_garbage,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Large mound of mixed domestic garbage bags and decomposing organic waste on public road curb.",
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(hours=8)
            )
            db.add(c3)
            db.flush()

            u3_1 = ComplaintUpdate(complaint_id=c3.id, officer_id=None, previous_status=None, new_status="Submitted", note="Submitted by citizen", created_at=now - timedelta(days=1))
            u3_2 = ComplaintUpdate(complaint_id=c3.id, officer_id=officer_map["Sanitation"].id, previous_status="Submitted", new_status="Under Review", note="Sanitation inspector notified. Tipper truck assigned for collection.", created_at=now - timedelta(hours=8))
            db.add_all([u3_1, u3_2])

            # 4. Resolved Sanitation complaint
            c4 = Complaint(
                tracking_id="CIV-2026-SN302",
                citizen_id=citizen.id,
                category_id=cat_map["Overflowing Dustbins"].id,
                department_id=dept_map["Sanitation"].id,
                title="Overflowing Community Dumpster Spilling onto Street",
                description="Commercial street bins are overflowing with cardboard and food packaging across the sidewalk.",
                priority="Medium",
                status="Resolved",
                latitude=12.9298,
                longitude=77.6155,
                address="7th Main Commercial Street, BTM 2nd Stage, Bengaluru",
                image_url=img_garbage,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Green municipal compactor bin filled beyond capacity with waste spilling on surrounding pavement.",
                created_at=now - timedelta(days=4),
                updated_at=now - timedelta(days=1),
                resolved_at=now - timedelta(days=1)
            )
            db.add(c4)
            db.flush()

            u4_1 = ComplaintUpdate(complaint_id=c4.id, officer_id=None, previous_status=None, new_status="Submitted", note="Complaint submitted", created_at=now - timedelta(days=4))
            u4_2 = ComplaintUpdate(complaint_id=c4.id, officer_id=officer_map["Sanitation"].id, previous_status="Submitted", new_status="In Progress", note="Waste collection crew deployed.", created_at=now - timedelta(days=3))
            u4_3 = ComplaintUpdate(complaint_id=c4.id, officer_id=officer_map["Sanitation"].id, previous_status="In Progress", new_status="Resolved", note="Dumpster cleared, area swept, sanitized with bleaching powder.", resolution_image_url=img_garbage_res, created_at=now - timedelta(days=1))
            db.add_all([u4_1, u4_2, u4_3])

            # 5. Submitted Water complaint
            c5 = Complaint(
                tracking_id="CIV-2026-WS101",
                citizen_id=citizen.id,
                category_id=cat_map["Water Leakage"].id,
                department_id=dept_map["Water Supply"].id,
                title="Underground Drinking Water Main Pipe Burst",
                description="Continuous pressurized potable water fountain spraying from road joint. Significant water wastage and flooding street.",
                priority="Critical",
                status="Submitted",
                latitude=12.9380,
                longitude=77.6300,
                address="Near Water Tank, 17th Main, Sector 4, HSR Layout, Bengaluru",
                image_url=img_water,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Pressurized clear water eruption from subterranean distribution pipe with standing water pool.",
                created_at=now - timedelta(hours=3),
                updated_at=now - timedelta(hours=3)
            )
            db.add(c5)
            db.flush()

            u5_1 = ComplaintUpdate(complaint_id=c5.id, officer_id=None, previous_status=None, new_status="Submitted", note="Complaint submitted and flagged as Critical", created_at=now - timedelta(hours=3))
            db.add(u5_1)

            # 6. Submitted Streetlight complaint
            c6 = Complaint(
                tracking_id="CIV-2026-EL401",
                citizen_id=citizen.id,
                category_id=cat_map["Broken Streetlights"].id,
                department_id=dept_map["Electrical and Street Lighting"].id,
                title="Dark Street Stretch Due to Broken LED Luminaire",
                description="Pole fixture damaged; light does not turn on at night creating safety hazard for commuters.",
                priority="Medium",
                status="Submitted",
                latitude=12.9315,
                longitude=77.6210,
                address="Cross 12, Koramangala 5th Block, Bengaluru",
                image_url=img_light,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Visible external luminaire casing fracture on municipal light post.",
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5)
            )
            db.add(c6)
            db.flush()
            u6_1 = ComplaintUpdate(complaint_id=c6.id, officer_id=None, previous_status=None, new_status="Submitted", note="Submitted by citizen", created_at=now - timedelta(hours=5))
            db.add(u6_1)

            # 7. In Progress Sewerage complaint
            c7 = Complaint(
                tracking_id="CIV-2026-SW501",
                citizen_id=citizen.id,
                category_id=cat_map["Open Drains"].id,
                department_id=dept_map["Sewerage and Drainage"].id,
                title="Uncovered Stormwater Drain Near School Entrance",
                description="Heavy concrete drain grate broke off leaving a 2-meter deep open trench directly in front of the school gate.",
                priority="Critical",
                status="In Progress",
                latitude=12.9240,
                longitude=77.6180,
                address="Near National Public School, 6th Cross, Koramangala, Bengaluru",
                image_url=img_drain,
                ai_detected=True,
                ai_confidence="High",
                ai_reasoning_summary="Missing protective grating over open municipal stormwater drainage trench posing critical fall hazard.",
                created_at=now - timedelta(days=1, hours=6),
                updated_at=now - timedelta(hours=4)
            )
            db.add(c7)
            db.flush()
            u7_1 = ComplaintUpdate(complaint_id=c7.id, officer_id=None, previous_status=None, new_status="Submitted", note="Complaint submitted", created_at=now - timedelta(days=1, hours=6))
            u7_2 = ComplaintUpdate(complaint_id=c7.id, officer_id=officer_map["Sewerage and Drainage"].id, previous_status="Submitted", new_status="In Progress", note="Safety barricades placed. Heavy-duty cast iron replacement grate ordered.", created_at=now - timedelta(hours=4))
            db.add_all([u7_1, u7_2])

        db.commit()
        print("Database successfully seeded with realistic departments, categories, officers, citizen, and complaints!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
