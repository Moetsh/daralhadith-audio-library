import requests, json, io, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

auth = json.load(open(r'C:\Users\Administrator\AppData\Roaming\xdg.data\com.vercel.cli\auth.json'))
token = auth['token']
TEAM = 'team_a79yNDQgk50Yz7D99pEvNDhH'
PID = 'prj_ldP8K1JBqbQjuLQaNKSNhCy36Q5T'

# Use the source deployment from the GOOD working deployment (c2dgnempn)
# which was deployment #2 in our list (the one before our broken attempts)
print("Finding source deployment...")
r = requests.get(f'https://api.vercel.com/v6/deployments?teamId={TEAM}&projectId={PID}&limit=15',
    headers={'Authorization': f'Bearer {token}'}, timeout=30)
deps = r.json().get('deployments', [])

# Skip our broken ones AND the one that already has stripped src/
# We need the ORIGINAL good one with src/ prefix
broken = ['daralhadith-qlwfcrmdp', 'daralhadith-nd8gmypex', 'daralhadith-iziayq5zk']
source_dep = None
for d in deps:
    skip = any(d['url'].startswith(b) for b in broken)
    if not skip and d.get('readyState') == 'READY':
        source_dep = d
        break

if not source_dep:
    print("No working deployment found!")
    sys.exit(1)

print(f"Using: {source_dep['url']}")
uid = source_dep['uid']

# 2. Get ALL files
print("Fetching file tree...")
r2 = requests.get(f'https://api.vercel.com/v6/deployments/{uid}/files?teamId={TEAM}',
    headers={'Authorization': f'Bearer {token}'}, timeout=30)
tree = r2.json()

def flatten(node, prefix=''):
    results = []
    if node['type'] == 'file':
        results.append({'file': prefix + node['name'], 'sha': node['uid']})
    elif node['type'] == 'directory':
        for child in node.get('children', []):
            results.extend(flatten(child, prefix + node['name'] + '/'))
    return results

files = []
for item in tree:
    files.extend(flatten(item))

print(f"Total files: {len(files)}")

# Check what prefix they have
prefixes = set()
for f in files[:5]:
    parts = f['file'].split('/')
    prefixes.add(parts[0])
    print(f"  Sample: {f['file']}")
print(f"Root prefixes: {prefixes}")

# 3. Strip the leading "src/" prefix (Vercel adds this to files inside src/)
# The files are like: src/admin/dist/..., src/api/index.js, src/vercel.json
# We need: admin/dist/..., api/index.js, vercel.json
new_version_sha = '546994c6c5d8bad12ace62fe626fe075550d1eed'
updated = []
replaced = False
for f in files:
    path = f['file']
    # Strip first "src/" prefix
    if path.startswith('src/'):
        path = path[4:]
    
    if path == 'server/src/routes/version.js':
        updated.append({'file': path, 'sha': new_version_sha})
        replaced = True
        print(f"  -> Replaced {path} with v1.22")
    else:
        updated.append({'file': path, 'sha': f['sha']})

if not replaced:
    print("ERROR: version.js not found after stripping!")
    # Check what paths exist
    for f in updated:
        if 'version' in f['file']:
            print(f"  Found: {f['file']}")
    sys.exit(1)

# Show key files
print("\nKey files after stripping:")
for f in updated:
    if any(k in f['file'] for k in ['vercel.json', 'version.js', 'api/index.js']):
        print(f"  {f['file']}")

print(f"\nDeploying {len(updated)} files...")
body = {
    'name': 'daralhadith',
    'project': PID,
    'target': 'production',
    'version': 2,
    'files': updated,
}
r3 = requests.post(f'https://api.vercel.com/v13/deployments?teamId={TEAM}',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json=body, timeout=30)
print(f"Deploy: {r3.status_code}")
if r3.ok:
    dep = r3.json()
    did = dep['id']
    print(f"ID: {did}")
    for i in range(90):
        time.sleep(5)
        r4 = requests.get(f'https://api.vercel.com/v13/deployments/{did}?teamId={TEAM}',
            headers={'Authorization': f'Bearer {token}'}, timeout=30)
        if not r4.ok:
            continue
        d = r4.json()
        st = d.get('readyState', '?')
        print(f"  [{i*5}s] {st}")
        if st == 'READY':
            print(f"\nSUCCESS: https://{d['url']}")
            break
        if st == 'ERROR':
            print(f"\nFAILED: {d.get('errorMessage','?')}")
            break
else:
    print(r3.text[:500])
