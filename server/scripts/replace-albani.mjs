/* استبدال سلسلة الهدى والنور: حذف أشرطة السلسلة القديمة (22_20230205) واستيراد
   النسخة الكاملة (1-211_202304) — 188 شريطاً بأرقامها الحقيقية */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { inspectArchive } = await import("../src/archive.js");
const { getNode, setNode, mapNode, nowISO } = await import("../src/fb.js");

const URL = "https://archive.org/details/1-211_202304";
const insp = await inspectArchive(URL);
if (!insp.ok) { console.error("inspect fail:", insp.error); process.exit(1); }

// استخراج رقم الشريط من اسم الملف: "... رقم- N.mp3"
const tapeNum = (name) => {
  const m = String(name || "").match(/رقم-?\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

const entries = insp.files.map((f) => ({ ...f, num: tapeNum(f.name) }))
  .filter((f) => f.num > 0);
console.log("ملفات:", insp.files.length, "| أشرطة مرقّمة:", entries.length);

const seriesId = "sr-" + "سلسلة-الهدى-والنور";

// 1) حذف أشرطة السلسلة القديمة
const curAudios = await mapNode("audios");
const oldCount = Object.values(curAudios).filter((a) => a.series_id === seriesId).length;
for (const [id, a] of Object.entries(curAudios)) if (a.series_id === seriesId) delete curAudios[id];
console.log("✓ حُذفت الأشرطة القديمة:", oldCount);

// 2) تحديث السلسلة
const curSeries = await mapNode("series");
const curSeriesRec = curSeries[seriesId] || {};
curSeries[seriesId] = {
  ...curSeriesRec,
  id: seriesId,
  title: "سلسلة الهدى والنور",
  scholar_id: "albani",
  category_id: "hadith",
  total_episodes: entries.length,
  is_complete: 0,
  order_direction: "asc",
  parent_id: null,
};

// 3) استيراد الأشرطة الجديدة
const base = "https://archive.org/details/" + insp.identifier;
const now = nowISO();
const audios = {};
let i = 1;
for (const f of entries) {
  audios["arch-" + insp.identifier + "-" + i] = {
    id: "arch-" + insp.identifier + "-" + i,
    title: `الهدى والنور — رقم ${f.num}`,
    scholar_id: "albani",
    category_id: "hadith",
    sub_category_id: null,
    series_id: seriesId,
    episode_number: f.num,
    description: "من: سلسلة الهدى والنور للإمام محمد ناصر الدين الألباني رحمه الله.",
    archive_url: base,
    file_url: f.url,
    duration: Math.round(f.length),
    file_size: f.size,
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
  i++;
}
Object.assign(curAudios, audios);

// 4) الكتابة
await setNode("series", curSeries);
await setNode("audios", curAudios);

console.log("✓ أُضيف:", entries.length, "شريطاً | السلسلة:", seriesId);
console.log("  بعد الاستبدال: audios=", Object.keys(curAudios).length,
  "| scholars=", Object.keys(await mapNode("scholars")).length,
  "| series=", Object.keys(curSeries).length);
const check = Object.values(curAudios).filter((a) => a.series_id === seriesId).sort((x, y) => x.episode_number - y.episode_number);
console.log("  أول:", check[0].title, "| ep:", check[0].episode_number);
console.log("  آخر:", check[check.length - 1].title, "| ep:", check[check.length - 1].episode_number);
console.log("  فجوات الأرقام:", (() => { const nums = new Set(check.map((a) => a.episode_number)); const gaps = []; for (let n = 1; n <= 211; n++) if (!nums.has(n)) gaps.push(n); return gaps.join(", "); })());
