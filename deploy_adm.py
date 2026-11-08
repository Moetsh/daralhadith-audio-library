import requests, json, sys, time, hashlib, os
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'C:\Users\Administrator\Downloads\islamic-audio-library-development'
auth=json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
H={'Authorization':'Bearer '+auth['token']}
TEAM='team_a79yNDQgk50Yz7D99pEvNDhH'
PID='prj_dyfATF1oLzDPLzEirG8QlpixNR3n'  # islamic-audio-library-development

def upload_file(full_path):
    """Upload a local file, return (rel path, sha)"""
    buf = open(full_path, 'rb').read()
    sha = hashlib.sha1(buf).hexdigest()
    r = requests.post('https://api.vercel.com/v2/files?teamId=' + TEAM,
        headers={**H, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha},
        data=buf, timeout=60)
    rel = os.path.relpath(full_path, ROOT).replace('\\', '/')
    return rel, sha, r.status_code

files = {}

# 1) vercel.json
k, sha, sc = upload_file(os.path.join(ROOT, 'vercel.json'))
files[k] = sha; print(f'vercel.json: {sc}')

# 2) api/index.js
k, sha, sc = upload_file(os.path.join(ROOT, 'api', 'index.js'))
files[k] = sha; print(f'api/index.js: {sc}')

# 3) server/src/** (all server files including terabox.js)
sv = os.path.join(ROOT, 'server', 'src')
for root, dirs, fnames in os.walk(sv):
    for fn in fnames:
        full = os.path.join(root, fn)
        k, sha, sc = upload_file(full)
        files[k] = sha
print(f'server/src: {len([k for k in files if k.startswith("server/src/")])} files')

# 4) package.json + package-lock.json + server/package.json
for pkg in ['package.json', 'package-lock.json', 'server/package.json']:
    full = os.path.join(ROOT, pkg)
    if os.path.exists(full):
        k, sha, sc = upload_file(full)
        files[k] = sha; print(f'{pkg}: {sc}')

# 5) dist/** (main app) - skip covers folder
dd = os.path.join(ROOT, 'dist')
if os.path.exists(dd):
    for root, dirs, fnames in os.walk(dd):
        if 'covers' in root.replace('\\','/'):
            continue
        for fn in fnames:
            full = os.path.join(root, fn)
            k, sha, sc = upload_file(full)
            files[k] = sha
    print(f'dist: {len([k for k in files if k.startswith("dist/")])} files')

# 5b) apk/** (استضافة APK مباشرة على النطاق، خارج dist كي لا يمسحها vite)
apkd = os.path.join(ROOT, 'apk')
if os.path.exists(apkd):
    for root, dirs, fnames in os.walk(apkd):
        for fn in fnames:
            full = os.path.join(root, fn)
            k, sha, sc = upload_file(full)
            files[k] = sha
    print(f'apk: {len([k for k in files if k.startswith("apk/")])} files')

# 6) admin/dist/** (dashboard) - skip covers folder
ad = os.path.join(ROOT, 'admin', 'dist')
if os.path.exists(ad):
    for root, dirs, fnames in os.walk(ad):
        if 'covers' in root.replace('\\','/'):
            continue
        for fn in fnames:
            full = os.path.join(root, fn)
            k, sha, sc = upload_file(full)
            files[k] = sha
    print(f'admin/dist: {len([k for k in files if k.startswith("admin/dist/")])} files')

print(f'\n--- total files: {len(files)} ---')

# deploy
print('\n--- deploy ---')
body={'name':'islamic-audio-library-development','project':PID,'target':'production','version':2,
      'files':[{'file':k,'sha':v} for k,v in files.items()]}
r3=requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}',headers={**H,'Content-Type':'application/json'},json=body,timeout=60)
print('Deploy:', r3.status_code)
if not r3.ok: print(r3.text[:800]); sys.exit(1)
did=r3.json()['id']
for i in range(40):
    time.sleep(4)
    r4=requests.get(f'https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}',headers=H,timeout=30)
    if not r4.ok: continue
    st=r4.json().get('readyState','?')
    if st in ('READY','ERROR'):
        print(st)
        if st=='READY': print('https://'+r4.json()['url'])
        else: print(r4.json().get('errorMessage'))
        break
