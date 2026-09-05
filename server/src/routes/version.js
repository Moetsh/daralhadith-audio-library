import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.46",
  sync_version: "1.20",
  apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.46/ArrowDXCapacitorAPK-v1.46.apk",
  release_notes: "زر تحميل APK مباشر في الإعدادات، وعرض رقم النسخة الحقيقية. تنبيه: من نسخة أقدم من 1.45 يلزم حذف القديم أولاً (مفتاح توقيع جديد)"
};

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
