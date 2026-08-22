import requests, json, sys, time, hashlib, os
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'C:\Users\Administrator\Downloads\islamic-audio-library-development'
COVERS_DIR = os.path.join(ROOT, 'admin', 'dist', 'covers')

auth=json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
H={'Authorization':'Bearer '+auth['token']}
TEAM='team_a79yNDQgk50Yz7D99pEvNDhH'
PID='prj_ldP8K1JBqbQjuLQaNKSNhCy36Q5T'

def flatten(node, prefix=''):
    out=[]
    if isinstance(node, dict):
        if node.get('type')=='file':
            out.append((prefix+node['name'], node.get('uid') or node.get('sha')))
        else:
            for c in node.get('children') or []:
                out.extend(flatten(c, prefix+node['name']+'/'))
    elif isinstance(node, list):
        for x in node: out.extend(flatten(x, prefix))
    return out

# 1. ملفات النشر السليم — أزيل بادئة src/ قبل الإرسال
r=requests.get('https://api.vercel.com/v13/deployments/dpl_Af8VQsa4Zf3iytSRPnxzJv5wXFie/files?teamId='+TEAM,headers=H,timeout=30)
pairs=flatten(r.json())
files={}
for path,sha in pairs:
    bare=path[4:] if path.startswith('src/') else path
    if bare.startswith('admin/dist/covers/'): continue  # الأغلفة سنأخذها من المحلي
    files[bare]=sha
print('ملفات أساسية:', len(files))

# 2. الأغلفة من المحلي (SHA محسوب = المرفوع سابقاً)
covers=os.listdir(COVERS_DIR)
for name in covers:
    buf=open(os.path.join(COVERS_DIR,name),'rb').read()
    files['admin/dist/covers/'+name]=hashlib.sha1(buf).hexdigest()
print('بعد إضافة الأغلفة:', len(files))

# 3. انشر
body={'name':'daralhadith','project':PID,'target':'production','version':2,
      'files':[{'file':k,'sha':v} for k,v in files.items()]}
r3=requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}',headers={**H,'Content-Type':'application/json'},json=body,timeout=60)
print('Deploy:', r3.status_code)
if not r3.ok:
    print(r3.text[:400]); sys.exit(1)
did=r3.json()['id']

for i in range(60):
    time.sleep(5)
    r4=requests.get(f'https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}',headers=H,timeout=30)
    if not r4.ok: continue
    st=r4.json().get('readyState','?')
    print(f'  [{i*5}s] {st}')
    if st=='READY':
        print('\nSUCCESS: https://'+r4.json()['url']); break
    if st=='ERROR':
        print('\nFAILED:', r4.json().get('errorMessage','?')); sys.exit(1)
