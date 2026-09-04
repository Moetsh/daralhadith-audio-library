import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.42",
  sync_version: "1.20",
  apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.42/ArrowDXCapacitorAPK-v1.42.apk",
  release_notes: "تحسين واجهة التطبيق: بطاقات فهرس موحدة، إصلاح أغلفة الشبكة، زر التشغيل ظاهر دائمًا على اللمس، تمييز مؤقت النوم المختار، وإصلاحات بصرية"
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
