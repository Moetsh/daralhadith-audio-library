/* إضافة سلسلة الهدى والنور — الإمام الألباني (22_20230205) إلى Firebase
   أرقام الأشرطة الحقيقية محفوظة (95 شريطاً بأرقام غير متسلسلة) */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { inspectArchive } = await import("../src/archive.js");
const { getNode, setNode, mapNode, nowISO } = await import("../src/fb.js");

const URL = "https://archive.org/details/22_20230205";
const insp = await inspectArchive(URL);
if (!insp.ok) { console.error("inspect fail:", insp.error); process.exit(1); }

// استخراج رقم الشريط من العنوان: "... رقم- N" أو "... رقم-N"
const tapeNum = (title) => {
  const m = String(title || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

const entries = insp.files.map((f) => ({ ...f, num: tapeNum(f.title) }));

// 1) الشيخ
const scholar = {
  id: "albani",
  name: "محمد ناصر الدين الألباني",
  bio: "محدث العصر، من كبار علماء الحديث في القرن العشرين، صاحب سلسلة الهدى والنور العظيمة في الدرس العلمي.",
  specialization: "محدث العصر",
  country: "سوريا",
  status: "active",
  is_featured: 0,
};

// 2) السلسلة
const seriesTitle = "سلسلة الهدى والنور";
const seriesId = "sr-" + "سلسلة-الهدى-والنور";
const series = {
  id: seriesId,
  title: seriesTitle,
  scholar_id: "albani",
  category_id: "hadith",
  total_episodes: entries.length,
  is_complete: 0,
  order_direction: "asc",
  parent_id: null,
};

// 3) الأشرطة
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

// 4) الدمج والكتابة
const curScholars = await mapNode("scholars");
const curSeries = await mapNode("series");
const curAudios = await mapNode("audios");

curScholars[scholar.id] = scholar;
curSeries[seriesId] = series;
Object.assign(curAudios, audios);

await setNode("scholars", curScholars);
await setNode("series", curSeries);
await setNode("audios", curAudios);

console.log("✓ أضيف:", entries.length, "شريطاً | السلسلة:", seriesId);
console.log("  بعد الإضافة: audios=", Object.keys(curAudios).length,
  "| scholars=", Object.keys(curScholars).length,
  "| series=", Object.keys(curSeries).length);
const check = Object.values(curAudios).filter((a) => a.series_id === seriesId);
console.log("  عينة:", check[0].title, "| ep:", check[0].episode_number, "|", check[check.length - 1].title, "| ep:", check[check.length - 1].episode_number);
