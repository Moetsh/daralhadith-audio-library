/* استيراد حلقات الهدى والنور (502-600) من Internet Archive إلى Firebase */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { getNode, setNode, mapNode, nowISO } = await import("../src/fb.js");

const SERIES_ID = "sr-سلسلة-الهدى-والنور";
const ARCHIVE_ID = "591-01_20260821";
const BASE_URL = `https://archive.org/download/${ARCHIVE_ID}/500-600`;

// Files from archive.org page (502-600)
const FILES = [
  { ep: 502, fname: "502_01.mp3", title: "سورة يوسف" },
  { ep: 503, fname: "503_01.mp3", title: "سورة إبراهيم بترتيل الإمام الألباني رحمه الله" },
  { ep: 504, fname: "504_01.mp3", title: "سورة النور بترتيل الإمام الألباني رحمه الله" },
  { ep: 505, fname: "505_01.mp3", title: "سورة الملك بترتيل الإمام الألباني رحمه الله" },
  { ep: 511, fname: "511_01.mp3", title: "سلسلة الهدى والنور — الشريط 511" },
  { ep: 512, fname: "512_01.mp3", title: "سلسلة الهدى والنور — الشريط 512" },
  { ep: 513, fname: "513_01.mp3", title: "سلسلة الهدى والنور — الشريط 513" },
  { ep: 514, fname: "514_01.mp3", title: "سلسلة الهدى والنور — الشريط 514" },
  { ep: 515, fname: "515_01.mp3", title: "سلسلة الهدى والنور — الشريط 515" },
  { ep: 516, fname: "516_01.mp3", title: "سلسلة الهدى والنور — الشريط 516" },
  { ep: 517, fname: "517_01.mp3", title: "سلسلة الهدى والنور — الشريط 517" },
  { ep: 518, fname: "518_01.mp3", title: "سلسلة الهدى والنور — الشريط 518" },
  { ep: 519, fname: "519_01.mp3", title: "سلسلة الهدى والنور — الشريط 519" },
  { ep: 520, fname: "520_01.mp3", title: "سلسلة الهدى والنور — الشريط 520" },
  { ep: 521, fname: "521_01.mp3", title: "سلسلة الهدى والنور — الشريط 521" },
  { ep: 522, fname: "522_01.mp3", title: "سلسلة الهدى والنور — الشريط 522" },
  { ep: 523, fname: "523_01.mp3", title: "سلسلة الهدى والنور — الشريط 523" },
  { ep: 524, fname: "524_01.mp3", title: "سلسلة الهدى والنور — الشريط 524" },
  { ep: 525, fname: "525_01.mp3", title: "سلسلة الهدى والنور — الشريط 525" },
  { ep: 526, fname: "526_01.mp3", title: "سلسلة الهدى والنور — الشريط 526" },
  { ep: 527, fname: "527_01.mp3", title: "سلسلة الهدى والنور — الشريط 527" },
  { ep: 528, fname: "528_01.mp3", title: "سلسلة الهدى والنور — الشريط 528" },
  { ep: 529, fname: "529_01.mp3", title: "سلسلة الهدى والنور — الشريط 529" },
  { ep: 530, fname: "530_01.mp3", title: "سلسلة الهدى والنور — الشريط 530" },
  { ep: 531, fname: "531_01.mp3", title: "سلسلة الهدى والنور — الشريط 531" },
  { ep: 532, fname: "532_01.mp3", title: "سلسلة الهدى والنور — الشريط 532" },
  { ep: 533, fname: "533_01.mp3", title: "سلسلة الهدى والنور — الشريط 533" },
  { ep: 534, fname: "534_01.mp3", title: "سلسلة الهدى والنور — الشريط 534" },
  { ep: 535, fname: "535_01.mp3", title: "سلسلة الهدى والنور — الشريط 535" },
  { ep: 536, fname: "536_01.mp3", title: "سلسلة الهدى والنور — الشريط 536" },
  { ep: 537, fname: "537_01.mp3", title: "سلسلة الهدى والنور — الشريط 537" },
  { ep: 538, fname: "538_01.mp3", title: "سلسلة الهدى والنور — الشريط 538" },
  { ep: 539, fname: "539_01.mp3", title: "سلسلة الهدى والنور — الشريط 539" },
  { ep: 540, fname: "540_01.mp3", title: "سلسلة الهدى والنور — الشريط 540" },
  { ep: 541, fname: "541_01.mp3", title: "سلسلة الهدى والنور — الشريط 541" },
  { ep: 542, fname: "542_01.mp3", title: "سلسلة الهدى والنور — الشريط 542" },
  { ep: 543, fname: "543_01.mp3", title: "سلسلة الهدى والنور — الشريط 543" },
  { ep: 544, fname: "544_01.mp3", title: "سلسلة الهدى والنور — الشريط 544" },
  { ep: 545, fname: "545_01.mp3", title: "سلسلة الهدى والنور — الشريط 545" },
  { ep: 546, fname: "546_01.mp3", title: "سلسلة الهدى والنور — الشريط 546" },
  { ep: 547, fname: "547_01.mp3", title: "سلسلة الهدى والنور — الشريط 547" },
  { ep: 548, fname: "548_01.mp3", title: "معنى الآية {وقَليلٌ مِنْ عِبَادِيَ الشَّكُور} — ومسائل فقهية أخرى" },
  { ep: 549, fname: "549_01.mp3", title: "ثناء الإمام الألباني على شيخ الإسلام ابن تيمية بسعته للعلوم الشرعية" },
  { ep: 564, fname: "564_01.mp3", title: "سلسلة الهدى والنور — الشريط 564" },
  { ep: 565, fname: "565_01.mp3", title: "سلسلة الهدى والنور — الشريط 565" },
  { ep: 566, fname: "566_01.mp3", title: "سلسلة الهدى والنور — الشريط 566" },
  { ep: 567, fname: "567_01.mp3", title: "سلسلة الهدى والنور — الشريط 567" },
  { ep: 568, fname: "568_01.mp3", title: "سلسلة الهدى والنور — الشريط 568" },
  { ep: 569, fname: "569_01.mp3", title: "سلسلة الهدى والنور — الشريط 569" },
  { ep: 570, fname: "570_01.mp3", title: "سلسلة الهدى والنور — الشريط 570" },
  { ep: 571, fname: "571_01.mp3", title: "سلسلة الهدى والنور — الشريط 571" },
  { ep: 572, fname: "572_01.mp3", title: "سلسلة الهدى والنور — الشريط 572" },
  { ep: 573, fname: "573_01.mp3", title: "سلسلة الهدى والنور — الشريط 573" },
  { ep: 574, fname: "574_01.mp3", title: "سلسلة الهدى والنور — الشريط 574" },
  { ep: 575, fname: "575_01.mp3", title: "حوار حديثي منهجي عقدي بين الإمام الألباني وحسّان عبد المنّان (1)" },
  { ep: 576, fname: "576_01.mp3", title: "حوار حديثي منهجي عقدي بين الإمام الألباني وحسّان عبد المنّان (2)" },
  { ep: 577, fname: "577_01.mp3", title: "حوار حديثي منهجي عقدي بين الإمام الألباني وحسّان عبد المنّان (3)" },
  { ep: 580, fname: "580_01.mp3", title: "سلسلة الهدى والنور — الشريط 580" },
  { ep: 581, fname: "581_01.mp3", title: "سلسلة الهدى والنور — الشريط 581" },
  { ep: 582, fname: "582_01.mp3", title: "سلسلة الهدى والنور — الشريط 582" },
  { ep: 583, fname: "583_01.mp3", title: "سلسلة الهدى والنور — الشريط 583" },
  { ep: 584, fname: "584_01.mp3", title: "سلسلة الهدى والنور — الشريط 584" },
  { ep: 585, fname: "585_01.mp3", title: "سلسلة الهدى والنور — الشريط 585" },
  { ep: 586, fname: "586_01.mp3", title: "حكم الطلاق المشروط والإشهاد في الطلاق" },
  { ep: 587, fname: "587_01.mp3", title: "حكم طلاق الغضبان والعين حق" },
  { ep: 588, fname: "588_01.mp3", title: "بحث في علم القراءات ومشاركة الشيخ عمر الأشقر" },
  { ep: 589, fname: "589_01.mp3", title: "من قتل دون ماله فهو شهيد" },
  { ep: 590, fname: "590_01.mp3", title: "سلسلة الهدى والنور — الشريط 590" },
  { ep: 591, fname: "591_01.mp3", title: "سلسلة الهدى والنور — الشريط 591" },
  { ep: 592, fname: "592_01.mp3", title: "سلسلة الهدى والنور — الشريط 592" },
  { ep: 593, fname: "593_01.mp3", title: "سلسلة الهدى والنور — الشريط 593" },
  { ep: 594, fname: "594_01.mp3", title: "سلسلة الهدى والنور — الشريط 594" },
  { ep: 595, fname: "595_01.mp3", title: "سلسلة الهدى والنور — الشريط 595" },
  { ep: 596, fname: "596_01.mp3", title: "سلسلة الهدى والنور — الشريط 596" },
  { ep: 597, fname: "597_01.mp3", title: "سلسلة الهدى والنور — الشريط 597" },
  { ep: 598, fname: "598_01.mp3", title: "سلسلة الهدى والنور — الشريط 598" },
  { ep: 599, fname: "599_01.mp3", title: "سلسلة الهدى والنور — الشريط 599" },
  { ep: 600, fname: "600_01.mp3", title: "سلسلة الهدى والنور — الشريط 600" },
];

console.log(`عدد الملفات: ${FILES.length}`);

// Check which episodes already exist
const existing = await mapNode("audios");
const existingEps = new Set();
for (const a of Object.values(existing)) {
  if (a.series_id === SERIES_ID && Number(a.episode_number) > 0) existingEps.add(Number(a.episode_number));
}
console.log(`الحلقات الموجودة: ${existingEps.size}`);

// Add episodes
const now = nowISO();
let added = 0;
let skipped = 0;

for (const f of FILES) {
  if (existingEps.has(f.ep)) { skipped++; continue; }
  const id = `arch-591-01-${f.ep}`;
  if (await getNode("audios/" + id)) { skipped++; continue; }

  const file_url = `${BASE_URL}/${f.fname}`;
  const archive_url = `https://archive.org/details/${ARCHIVE_ID}`;

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
    archive_url,
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

// Update series total_episodes
const series = await getNode("series/" + SERIES_ID);
if (series) {
  const maxEp = Math.max(...existingEps);
  await setNode("series/" + SERIES_ID, { ...series, total_episodes: maxEp });
  console.log(`\ntotal_episodes updated: ${maxEp}`);
}

console.log(`\n✓ أُضيف ${added} شريطاً | تجاوز ${skipped} مكرراً`);
