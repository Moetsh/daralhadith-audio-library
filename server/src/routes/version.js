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
  res.json({ version: "1.21", apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.21/DarAlHadith-AudioLibrary-v1.21.apk", release_notes: "تحسين شامل للمظهر، حذف أشرطة al-albany.com" });
});

export default r;
