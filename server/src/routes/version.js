import { Router } from "express";
import { pushNode, listNode, removeNode, getNode } from "../fb.js";
const r = Router();

const FALLBACK = {
  version: "1.54.2",
  sync_version: "1.43",
  /* APK مستضاف على نطاقنا مباشرة — روابط تنزيل GitHub تفشل (404) على بعض الشبكات */
  apk_url: "https://daralhadith.vercel.app/apk/ArrowDXCapacitorAPK-v1.54.2.apk",
  release_notes: "تحديث البرنامج 1.54.2: واجهة رئيسية جديدة — شريط «المضاف حديثاً» البانري بتدوير تلقائي كل 8 ثوانٍ، وسلايدر عمودي «الأكثر استماعاً» بعشر بطاقات بأغلفة كاملة، وإصلاحات الاستقرار.",
};

/* استقبال تقارير أخطاء العملاء تلقائياً (عام، محدود الحجم، احتفاظ بآخر 200) */
r.post("/client-errors", async (req, res) => {
  try {
    const b = req.body || {};
    const cut = (v, n) => String(v ?? "").slice(0, n);
    const rec = {
      message: cut(b.message, 500),
      stack: cut(b.stack, 3000),
      route: cut(b.route, 40),
      appVersion: cut(b.appVersion, 20),
      platform: cut(b.platform, 20),
      created_at: new Date().toISOString(),
    };
    if (!rec.message) return res.status(400).json({ error: "empty" });
    await pushNode("admin/client-errors", rec);
    const all = (await listNode("admin/client-errors")).map(({ id }) => id).sort();
    for (const old of all.slice(0, Math.max(0, all.length - 200))) {
      await removeNode("admin/client-errors/" + old);
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

r.get("/", async (_req, res) => {
  /* رقم المزامنة يُقرأ من meta لأن app_config غير مسموح في قواعد RTDB */
  let sync = "";
  try {
    const v = await getNode("meta/sync_version");
    if (v !== null && v !== undefined) sync = String(v);
  } catch {}
  res.json({ ...FALLBACK, ...(sync ? { sync_version: sync } : {}) });
});

export default r;
