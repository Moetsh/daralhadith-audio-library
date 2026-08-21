/* تنظيف المحتوى المزيف من Firebase RTDB
   يحتفظ فقط بـ: الأشرطة الحقيقية من archive.org (17) + الشيخ فلاتة + سلاسل الصحابة
   1) نسخة احتياطية كاملة محلياً  2) استبدال العقد بالمحتوى الحقيقي فقط
   تشغيل: node scripts/cleanup-fake.mjs */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { listNode, setNode, mapNode } = await import("../src/fb.js");
const { writeFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isReal = (a) => String(a.file_url || "").includes("archive.org");

// 1) نسخة احتياطية كاملة
const backup = {};
for (const t of ["audios", "scholars", "series", "categories"]) {
  backup[t] = (await listNode(t)).map(({ id, value }) => ({ id, ...value }));
}
const outPath = fileURLToPath(new URL("../data/backup-before-cleanup.json", import.meta.url));
writeFileSync(outPath, JSON.stringify(backup, null, 2));
console.log("✓ نسخة احتياطية:", outPath);

// 2) تحديد الحقيقي
const realAudios = backup.audios.filter(isReal);
const realScholarIds = new Set(realAudios.map((a) => a.scholar_id).filter(Boolean));
const realSeriesIds = new Set(realAudios.map((a) => a.series_id).filter(Boolean));

const keepAudios = Object.fromEntries(realAudios.map((a) => [a.id, a]));
const keepScholars = Object.fromEntries(backup.scholars.filter((s) => realScholarIds.has(s.id)).map((s) => [s.id, s]));
const keepSeries = Object.fromEntries(backup.series.filter((s) => realSeriesIds.has(s.id)).map((s) => [s.id, s]));

console.log("سيُحذف:", backup.audios.length - realAudios.length, "شريطاً",
  "/", backup.scholars.length - Object.keys(keepScholars).length, "شيخاً",
  "/", backup.series.length - Object.keys(keepSeries).length, "سلسلة");
console.log("سيُبقى:", realAudios.length, "شريطاً | علماء:", Object.keys(keepScholars).join(", "),
  "| سلاسل:", Object.keys(keepSeries).join(", "));

// 3) استبدال العقد بالمحتوى الحقيقي فقط
await setNode("audios", keepAudios);
await sleep(300);
await setNode("scholars", keepScholars);
await sleep(300);
await setNode("series", keepSeries);
await sleep(300);

// 4) التحقق
const after = {
  audios: Object.keys(await mapNode("audios")).length,
  scholars: Object.keys(await mapNode("scholars")).length,
  series: Object.keys(await mapNode("series")).length,
  categories: Object.keys(await mapNode("categories")).length,
};
console.log("✓ بعد التنظيف:", JSON.stringify(after));
if (after.audios !== realAudios.length) throw new Error("عدّاد الأشرطة غير متطابق!");
console.log("✓ اكتمل التنظيف بنجاح");
