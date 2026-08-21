/* تنظيف SQLite المحلي من المحتوى المزيف (نفس معيار Firebase)
   نسخة احتياطية من الملف أولاً، ثم حذف الأشرطة/العلماء/السلاسل غير الحقيقية */
import { DatabaseSync } from "node:sqlite";
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dbPath = fileURLToPath(new URL("../data/daralhadith.db", import.meta.url));
const backupPath = dbPath + ".before-cleanup";
copyFileSync(dbPath, backupPath);
console.log("✓ نسخة احتياطية:", backupPath);

const db = new DatabaseSync(dbPath);

const audios = db.prepare("SELECT * FROM audios").all();
const isReal = (a) => String(a.file_url || "").includes("archive.org");
const realAudios = audios.filter(isReal);
const realScholarIds = new Set(realAudios.map((a) => a.scholar_id).filter(Boolean));
const realSeriesIds = new Set(realAudios.map((a) => a.series_id).filter(Boolean));

const before = {
  audios: audios.length,
  scholars: db.prepare("SELECT COUNT(*) c FROM scholars").get().c,
  series: db.prepare("SELECT COUNT(*) c FROM series").get().c,
};

db.exec("BEGIN");
try {
  db.prepare("DELETE FROM audios WHERE id NOT IN (" + realAudios.map(() => "?").join(",") + ")").run(...realAudios.map((a) => a.id));
  db.prepare("DELETE FROM series WHERE id NOT IN (" + [...realSeriesIds].map(() => "?").join(",") + ")").run(...realSeriesIds);
  db.prepare("DELETE FROM scholars WHERE id NOT IN (" + [...realScholarIds].map(() => "?").join(",") + ")").run(...realScholarIds);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

const after = {
  audios: db.prepare("SELECT COUNT(*) c FROM audios").get().c,
  scholars: db.prepare("SELECT COUNT(*) c FROM scholars").get().c,
  series: db.prepare("SELECT COUNT(*) c FROM series").get().c,
  categories: db.prepare("SELECT COUNT(*) c FROM categories").get().c,
};
console.log("قبل:", JSON.stringify(before));
console.log("بعد:", JSON.stringify(after));
console.log("✓ اكتمل تنظيف SQLite");
