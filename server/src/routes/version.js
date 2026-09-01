import { Router } from "express";
const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const r = Router();

const FALLBACK = {
  version: "1.37",
  sync_version: "1.20",
  apk_url: "https://github.com/Moetsh/daralhadith-releases/releases/download/v1.37/ArrowDXCapacitorAPK-v1.37.apk",
  release_notes: "سلسلة أسئلة وأجوبة في المصطلح للشيخ مقبل بن هادي الوادعي (8 أشرطة) ضمن مصطلح الحديث + سلسلة المستخرجات العقدية من المسائل الطلابية للشيخ محمد علي فركوس (شريطان) ضمن المنهج + شريط السير على منهج السلف للشيخ ربيع بن هادي المدخلي ضمن المنهج + شريط لقاء الشيخ عبد الرزاق البدر مع العلامة الألباني ضمن المنهج + سلسلة قصة الخليل إبراهيم عليه السلام للشيخ عبد الرزاق عفيفي (شريطان) ضمن قصص الأنبياء + الغلاف الحقيقي يظهر كاملاً بصورته الطبيعية لجميع الأشرطة وعند التشغيل"
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
