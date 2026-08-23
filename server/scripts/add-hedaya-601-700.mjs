/* استيراد حلقات الهدى والنور (601-700) من Internet Archive إلى Firebase */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { getNode, setNode, mapNode, nowISO } = await import("../src/fb.js");

const SERIES_ID = "sr-سلسلة-الهدى-والنور";
const ARCHIVE_ID = "699-01_202608";
const BASE_URL = `https://archive.org/download/${ARCHIVE_ID}/601-700`;
const ARCHIVE_URL = `https://archive.org/details/${ARCHIVE_ID}`;

const TITLES = {
  607: "مناقشة في التفريق بين الطائفة المنصورة والفرقة الناجية",
  612: "الإنصاف عند الإمام الألباني — الشريط الأول",
  613: "الإنصاف عند الإمام الألباني — الشريط الثاني",
  614: "الإنصاف عند الإمام الألباني — الشريط الثالث",
  629: "حوار بين الإمام الألباني والشيخ محمد موسىنصر حول علم القراءات",
  661: "عجائب وغرائب عن جماعة الإخوان المسلمين ومحاربتهم للإمام الألباني",
  666: "الترحم على أصحاب المخالفات العقدية كابن حجر والنوي وسيد قطب",
  670: "فتنة التكفير 1 — منهج السلف والتكفير — إبراهيم الهاشمي",
  671: "فتنة التكفير 2 — حكم الأغتيالات — إبراهيم الهاشمي",
  672: "فتنة التكفير 3 — الكفر العملي والاعتقادي — إبراهيم الهاشمي",
  673: "فتنة التكفير 4 — التكفير أحكام مختلفة — إبراهيم الهاشمي",
  685: "سلسلة الهدى والنور — الشريط 685",
  699: "سلسلة الهدى والنور — الشريط 699",
};

const FILES = [];
for (let ep = 601; ep <= 700; ep++) {
  const title = TITLES[ep] || `سلسلة الهدى والنور — الشريط ${ep}`;
  FILES.push({ ep, fname: `${ep}_01.mp3`, title });
}

console.log(`عدد الملفات: ${FILES.length}`);

const existing = await mapNode("audios");
const existingEps = new Set();
for (const a of Object.values(existing)) {
  if (a.series_id === SERIES_ID && Number(a.episode_number) > 0) existingEps.add(Number(a.episode_number));
}
console.log(`الحلقات الموجودة: ${existingEps.size}`);

const now = nowISO();
let added = 0;
let skipped = 0;

for (const f of FILES) {
  if (existingEps.has(f.ep)) { skipped++; continue; }
  const id = `arch-699-01-${f.ep}`;
  if (await getNode("audios/" + id)) { skipped++; continue; }

  const file_url = `${BASE_URL}/${f.fname}`;
  const rec = {
    id,
    title: f.title,
    title_en: null,
    scholar_id: "albani",
    category_id: "hadith",
    sub_category_id: null,
    series_id: SERIES_ID,
    episode_number: f.ep,
    description: "من: سلسلة الهدى والنور للإمام محمد ناصر الدين الألباني رحمه الله.",
    description_en: null,
    archive_url: ARCHIVE_URL,
    file_url,
    duration: 0,
    file_size: 0,
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
  console.log(`  + ${f.ep}: ${f.title}`);
}

const series = await getNode("series/" + SERIES_ID);
if (series) {
  const maxEp = Math.max(...existingEps);
  await setNode("series/" + SERIES_ID, { ...series, total_episodes: maxEp });
  console.log(`\ntotal_episodes updated: ${maxEp}`);
}

console.log(`\n✓ أُضيف ${added} شريطاً | تجاوز ${skipped} مكرراً`);
