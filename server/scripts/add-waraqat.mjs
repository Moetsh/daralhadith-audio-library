/* إضافة عنصر archive.org جديد: شرح متن الورقات في أصول الفقه — محمد بن هادي المدخلي */
const BASE = "https://daralhadith.vercel.app";
const URL = "https://archive.org/details/20230509_20230509_1904";

const login = await fetch(BASE + "/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@daralhadith.app", password: "admin123" }),
});
const lj = await login.json();
if (!login.ok || !lj.accessToken) { console.error("LOGIN FAIL:", login.status, JSON.stringify(lj)); process.exit(1); }
const auth = { "content-type": "application/json", authorization: "Bearer " + lj.accessToken };
console.log("✓ تسجيل الدخول");

// 1) إنشاء الشيخ
const scholar = {
  id: "binhadi",
  name: "محمد بن هادي المدخلي",
  specialization: "عالم وداعية",
  country: "السعودية",
  bio: "من علماء أهل السنة والجماعة، له شروح علمية متعددة منها شرح متن الورقات في أصول الفقه.",
  status: "active",
};
let r = await fetch(BASE + "/api/scholars", { method: "POST", headers: auth, body: JSON.stringify(scholar) });
console.log("إنشاء الشيخ:", r.status, (await r.text()).slice(0, 200));
if (!r.ok && r.status !== 409) process.exit(1);

// 2) الاستيراد الجماعي
const seriesTitle = "شرح متن الورقات في أصول الفقه";
r = await fetch(BASE + "/api/audios/bulk-import", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    url: URL,
    scholar_id: "binhadi",
    category_id: "usul",
    new_series: { title: seriesTitle, total_episodes: 12 },
  }),
});
const imp = await r.json();
console.log("الاستيراد:", r.status, JSON.stringify(imp));
if (!r.ok) process.exit(1);

// 3) تحسين عناوين الأشرطة
const ARAB = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر"];
let renamed = 0;
for (let i = 1; i <= 12; i++) {
  const id = "arch-20230509_20230509_1904-" + i;
  r = await fetch(BASE + "/api/audios/" + encodeURIComponent(id), {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ title: `${seriesTitle} — الشريط ${ARAB[i] || i}` }),
  });
  if (r.ok) renamed++;
}
console.log("تم تحديث العناوين:", renamed, "/ 12");

// 4) تحقق
const aud = await fetch(BASE + "/api/audios?per=100").then((r) => r.json());
console.log("إجمالي الأشرطة بعد الإضافة:", aud.total);
const ser = await fetch(BASE + "/api/series").then((r) => r.json());
for (const s of ser) console.log("  سلسلة:", s.id, "|", s.title, "|", s.audio_count, "شريط");
