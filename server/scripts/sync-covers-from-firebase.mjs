/* مزامنة أغلفة الأشرطة/السلاسل/التصنيفات من قاعدة البيانات (cover_image_url) إلى الملفات المحلية
   يقرأ cover_image_url من Firebase لكل عنصر ويحمّل الصورة (مع الحفاظ على أبعادها الطبيعية، دون قصّ أو تربيع)
   ويكتبها في /covers/{id}.png ضمن المجلدات الأربعة (الويب + الوضع غير المتصل + APK). */
import { mkdirSync, writeFileSync, promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const COVER_DIRS = [
  path.join(ROOT, "dist", "covers"),
  path.join(ROOT, "public", "covers"),
  path.join(ROOT, "admin", "dist", "covers"),
  path.join(ROOT, "android", "app", "src", "main", "assets", "public", "covers"),
];

const MAX_EDGE = 1200; // أطول ضلع
const CONCURRENCY = 8;

const toArray = (obj) => (obj && typeof obj === "object" ? Object.values(obj) : []);

async function fetchJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json().catch(() => null);
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  return null;
}

async function downloadToPng(url, buf, id, outPath) {
  const img = sharp(buf);
  const meta = await img.metadata();
  let w = meta.width, h = meta.height;
  if (Math.max(w, h) > MAX_EDGE) {
    if (w >= h) { w = MAX_EDGE; h = Math.max(1, Math.round((MAX_EDGE * meta.height) / meta.width)); }
    else { h = MAX_EDGE; w = Math.max(1, Math.round((MAX_EDGE * meta.width) / meta.height)); }
  }
  await sharp(buf).resize(w, h).png().toFile(outPath);
}

async function main() {
  console.log("قراءة البيانات من Firebase ...");
  const [audiosRaw, seriesRaw, catsRaw] = await Promise.all([
    fetchJSON(`${RTDB_URL}/audios.json`),
    fetchJSON(`${RTDB_URL}/series.json`),
    fetchJSON(`${RTDB_URL}/categories.json`),
  ]);

  const jobs = [];
  for (const a of toArray(audiosRaw)) {
    if (a?.cover_image_url && (a.status == null || a.status === "published")) {
      jobs.push({ id: a.id, url: a.cover_image_url, kind: "audio" });
    }
  }
  for (const s of toArray(seriesRaw)) {
    if (s?.cover_image_url && (s.status == null || s.status === "published")) {
      jobs.push({ id: s.id, url: s.cover_image_url, kind: "series" });
    }
  }
  for (const c of toArray(catsRaw)) {
    if (c?.cover_image_url) {
      jobs.push({ id: c.id, url: c.cover_image_url, kind: "category" });
    }
  }

  console.log(`\nعناصر ذات غلاف (cover_image_url): ${jobs.length}`);
  const byKind = {};
  for (const j of jobs) byKind[j.kind] = (byKind[j.kind] || 0) + 1;
  for (const k of Object.keys(byKind)) console.log(`  ${k}: ${byKind[k]}`);

  if (jobs.length === 0) { console.log("لا يوجد أي عنصر يملك cover_image_url — لم يُكتب شيء."); return; }

  for (const d of COVER_DIRS) mkdirSync(d, { recursive: true });

  let done = 0, failed = 0;
  const failList = [];
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (j) => {
      try {
        const r = await fetch(j.url, { redirect: "follow" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        const first = path.join(COVER_DIRS[0], `${j.id}.png`);
        await downloadToPng(j.url, buf, j.id, first);
        await Promise.all(COVER_DIRS.slice(1).map((d) => fsp.copyFile(first, path.join(d, `${j.id}.png`))));
        done++;
        console.log(`  ✓ ${j.kind} ${j.id}`);
      } catch (e) {
        failed++;
        failList.push({ id: j.id, url: j.url, err: String((e && e.message) || e) });
        console.error(`  ✗ ${j.kind} ${j.id}: ${(e && e.message) || e}`);
      }
    }));
  }

  console.log(`\nتم: ${done}  فشل: ${failed}`);
  if (failList.length) {
    const report = path.join(ROOT, "server", "scripts", "cover-sync-report.json");
    writeFileSync(report, JSON.stringify(failList, null, 2));
    console.log(`سُجِّل الفشل في ${report}`);
  }
  console.log("المجلدات الأربعة حُدِّثت.");
}

main().catch((e) => { console.error(e); process.exit(1); });
