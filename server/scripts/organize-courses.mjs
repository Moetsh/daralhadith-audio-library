/* تنظيم الأشرطة المبعثرة: نقلها لفئاتها المتخصصة + تصحيح العناوين
   ملاحظة: سلسلة واحدة فقط (الهدى والنور) — الباقي شروح/دروس/فتاوى عبر الفئات */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const { getNode, setNode, mapNode } = await import("../src/fb.js");

/* تعريفات الشروحات/الدورات: نمط الوصف أو العنوان → الفئة المتخصصة والعنوان الجديد */
const COURSES = [
  {
    key: "matn-tawheed",
    cat: "matn-tawheed",
    name: "قراءة متن كتاب التوحيد",
    matchDesc: /قراءة لمتن كتاب التوحيد/,
  },
  {
    key: "qawl-mufid",
    cat: "sharh-qawl-mufid",
    name: "شرح القول المفيد على كتاب التوحيد",
    matchDesc: /القول المفيد على كتاب التوحيد/,
  },
  {
    key: "tafsir-araf",
    cat: "tafsir-araf",
    name: "تفسير سورة الأعراف",
    matchDesc: /سورة الاعراف تفسير الشنقيطي|الأعراف تفسير/,
  },
  {
    key: "wasitiyyah-jami",
    cat: "sharh-wasitiyyah",
    name: "شرح العقيدة الواسطية",
    matchDesc: /العقيدة الواسطية.*الجامي/,
  },
  {
    key: "hamawiyah",
    cat: "sharh-hamawiyah",
    name: "فتح رب البرية بتلخيص الحموية",
    matchDesc: /فتح رب البرية بتلخيص الحموية/,
  },
  {
    key: "qawaid",
    cat: "sharh-qawaid",
    name: "شرح متن القواعد المثلى",
    matchDesc: /متن القواعد المثلى/,
  },
  {
    key: "rabahiyya",
    cat: "usul-rabahiyya",
    name: "شرح متن الرحبية",
    matchDesc: /متن الرحبية/,
  },
  {
    key: "usul-3",
    cat: "sharh-usul-3",
    name: "شرح الأصول الثلاثة وأدلتها",
    matchDesc: /الاصول الثلاثة وادلتها/,
  },
];

/* استخراج رقم الحلقة من عنوان عام مثل "الشريط ١٢أ" */
const parseEpFromTitle = (t) => {
  const m = String(t || "").match(/[٠-٩0-9]+/);
  if (!m) return null;
  const s = m[0].replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  return parseInt(s, 10) || null;
};

const audios = await mapNode("audios");
const now = new Date().toISOString();

let updated = 0;
const summary = {};

for (const [id, a] of Object.entries(audios)) {
  if (a.status !== "published") continue;
  if (a.series_id) continue; // الهدى والنور لا تُلمس

  const title = (a.title || "").trim();
  const desc = a.description || "";

  let course = null;

  // 1. مطابقة بالعنوان العام "الشريط N" + الوصف
  if (/^الشريط\s+[٠-٩0-9]+[أب]?$/.test(title)) {
    course = COURSES.find((c) => c.matchDesc.test(desc));
  }

  // 2. شرح كتاب التوحيد - الدرس N (عناوين جاهزة، نحتاج فقط نقل الفئة)
  let isTawheedSharh = false;
  if (!course && /^شرح كتاب التوحيد\s*-\s*(الدرس)?\s*[٠-٩0-9]+$/.test(title)) {
    course = { key: "sharh-tawheed", cat: "sharh-tawheed", name: "شرح كتاب التوحيد" };
    isTawheedSharh = true;
  }

  // 3. الرحلة إلى إفريقيا N
  let isRihla = false;
  if (!course && /^الرحلة إلى إفريقيا\s*[٠-٩0-9]+$/.test(title)) {
    course = { key: "rihla", cat: "tafsir-journey", name: "الرحلة إلى إفريقيا" };
    isRihla = true;
  }

  if (!course) continue;

  // رقم الحلقة
  let ep = Number(a.episode_number) > 0 ? Number(a.episode_number) : parseEpFromTitle(title);

  // العنوان الجديد — شروح التوحيد والرحلة عناوينها جيدة أصلاً
  const newTitle = isTawheedSharh || isRihla
    ? title.replace(/\s*-\s*/g, " — ")
    : `${course.name} — الدرس ${ep}`;

  const patch = {
    ...a,
    title: newTitle,
    category_id: course.cat,
    episode_number: ep,
    updated_at: now,
  };
  await setNode("audios/" + id, patch);
  updated++;
  summary[course.name] = (summary[course.name] || 0) + 1;
}

console.log("✓ تم تحديث", updated, "شريطاً:");
for (const [k, v] of Object.entries(summary)) console.log("   ", v, "|", k);

// تحقق نهائي: الفئات المستهدفة
console.log("\n=== توزيع الفئات بعد التنظيم ===");
const after = await mapNode("audios");
const counts = {};
for (const a of Object.values(after)) {
  if (a.status !== "published") continue;
  counts[a.category_id] = (counts[a.category_id] || 0) + 1;
}
const sorted = Object.entries(counts).sort((x, y) => y[1] - x[1]);
for (const [c, n] of sorted) console.log(String(n).padStart(4), c);
