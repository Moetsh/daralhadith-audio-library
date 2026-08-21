/* مزامنة كتالوج SQLite المحلي من Firebase (مصدر الحقيقة المنشور)
   يمسح الجداول الثلاثة ويعيد تعبئتها من RTDB — يحافظ على اتساق مصدر البذر */
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const RTDB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const toArray = (obj) => (obj ? Object.values(obj) : []);

const [audios, scholars, series, cats] = await Promise.all([
  fetch(RTDB + "/audios.json").then((r) => r.json()),
  fetch(RTDB + "/scholars.json").then((r) => r.json()),
  fetch(RTDB + "/series.json").then((r) => r.json()),
  fetch(RTDB + "/categories.json").then((r) => r.json()),
]);

const db = new DatabaseSync(fileURLToPath(new URL("../data/daralhadith.db", import.meta.url)));

const insert = (table, cols, rows) => {
  const ph = cols.map(() => "?").join(",");
  const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${ph})`);
  for (const r of rows) stmt.run(...cols.map((c) => r[c] ?? null));
};

const cols = (list) => list.slice(0, 1).map((x) => x); // placeholder
const pick = (obj, keys) => {
  const o = {};
  for (const k of keys) o[k] = obj[k] ?? null;
  return o;
};

db.exec("PRAGMA foreign_keys = OFF");
db.exec("BEGIN");
try {
  const aCols = ["id","title","title_en","scholar_id","category_id","sub_category_id","series_id","episode_number","description","description_en","archive_url","file_url","duration","file_size","bitrate","cover_image_url","tags","status","is_featured","allow_download","listen_count","download_count","added_days","created_at","updated_at","published_at"];
  const sCols = ["id","name","name_en","bio","bio_en","image_url","specialization","country","status","is_featured"];
  const seCols = ["id","title","title_en","scholar_id","category_id","description","cover_image_url","total_episodes","is_complete","order_direction","parent_id"];
  const cCols = ["id","name","name_en","parent_id","icon","description","cover_image_url","sort_order","is_active"];

  db.prepare("DELETE FROM audios").run();
  db.prepare("DELETE FROM series").run();
  db.prepare("DELETE FROM scholars").run();
  db.prepare("DELETE FROM categories").run();

  insert("categories", cCols, toArray(cats).map((x) => pick(x, cCols)));
  insert("scholars", sCols, toArray(scholars).map((x) => pick(x, sCols)));
  insert("series", seCols, toArray(series).map((x) => pick(x, seCols)));
  insert("audios", aCols, toArray(audios).map((x) => pick(x, aCols)));

  db.exec("COMMIT");
db.exec("PRAGMA foreign_keys = ON");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log("تمت المزامنة من Firebase:", JSON.stringify({
  audios: count("audios"), scholars: count("scholars"), series: count("series"), categories: count("categories"),
}));
