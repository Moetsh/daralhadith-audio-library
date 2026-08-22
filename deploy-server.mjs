import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "C:/Users/Administrator/Downloads/islamic-audio-library-development";
const API = "https://api.vercel.com";

const auth = JSON.parse(
  fs.readFileSync(
    path.join(process.env.APPDATA, "xdg.data", "com.vercel.cli", "auth.json"),
    "utf8"
  )
);
const TOKEN = auth.token;
const TEAM = "team_a79yNDQgk50Yz7D99pEvNDhH";

const roots = [
  "vercel.json",
  "package.json",
  "package-lock.json",
  "api/index.js",
  "server/package.json",
  "server/src",
];

function isAllowed(p) {
  for (const r of roots) {
    const full = path.join(ROOT, r);
    const abs = path.resolve(full);
    const fileAbs = path.resolve(path.join(ROOT, p));
    if (fileAbs === abs || fileAbs.startsWith(abs + path.sep)) return true;
  }
  return false;
}

function collectFiles() {
  const out = [];
  const seen = new Set();
  function walk(rel) {
    const abs = path.join(ROOT, rel);
    if (!isAllowed(rel)) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      for (const ent of fs.readdirSync(abs)) walk(path.join(rel, ent));
    } else {
      const key = rel.replace(/\\/g, "/");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  for (const r of roots) walk(r);
  return out;
}

const files = collectFiles();
console.log(`Server files only: ${files.length}`);

const shaOf = (rel) => {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return crypto.createHash("sha1").update(buf).digest("hex");
};

const fileMeta = files.map((f) => ({ file: f.replace(/\\/g, "/"), sha: shaOf(f) }));

async function upload(meta) {
  const buf = fs.readFileSync(path.join(ROOT, meta.file));
  const res = await fetch(`${API}/v2/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": meta.sha,
    },
    body: buf,
  });
  if (!res.ok && res.status !== 200) {
    const t = await res.text();
    throw new Error(`upload ${meta.file} failed: ${res.status} ${t.slice(0,200)}`);
  }
  return res.status;
}

const CONC = 4;
let idx = 0;
let failed = 0;
const worker = async () => {
  while (idx < fileMeta.length) {
    const meta = fileMeta[idx++];
    try {
      const st = await upload(meta);
      if (st === 200) console.log(`  [ok] ${meta.file}`);
      else console.log(`  [cached] ${meta.file}`);
    } catch (e) {
      console.error(`  [ERR] ${meta.file}: ${e.message}`);
      failed++;
    }
  }
};
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`\nFiles processed: ${fileMeta.length}, failed: ${failed}`);

const body = {
  name: "daralhadith",
  project: "daralhadith",
  target: "production",
  version: 2,
  files: fileMeta.map(({ file, sha }) => ({ file, sha })),
};

const res = await fetch(`${API}/v13/deployments?teamId=${TEAM}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`Deploy status: ${res.status}`);
if (!res.ok) {
  console.error(text.slice(0, 500));
  process.exit(1);
}
const dep = JSON.parse(text);
console.log(`Deploy ID: ${dep.id}`);
console.log(`URL: https://${dep.url}`);

const id = dep.id;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const r2 = await fetch(`${API}/v13/deployments/${id}?teamId=${TEAM}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r2.ok) continue;
  const d = await r2.json();
  const st = d.readyState || d.status;
  console.log(`  status: ${st}`);
  if (st === "READY" || st === "ERROR") {
    console.log(`Final: https://${d.url}`);
    process.exit(st === "ERROR" ? 1 : 0);
  }
}
console.log("Timed out.");
process.exit(1);
