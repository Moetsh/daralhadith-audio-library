import { Router } from "express";
import { RTDB_URL } from "../lib/firebase.js";
const r = Router();

r.get("/", async (_req, res) => {
  try {
    const snap = await fetch(`${RTDB_URL}/app_config/latest.json`);
    if (snap.ok) {
      const data = await snap.json();
      if (data?.version) return res.json(data);
    }
  } catch {}
  res.json({ version: "1.20", apk_url: "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app/app_config/latest/apk_url.json" });
});

export default r;
