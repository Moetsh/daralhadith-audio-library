import requests, json, sys, time, hashlib, os
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'C:\Users\Administrator\Downloads\islamic-audio-library-development'
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

# أحدث deployment جاهز كمصدر
r=requests.get(f'https://api.vercel.com/v6/deployments?teamId={TEAM}&projectId={PID}&limit=5',headers=H,timeout=30)
src=next(d for d in r.json()['deployments'] if d.get('readyState')=='READY')
print('المصدر:', src['url'])
r2=requests.get(f"https://api.vercel.com/v13/deployments/{src['uid']}/files?teamId={TEAM}",headers=H,timeout=30)
files={}
for path,sha in flatten(r2.json()):
    bare=path[4:] if path.startswith('src/') else path
    files[bare]=sha
print('أساس:', len(files))

# ارفع version.js الجديد
buf=open(os.path.join(ROOT,'server','src','routes','version.js'),'rb').read()
sha=hashlib.sha1(buf).hexdigest()
ur=requests.post('https://api.vercel.com/v2/files?teamId='+TEAM,
    headers={**H,'Content-Type':'application/octet-stream','x-vercel-digest':sha},data=buf,timeout=30)
print('version.js:', ur.status_code)
files['server/src/routes/version.js']=sha

body={'name':'daralhadith','project':PID,'target':'production','version':2,
      'files':[{'file':k,'sha':v} for k,v in files.items()]}
r3=requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}',headers={**H,'Content-Type':'application/json'},json=body,timeout=60)
print('Deploy:', r3.status_code)
if not r3.ok: print(r3.text[:300]); sys.exit(1)
did=r3.json()['id']
for i in range(40):
    time.sleep(4)
    r4=requests.get(f'https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}',headers=H,timeout=30)
    if not r4.ok: continue
    st=r4.json().get('readyState','?')
    if st in ('READY','ERROR'):
        print(st); print('https://'+r4.json()['url'] if st=='READY' else r4.json().get('errorMessage')); break
