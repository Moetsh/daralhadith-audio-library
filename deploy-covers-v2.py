import requests, json, sys, time, hashlib, os
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

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

# 1. أساس من النشر السليم (بدون بادئة src/ عند الإرسال)
r=requests.get('https://api.vercel.com/v13/deployments/dpl_Af8VQsa4Zf3iytSRPnxzJv5wXFie/files?teamId='+TEAM,headers=H,timeout=30)
files={}
for path,sha in flatten(r.json()):
    bare=path[4:] if path.startswith('src/') else path
    if bare.startswith('admin/dist/covers/'): continue
    files[bare]=sha
print('أساس:', len(files))

# 2. ارفع الأغلفة المتغيرة فقط
known=set(files.values())
covers=os.listdir(COVERS_DIR)
up=0; skip=0; failed=[]
for i,name in enumerate(covers):
    buf=open(os.path.join(COVERS_DIR,name),'rb').read()
    sha=hashlib.sha1(buf).hexdigest()
    rel='admin/dist/covers/'+name
    files[rel]=sha
    if sha in known: skip+=1; continue
    ur=requests.post('https://api.vercel.com/v2/files?teamId='+TEAM,
        headers={**H,'Content-Type':'application/octet-stream','x-vercel-digest':sha},data=buf,timeout=60)
    if not ur.ok:
        failed.append(name)
        if ur.status_code==429:
            print('RATE LIMIT عند', i); break
    else: up+=1
    if up%100==0: print('  رُفع',up)
print(f'رُفع {up} | متطابق {skip} | فشل {len(failed)}')
if failed: print(failed[:5])

if up>0 or skip>0:
    body={'name':'daralhadith','project':PID,'target':'production','version':2,
          'files':[{'file':k,'sha':v} for k,v in files.items()]}
    r3=requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}',headers={**H,'Content-Type':'application/json'},json=body,timeout=60)
    print('Deploy:', r3.status_code)
    if not r3.ok:
        print(r3.text[:400]); sys.exit(1)
    did=r3.json()['id']
else:
    print('لا تغييرات — لا نشر'); sys.exit(0)

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
