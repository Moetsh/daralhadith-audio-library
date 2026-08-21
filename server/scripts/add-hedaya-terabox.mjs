/* استيراد حلقات الهدى والنور (502-701) من TeraBox إلى Firebase
   يستخدم كوكيز المستخرجة من CDP + API share/list للحصول على dlinks مباشرة */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { getNode, setNode, mapNode, nowISO } = await import("../src/fb.js");

const SERIES_ID = "sr-سلسلة-الهدى-والنور";

// Load cookies from CDP extraction
const cookieFile = path.join(process.env.TEMP || process.env.LOCALAPPDATA || ".", "terabox_cookies_cdp.json");
const cookies = JSON.parse(fs.readFileSync(cookieFile, "utf-8"));
const cookieDict = Object.fromEntries(cookies.map((c) => [c.name, c.value]));
const COOKIE = Object.entries(cookieDict).map(([k, v]) => `${k}=${v}`).join("; ");
console.log("cookies loaded:", Object.keys(cookieDict).join(", "));
console.log("has ndus:", "ndus" in cookieDict);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.terabox.com/",
  "Cookie": COOKIE,
};

// Read file lists
const readFiles = (filePath) => {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter((x) => x.trim());
  return lines.map((l) => {
    const [fname, fs_id, size] = l.split("|").map((s) => s.trim());
    const ep = parseInt(fname.replace(/[^0-9].*/, ""), 10);
    return { fname, fs_id: fs_id, size: parseInt(size, 10) || 0, ep };
  });
};

const teraboxRoot = path.resolve(__dirname, "../..");
const FILES = [
  ...readFiles(path.join(teraboxRoot, "terabox_files.txt")).map((f) => ({ ...f, surl: "GGuXTwl4sPtyM_LStfI5YA" })),
  ...readFiles(path.join(teraboxRoot, "terabox_files_601-700.txt")).map((f) => ({ ...f, surl: "GtsMYoMaNvYSSDQDLQTezw" })),
];
console.log(`files loaded: ${FILES.length} (${FILES.filter((f) => f.surl === "GGuXTwl4sPtyM_LStfI5YA").length} + ${FILES.filter((f) => f.surl === "GtsMYoMaNvYSSDQDLQTezw").length})`);

// Fetch jsToken from page
async function getJsToken(surl) {
  const r = await fetch(`https://www.terabox.com/sharing/link?surl=${surl}`, { headers: HEADERS });
  const html = await r.text();
  const m = html.match(/fn%28%22([A-F0-9]+)%22/) || html.match(/fn\("([A-F0-9]+)"\)/);
  return m ? m[1] : "";
}

// Fetch dlinks for a share link via share/list
async function getDlinks(surl, dir) {
  const jsToken = await getJsToken(surl);
  const infoR = await fetch(`https://www.terabox.com/api/shorturlinfo?shorturl=1${surl}&root=1&jsToken=${jsToken}`, { headers: HEADERS });
  const info = await infoR.json();
  if (info.errno !== 0 || !info.list?.[0]) {
    console.error(`  shorturlinfo fail ${surl}: errno=${info.errno}`);
    return [];
  }
  const { shareid, uk } = info.list[0];

  const allFiles = [];
  for (let page = 1; page <= 10; page++) {
    const params = new URLSearchParams({
      shareid, uk, page: String(page), num: "100",
      dir, root: "0", jsToken,
    });
    const r = await fetch(`https://www.terabox.com/share/list?${params}`, { headers: HEADERS });
    const data = await r.json();
    if (data.errno !== 0 || !data.list?.length) break;
    allFiles.push(...data.list);
    if (data.list.length < 100) break;
  }
  console.log(`  ${surl}: ${allFiles.length} files from ${dir}`);
  return allFiles;
}

// Get dlinks for both share links
const dlinksMap = new Map(); // ep -> dlink
const sz1 = "/500-600";
const sz2 = "/601-700";

console.log("\nfetching dlinks from link1...");
const link1Files = await getDlinks("GGuXTwl4sPtyM_LStfI5YA", sz1);
for (const f of link1Files) {
  const ep = parseInt(f.server_filename.replace(/[^0-9].*/, ""), 10);
  if (f.dlink && ep > 0) dlinksMap.set(ep, { dlink: f.dlink, fs_id: f.fs_id, size: f.size || 0 });
}

console.log("fetching dlinks from link2...");
const link2Files = await getDlinks("GtsMYoMaNvYSSDQDLQTezw", sz2);
for (const f of link2Files) {
  const ep = parseInt(f.server_filename.replace(/[^0-9].*/, ""), 10);
  if (f.dlink && ep > 0) dlinksMap.set(ep, { dlink: f.dlink, fs_id: f.fs_id, size: f.size || 0 });
}
console.log(`dlinks collected: ${dlinksMap.size}`);

// Check which episodes already exist
const existing = await mapNode("audios");
const existingEps = new Set();
for (const a of Object.values(existing)) {
  if (a.series_id === SERIES_ID && Number(a.episode_number) > 0) existingEps.add(Number(a.episode_number));
}

// Add episodes
const now = nowISO();
let added = 0;
let skipped = 0;
let noLink = 0;

for (const f of FILES) {
  if (existingEps.has(f.ep)) { skipped++; continue; }
  const id = `arch-terabox-${f.surl.slice(0, 6)}-${f.ep}`;
  if (await getNode("audios/" + id)) { skipped++; continue; }

  const dl = dlinksMap.get(f.ep);
  if (!dl || !dl.dlink) { noLink++; continue; }

  const rec = {
    id,
    title: `الهدى والنور — رقم ${f.ep}`,
    scholar_id: "albani",
    category_id: "hadith",
    sub_category_id: null,
    series_id: SERIES_ID,
    episode_number: f.ep,
    description: "من: سلسلة الهدى والنور للإمام محمد ناصر الدين الألباني رحمه الله.",
    archive_url: "https://1024terabox.com/s/" + f.surl,
    file_url: dl.dlink,
    duration: 0,
    file_size: dl.size || f.size,
    bitrate: null,
    cover_image_url: null,
    tags: "[]",
    status: "published",
    is_featured: 0,
    allow_download: 1,
    listen_count: 0,
    download_count: 0,
    added_days: 0,
    created_at: now,
    updated_at: now,
    published_at: now,
  };
  await setNode("audios/" + id, rec);
  existingEps.add(f.ep);
  added++;
  if (added % 10 === 0) console.log(`  ... ${added} added`);
}

// Update series total_episodes
const series = await getNode("series/" + SERIES_ID);
if (series) {
  const maxEp = Math.max(...existingEps);
  await setNode("series/" + SERIES_ID, { ...series, total_episodes: maxEp });
  console.log(`\ntotal_episodes updated: ${maxEp}`);
}

console.log(`\n✓ أُضيف ${added} شريطاً | تجاوز ${skipped} مكرراً | فشل بلا رابط ${noLink}`);
