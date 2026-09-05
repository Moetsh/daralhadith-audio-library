import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.47",
  sync_version: "1.20",
  apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.47/ArrowDXCapacitorAPK-v1.47.apk",
  release_notes: "إصلاح الشاشة الداكنة الفارغة (رسالة خطأ مع إصلاح ذاتي) وحذف عبارة البث التجريبي. من نسخة أقدم من 1.45 يلزم حذف القديم أولاً"
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
