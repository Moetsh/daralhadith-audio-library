import { Router } from "express";
import { pushNode, listNode, removeNode } from "../fb.js";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.53.1",
  sync_version: "1.37",
  apk_url: "https://archive.org/download/daralhadith-v1.53.1/daralhadith-v1.53.1.apk",
  release_notes: "إصلاح ظهور الأشرطة المضافة حديثاً (كسر كاش حزمة المحتوى) + تحسين سرعة المزامنة عند فتح التطبيق."
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
  try {
    const snap = await fetch(`${RTDB_URL}/app_config/latest.json`);
    if (snap.ok) {
      const data = await snap.json();
      if (data?.version) return res.json({ ...FALLBACK, ...data });
    }
  } catch {}
  res.json(FALLBACK);
});

export default r;
