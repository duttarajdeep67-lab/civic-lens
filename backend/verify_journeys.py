import requests

BASE = 'http://127.0.0.1:8000/api'

def run():
    print('=== 1. TEST JOURNEY A: Citizen Reports Pothole ===')
    # Login Citizen
    res_cit = requests.post(f'{BASE}/auth/login', json={'email': 'citizen@civiclens.gov', 'password': 'Citizen123!'})
    assert res_cit.status_code == 200, f'Citizen login failed: {res_cit.text}'
    cit_token = res_cit.json()['access_token']
    cit_headers = {'Authorization': f'Bearer {cit_token}'}

    # Get Category for Pothole
    cats = requests.get(f'{BASE}/categories').json()
    pothole_cat = next(c for c in cats if 'Pothole' in c['name'])

    # Create Complaint
    comp_payload = {
        'category_id': pothole_cat['id'],
        'title': 'Crater Pothole near HSR Sector 2 Main Road',
        'description': 'Deep road cavity observed directly in vehicle path. Creates immediate accident hazard for motorists.',
        'priority': 'High',
        'latitude': 12.9123,
        'longitude': 77.6345,
        'address': 'HSR Layout Sector 2, Bengaluru',
        'image_url': '/uploads/complaints/sample_pothole.jpg',
        'ai_detected': True,
        'ai_confidence': 'High',
        'ai_reasoning_summary': 'Asphalt fracturing and cavity depth verified.'
    }
    res_create = requests.post(f'{BASE}/complaints', json=comp_payload, headers=cit_headers)
    assert res_create.status_code == 201, f'Create complaint failed: {res_create.text}'
    complaint = res_create.json()
    comp_id = complaint['id']
    tracking_id = complaint['tracking_id']
    print(f'-> Complaint Created: [{tracking_id}] assigned to {complaint["department_name"]}')

    print('\n=== 2. TEST JOURNEY D: Department Access Isolation ===')
    # Sanitation Officer logs in
    res_san = requests.post(f'{BASE}/auth/login', json={'email': 'officer.sanitation@civiclens.gov', 'password': 'Officer123!'})
    san_token = res_san.json()['access_token']
    san_headers = {'Authorization': f'Bearer {san_token}'}

    # Tries to access the Roads complaint -> MUST BE 403
    res_tamper = requests.patch(f'{BASE}/officer/complaints/{comp_id}/status', json={'status': 'Under Review', 'note': 'Illegal cross-access attempt'}, headers=san_headers)
    print(f'-> Sanitation officer cross-access attempt status code: {res_tamper.status_code} (Expected: 403)')
    assert res_tamper.status_code == 403, 'Department isolation check failed!'

    print('\n=== 3. TEST JOURNEY B: Roads Officer Resolves the Complaint ===')
    # Roads Officer logs in
    res_roads = requests.post(f'{BASE}/auth/login', json={'email': 'officer.roads@civiclens.gov', 'password': 'Officer123!'})
    roads_token = res_roads.json()['access_token']
    roads_headers = {'Authorization': f'Bearer {roads_token}'}

    # Under Review
    r1 = requests.patch(f'{BASE}/officer/complaints/{comp_id}/status', json={'status': 'Under Review', 'note': 'Field engineer dispatched for survey.'}, headers=roads_headers)
    assert r1.status_code == 200, f'Under review update failed: {r1.text}'
    print('-> Status updated to: Under Review')

    # In Progress
    r2 = requests.patch(f'{BASE}/officer/complaints/{comp_id}/status', json={'status': 'In Progress', 'note': 'Road asphalt patching roller team in action.'}, headers=roads_headers)
    assert r2.status_code == 200, f'In progress update failed: {r2.text}'
    print('-> Status updated to: In Progress')

    # Resolved with evidence
    r3 = requests.patch(f'{BASE}/officer/complaints/{comp_id}/status', json={
        'status': 'Resolved',
        'note': 'Pothole compacted with hot-mix bitumen and levelled with surrounding road.',
        'resolution_image_url': '/uploads/resolutions/res_pothole.jpg'
    }, headers=roads_headers)
    assert r3.status_code == 200, f'Resolved update failed: {r3.text}'
    resolved_comp = r3.json()
    print(f'-> Status updated to: Resolved! Resolved At: {resolved_comp["resolved_at"]}')

    print('\n=== 4. VERIFY CITIZEN TIMELINE AUDIT RECORD ===')
    r_history = requests.get(f'{BASE}/complaints/{comp_id}/history', headers=cit_headers)
    assert r_history.status_code == 200
    history = r_history.json()
    print(f'-> Total Timeline Audit Events: {len(history)}')
    for h in history:
        print(f'   - [{h["new_status"]}] {h["note"]} ({h["officer_name"]})')

    print('\nALL USER JOURNEYS EXECUTED AND VERIFIED WITH 100% SUCCESS!')

if __name__ == '__main__':
    run()
