/* الدفع إلى Firebase Realtime Database — مصدر بيانات التطبيق على الهاتف */
import { q } from "./db.js";

export const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";

/* مفتاح قاعدة البيانات يُمرر عبر متغير البيئة RTDB_SECRET (سيرفر فقط — لا يوضع في تطبيق الهاتف) */
const authSuffix = process.env.RTDB_SECRET ? `?auth=${encodeURIComponent(process.env.RTDB_SECRET)}` : "";

const put = async (path, obj) => {
  const r = await fetch(`${RTDB_URL}/${path}.json${authSuffix}`, { method: "PUT", body: JSON.stringify(obj) });
  if (!r.ok) throw new Error(`فشل الكتابة إلى ${path} (HTTP ${r.status}): ${await r.text()}`);
  return r.json();
};

/* يقرأ قاعدة البيانات المحلية ويرفع المحتوى المنشور إلى Firebase */
export async function pushToFirebase() {
  const audioMap = {};
  for (const a of q("SELECT * FROM audios WHERE status='published'")) {
    audioMap[a.id] = {
      id: a.id,
      title: a.title,
      scholar_id: a.scholar_id,
      category_id: a.category_id,
      series_id: a.series_id || undefined,
      episode_number: a.episode_number ?? undefined,
      description: a.description,
      archive_url: a.archive_url,
      file_url: a.file_url,
      duration: Number(a.duration) || 0,
      added_days: Number(a.added_days) || 0,
      listen_count: Number(a.listen_count) || 0,
    };
  }
  const scholars = {};
  for (const s of q("SELECT * FROM scholars")) {
    scholars[s.id] = { id: s.id, name: s.name, specialization: s.specialization, country: s.country, bio: s.bio };
  }
  const categories = {};
  for (const c of q("SELECT * FROM categories")) {
    categories[c.id] = { id: c.id, name: c.name, parent_id: c.parent_id || undefined, icon: c.icon || "book" };
  }
  const series = {};
  for (const s of q("SELECT * FROM series")) {
    series[s.id] = { id: s.id, title: s.title, scholar_id: s.scholar_id, category_id: s.category_id, description: s.description };
  }

  await put("categories", categories);
  await put("scholars", scholars);
  await put("series", series);
  await put("audios", audioMap);
  await put("meta", { lastPush: new Date().toISOString() });

  return {
    audios: Object.keys(audioMap).length,
    scholars: Object.keys(scholars).length,
    categories: Object.keys(categories).length,
    series: Object.keys(series).length,
  };
}
