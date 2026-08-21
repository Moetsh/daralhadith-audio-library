/* بذر Firebase الكامل من قاعدة SQLite المحلية — بيانات اللوحة + الكتالوج
   تشغيل: RTDB_SECRET=... node scripts/seed-firebase.mjs
   ينسخ كل الجداول (بما فيها admin/users و settings) إلى بنية Firebase الجديدة */
import { q } from "../src/db.js";
import { setNode, nowISO } from "../src/fb.js";

const put = async (path, val) => {
  await setNode(path, val);
  console.log("  ✓ " + path);
};

/* مفاتيح Firebase لا يجوز أن تكون رقمية خالصة (يتحول لصفيف بفجوات null)
   لذا نضيف بادئة لكل الجداول التي يكون معرفها رقماً في SQLite */
const keyed = (rows, prefix) => {
  const out = {};
  for (const row of rows) out[prefix + row.id] = row;
  return out;
};

async function main() {
  console.log("… بذر Firebase من SQLite");

  const cats = {};
  for (const c of q("SELECT * FROM categories")) cats[c.id] = c;
  await put("categories", cats);

  const scholars = {};
  for (const s of q("SELECT * FROM scholars")) scholars[s.id] = s;
  await put("scholars", scholars);

  const series = {};
  for (const s of q("SELECT * FROM series")) series[s.id] = s;
  await put("series", series);

  const audios = {};
  for (const a of q("SELECT * FROM audios")) audios[a.id] = a;
  await put("audios", audios);

  await put("admin/users", keyed(q("SELECT * FROM users"), "u"));

  const settings = {};
  for (const s of q("SELECT key, value FROM settings")) settings[s.key] = s.value;
  await put("admin/settings", settings);

  await put("admin/announcements", keyed(q("SELECT * FROM announcements"), "a"));
  await put("admin/activity", keyed(q("SELECT * FROM activity_logs"), "act"));
  await put("admin/listening_history", keyed(q("SELECT * FROM listening_history"), "h"));
  await put("admin/downloads", keyed(q("SELECT * FROM downloads"), "d"));
  await put("admin/search_logs", keyed(q("SELECT * FROM search_logs"), "s"));

  await put("meta", { lastPush: nowISO() });

  console.log("✓ تم بذر Firebase: " +
    Object.keys(audios).length + " شريطاً، " + Object.keys(scholars).length + " شيخاً، " +
    Object.keys(cats).length + " تصنيفاً، " + Object.keys(series).length + " سلسلة");
}

main().catch((e) => {
  console.error("فشل البذر:", e.message);
  process.exit(1);
});
