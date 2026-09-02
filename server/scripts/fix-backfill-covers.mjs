/* إصلاح: حذف العقد الوهمية + التعبئة الصحيحة لغلاف الأرشيف
   المرحلة 1: حذف أي عقدة في audios محتواها cover_image_url فقط (أُنشئت بالخطأ سابقاً)
   المرحلة 2: وضع cover_image_url للأشرطة الحقيقية (arch-*) التي لها archive_url ولا غلاف */
/* الإعدادات من متغيرات البيئة فقط (لا تُضمَّن أسرار في الملف):
   FIREBASE_API_KEY, FIREBASE_AUTH_EMAIL, FIREBASE_AUTH_PASSWORD */
const { mapNode, updateNode, removeNode } = await import("../src/fb.js");

const EXTRACT = /archive\.org\/(?:details|download)\/([^/?#]+)/i;
const coverOf = (url) => {
  const m = String(url || "").match(EXTRACT);
  if (!m) return null;
  const id = decodeURIComponent(m[1]);
  return "https://archive.org/services/img/" + id;
};

const audios = await mapNode("audios");

/* المرحلة 1: تنظيف العقد الوهمية */
let del = 0;
for (const [key, v] of Object.entries(audios)) {
  if (!v || typeof v !== "object") continue;
  const keys = Object.keys(v).filter((k) => v[k] !== undefined && v[k] !== null);
  const coverOnly = keys.length === 1 && keys[0] === "cover_image_url" && !v.title && !v.archive_url && !v.file_url;
  if (coverOnly) {
    await removeNode("audios/" + key);
    del++;
  }
}
console.log("عُدلت (حُذفت) عقد وهمية cover-only:", del);

/* المرحلة 2: التعبئة الصحيحة */
const targets = [];
for (const [key, a] of Object.entries(audios)) {
  if (!a || typeof a !== "object") continue;
  if (!a.archive_url) continue;
  if (a.cover_image_url) continue;
  const cover = coverOf(a.archive_url);
  if (cover) targets.push({ key, cover });
}
console.log("أشرطة حقيقية بلا غلاف: " + targets.length);

let ok = 0, fail = 0;
for (const t of targets) {
  try {
    await updateNode("audios/" + t.key, { cover_image_url: t.cover });
    ok++;
    if (ok % 200 === 0) console.log("  " + ok + "/" + targets.length + "...");
  } catch (e) {
    fail++;
    if (fail <= 10) console.error("  ✗ " + t.key + ": " + ((e && e.message) || e));
  }
}
console.log("تم: " + ok + "  فشل: " + fail);
