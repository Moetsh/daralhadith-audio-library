import requests, io, sys, base64
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN = "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"
headers = {"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
REPO = "Moetsh/daralhadith-releases"

# 1. Create release v1.22
r = requests.post(f"https://api.github.com/repos/{REPO}/releases", headers=headers, json={
    "tag_name": "v1.22",
    "name": "v1.22 - إصلاح التحديث التلقائي",
    "body": "## التحديثات\n- إصلاح نظام التحديث التلقائي (يتجاوز CORS عبر فتح المتصفح)\n- تحسين استقرار التحديث",
    "draft": False,
    "prerelease": False,
}, timeout=30)
print(f"Create release: {r.status_code}")
if not r.ok:
    print(f"  Error: {r.text[:300]}")
    sys.exit(1)

rel = r.json()
upload_url = rel["upload_url"]
browser_url = rel["html_url"]
print(f"  Release URL: {browser_url}")

# 2. Upload APK
print(f"\nUploading APK...")
with open("DarAlHadith-AudioLibrary-v1.22.apk", "rb") as f:
    apk_data = f.read()
print(f"  Size: {len(apk_data)/1024/1024:.1f} MB")

upload = upload_url.replace("{?name,label}", "?name=DarAlHadith-AudioLibrary-v1.22.apk")
r2 = requests.post(upload, headers={
    "Authorization": f"token {TOKEN}",
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Length": str(len(apk_data)),
}, data=apk_data, timeout=600)
print(f"Upload APK: {r2.status_code}")
if r2.ok:
    asset = r2.json()
    apk_url = asset["browser_download_url"]
    print(f"  APK URL: {apk_url}")
else:
    print(f"  Error: {r2.text[:300]}")
    sys.exit(1)

# 3. Update version.js
print(f"\nUpdating version.js...")
with open("server/src/routes/version.js", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace("https://github.com/Moetsh/daralhadith-releases/releases/download/v1.21/DarAlHadith-AudioLibrary-v1.21.apk", apk_url)
with open("server/src/routes/version.js", "w", encoding="utf-8") as f:
    f.write(content)
print(f"  Done. APK URL: {apk_url}")
