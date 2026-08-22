import requests, json, sys, time, hashlib, os
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

ROOT = r'C:\Users\Administrator\Downloads\islamic-audio-library-development'
COVERS_DIR = os.path.join(ROOT, 'admin', 'dist', 'covers')
STATE = os.path.join(ROOT, 'upload-state.txt')

auth=json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
H={'Authorization':'Bearer '+auth['token']}
TEAM='team_a79yNDQgk50Yz7D99pEvNDhH'

done=set()
if os.path.exists(STATE):
    done = set(open(STATE,encoding='utf-8').read().splitlines())

covers=sorted(os.listdir(COVERS_DIR))
pending=[c for c in covers if c not in done]
print(f'متبقي: {len(pending)} / {len(covers)}')
if not pending:
    print('ALL_DONE'); sys.exit(0)

start=time.time()
ok=0
with open(STATE,'a',encoding='utf-8') as st:
    for name in pending:
        if time.time()-start > 65:
            print('TIME_SLICE_ENDED'); break
        buf=open(os.path.join(COVERS_DIR,name),'rb').read()
        sha=hashlib.sha1(buf).hexdigest()
        time.sleep(0.12)
        ur=requests.post('https://api.vercel.com/v2/files?teamId='+TEAM,
            headers={**H,'Content-Type':'application/octet-stream','x-vercel-digest':sha},data=buf,timeout=12)
        if ur.ok:
            st.write(name+'\n'); ok+=1
        elif ur.status_code==429:
            print('RATE_LIMIT'); break
        else:
            print('ERR',name,ur.status_code)
print(f'هذه الدفعة: {ok} | المنجز الكلي: {len(done)+ok}/{len(covers)}')
