import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:3000"

endpoints = [
    ("GET", "/meetups", None),
    ("GET", "/meetups/upcoming", None),
    ("POST", "/meetups", {"scheduled_time": "2026-05-01T10:00:00Z", "location": "Park Central"}),
    ("GET", "/users", None),
    ("GET", "/volunteer-logs/pending", None),
    ("POST", "/auth/login", {"provider": "google", "token": "dummy"}),
]

created_meetup_id = None

def test_endpoint(method, path, body=None):
    url = BASE_URL + path
    req = urllib.request.Request(url, method=method)
    if body is not None:
        req.data = json.dumps(body).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        response = urllib.request.urlopen(req)
        status = response.status
        data = response.read().decode('utf-8')
        print(f"[{method}] {path} -> {status} OK")
        if data:
            print("  ", data[:200])
        return status, data
    except urllib.error.HTTPError as e:
        data = e.read().decode('utf-8')
        print(f"[{method}] {path} -> {e.code} ERROR")
        print("  ", data[:200])
        return e.code, data
    except Exception as e:
        print(f"[{method}] {path} -> EXCEPTION: {e}")
        return 0, str(e)

print("--- Running Quick API Tests ---")
# 1. Test GET endpoints
test_endpoint("GET", "/meetups")
test_endpoint("GET", "/meetups/upcoming")
test_endpoint("GET", "/users")
test_endpoint("GET", "/volunteer-logs/pending")

# 2. Test create meetup
status, data = test_endpoint("POST", "/meetups", {"scheduled_time": "2026-05-01T10:00:00Z", "location": "Central Park"})
if status == 201:
    res_json = json.loads(data)
    created_meetup_id = res_json.get("id")

if created_meetup_id:
    # 3. Test meetup nested routes
    test_endpoint("GET", f"/meetups/{created_meetup_id}/rsvps")
    test_endpoint("PATCH", f"/meetups/{created_meetup_id}/cancel")

# 4. Auth
status, data = test_endpoint("POST", "/auth/login", {"provider": "google", "token": "dummy"})
if status == 200:
    res_json = json.loads(data)
    user_id = res_json.get("user", {}).get("id")
    if user_id:
        test_endpoint("PUT", f"/users/{user_id}/waiver", {"waiver_signed": True})
        test_endpoint("GET", f"/users/{user_id}/rsvps")
        test_endpoint("GET", f"/users/{user_id}/volunteer-logs")

print("--- Tests Finished ---")
