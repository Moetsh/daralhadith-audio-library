import requests, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RTDB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app"
API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE"
EMAIL = "firebase-admin@daralhadith.app"
PASS = "Dh_260ed374ead4c4fc9b4ecafe31707656"
SERIES_ID = "sr-سلسلة-الهدى-والنور"

s = requests.Session()
r = s.post(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    json={"email": EMAIL, "password": PASS, "returnSecureToken": True}, timeout=30)
token = r.json()["idToken"]

r = s.get(f"{RTDB}/audios.json?auth={token}", timeout=60)
all_audios = r.json() or {}

hedaya = {k: v for k, v in all_audios.items() if v.get("series_id") == SERIES_ID}
print(f"Total Hedaya: {len(hedaya)}")

alalbany = {k: v for k, v in hedaya.items() if "al-albany.com" in v.get("file_url", "")}
print(f"al-albany.com entries: {len(alalbany)}")

for ep in sorted(alalbany.values(), key=lambda x: x.get("episode_number", 0)):
    print(f"  ep {ep.get('episode_number'):>3} | {ep.get('id')}")

print(f"\nDeleting all {len(alalbany)} al-albany entries...")

deleted = 0
for k, v in alalbany.items():
    ep = v.get("episode_number", 0)
    r2 = s.delete(f"{RTDB}/audios/{k}.json?auth={token}", timeout=30)
    if r2.ok:
        deleted += 1
    else:
        print(f"  FAILED ep {ep}: {r2.status_code} {r2.text[:100]}")

print(f"\nDeleted: {deleted}/{len(alalbany)}")
