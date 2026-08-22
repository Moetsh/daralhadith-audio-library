import requests, io, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT = "daralhadith-8e2c5"
API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE"

# Find credentials from env or use defaults
import os
EMAIL = os.environ.get("FIREBASE_AUTH_EMAIL", "")
PASS = os.environ.get("FIREBASE_AUTH_PASSWORD", "")

if not EMAIL:
    print("Need FIREBASE_AUTH_EMAIL and FIREBASE_AUTH_PASSWORD env vars")
    sys.exit(1)

s = requests.Session()

# Sign in
r = s.post(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    json={"email": EMAIL, "password": PASS, "returnSecureToken": True}, timeout=30)
if not r.ok:
    print(f"Auth failed: {r.status_code} {r.text[:200]}")
    sys.exit(1)
token = r.json()["idToken"]
print(f"Signed in as {EMAIL}")

# Write version config to Firebase RTDB
RTDB = f"https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app"
config = {
    "version": "1.22",
    "apk_url": "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.22/DarAlHadith-AudioLibrary-v1.22.apk",
    "release_notes": "إصلاح نظام التحديث التلقائي"
}
r2 = requests.put(f"{RTDB}/app_config/latest.json?auth={token}",
    json=config, timeout=30)
print(f"Write config: {r2.status_code}")
if r2.ok:
    print(f"  Set version to 1.22")
    print(f"  APK URL updated")
else:
    print(f"  Error: {r2.text[:300]}")
