import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')
auth=json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
H={'Authorization':'Bearer '+auth['token']}
TEAM='team_a79yNDQgk50Yz7D99pEvNDhH'

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

def get_files(uid):
    r=requests.get(f'https://api.vercel.com/v13/deployments/{uid}/files?teamId={TEAM}',headers=H,timeout=30)
    return dict(flatten(r.json()))

# النشر الجديد المعطوب
r=requests.get(f'https://api.vercel.com/v6/deployments?teamId={TEAM}&projectId=prj_ldP8K1JBqbQjuLQaNKSNhCy36Q5T&limit=3',headers=H,timeout=30)
deps=r.json()['deployments']
newest=[d for d in deps if d['uid']!='dpl_Af8VQsa4Zf3iytSRPnxzJv5wXFie'][:2]
for d in newest:
    print(d['uid'], d['url'], d.get('readyState'))

broken=newest[0]['uid']
old=get_files('dpl_Af8VQsa4Zf3iytSRPnxzJv5wXFie')
new=get_files(broken)

print('old:',len(old),' broken:',len(new))
missing=set(old)-set(new)
added=set(new)-set(old)
print('مفقود في المعطوب:',len(missing))
for m in sorted(missing)[:15]: print('  -',m)
print('مضاف جديد:',len(added))
for m in sorted(added)[:5]: print('  +',m)
