import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

r.get("/", async (_req, res) => {
  try {
    const snap = await fetch(`${RTDB_URL}/app_config/latest.json`);
    if (snap.ok) {
      const data = await snap.json();
      if (data?.version) return res.json(data);
    }
  } catch {}
  res.json({ version: "1.26", apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.26/DarAlHadith-AudioLibrary-v1.26.apk", release_notes: "إصلاح التثبيت الصامت: تحميل وتثبيت أصلي بالكامل عبر Java، إصلاح مشاكل مسارات الملفات على Android 10+" });
});

export default r;
