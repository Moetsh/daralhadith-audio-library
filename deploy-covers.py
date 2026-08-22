import requests, json, io, sys, time, hashlib, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = r'C:\Users\Administrator\Downloads\islamic-audio-library-development'
COVERS_DIR = os.path.join(ROOT, 'admin', 'dist', 'covers')

auth = json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
token = auth['token']
TEAM = 'team_a79yNDQgk50Yz7D99pEvNDhH'
PID = 'prj_ldP8K1JBqbQjuLQaNKSNhCy36Q5T'
H = {'Authorization': f'Bearer {token}'}

# 1. آخر deployment إنتاجي
r = requests.get(f'https://api.vercel.com/v6/deployments?teamId={TEAM}&projectId={PID}&limit=10', headers=H, timeout=30)
deps = r.json().get('deployments', [])
source = next((d for d in deps if d.get('readyState') == 'READY'), None)
if not source:
    print('لا يوجد deployment جاهز!'); sys.exit(1)
print('المصدر:', source['url'])

# 2. ملفاته (مسطحة)
r2 = requests.get(f"https://api.vercel.com/v13/deployments/{source['uid']}/files?teamId={TEAM}", headers=H, timeout=30)

def flatten(node, prefix=''):
    out = []
    if isinstance(node, dict):
        if node.get('type') == 'file':
            out.append({'file': prefix + node['name'], 'sha': node.get('uid') or node.get('sha')})
        for c in node.get('children', []) if isinstance(node.get('children'), list) else []:
            out.extend(flatten(c, prefix + node['name'] + '/') if node.get('type') == 'directory' else [])
    elif isinstance(node, list):
        for item in node:
            out.extend(flatten(item, prefix))
    return out

tree = r2.json()
files = flatten(tree)
# إن كانت الاستجابة مسطحة أصلاً
if not files and isinstance(tree, list):
    files = [{'file': f.get('name',''), 'sha': f.get('uid') or f.get('sha')} for f in tree if f.get('type')=='file']
print(f"ملفات المصدر: {len(files)}")

# 3. ارفع الأغلفة الجديدة
covers = sorted(os.listdir(COVERS_DIR))
print(f"أغلفة للرفع: {len(covers)}")
new_entries = []
uploaded = 0
for i, name in enumerate(covers):
    path = os.path.join(COVERS_DIR, name)
    buf = open(path, 'rb').read()
    sha = hashlib.sha1(buf).hexdigest()
    # تجاوز إذا الـ SHA موجود أصلاً في المصدر (نادر لكن ممكن)
    rel = 'admin/dist/covers/' + name
    if any(f['file'] == rel and f['sha'] == sha for f in files):
        new_entries.append({'file': rel, 'sha': sha})
        continue
    ur = requests.post('https://api.vercel.com/v2/files?teamId=' + TEAM,
        headers={**H, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha},
        data=buf, timeout=60)
    if not ur.ok:
        print(f"فشل رفع {name}: {ur.status_code} {ur.text[:120]}")
        if ur.status_code == 429:
            print('RATE LIMIT — توقف'); sys.exit(2)
        continue
    uploaded += 1
    new_entries.append({'file': rel, 'sha': sha})
    if uploaded % 100 == 0:
        print(f'  رُفع {uploaded}...')
print(f"رُفع فعلياً: {uploaded}")

# 4. ادمج (تجاهل أي admin/dist/covers قديمة من المصدر)
kept = [f for f in files if not f['file'].startswith('admin/dist/covers/')]
final_files = kept + new_entries
print(f"إجمالي ملفات النشر: {len(final_files)}")

body = {
    'name': 'daralhadith',
    'project': PID,
    'target': 'production',
    'version': 2,
    'files': final_files,
}
r3 = requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}', headers={**H, 'Content-Type': 'application/json'}, json=body, timeout=60)
print('Deploy:', r3.status_code)
if not r3.ok:
    print(r3.text[:400]); sys.exit(1)

did = r3.json()['id']
for i in range(90):
    time.sleep(5)
    r4 = requests.get(f'https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}', headers=H, timeout=30)
    if not r4.ok: continue
    st = r4.json().get('readyState', '?')
    print(f'  [{i*5}s] {st}')
    if st == 'READY':
        print('\nSUCCESS: https://' + r4.json()['url']); break
    if st == 'ERROR':
        print('\nFAILED:', r4.json().get('errorMessage','?')); break
