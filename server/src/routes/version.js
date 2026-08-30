import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.33",
  sync_version: "1.20",
  apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.33/ArrowDXCapacitorAPK-v1.33.apk",
  release_notes: "إضافة سلسلة شرح الأصول الثلاثة (الشيخ صالح الفوزان) + الغلاف يظهر كاملاً بصورته الطبيعية لجميع الأشرطة"
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
