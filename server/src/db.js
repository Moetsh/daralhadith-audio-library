/* قاعدة البيانات: SQLite عبر node:sqlite (لا يحتاج تثبيت) */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dir, "..", "data"), { recursive: true });

export const DB_PATH = join(__dir, "..", "data", "daralhadith.db");

export const db = new DatabaseSync(DB_PATH);
db.exec(readFileSync(join(__dir, "schema.sql"), "utf8"));

/* ترحيلات لقواعد موجودة مسبقاً */
const seriesCols = db.prepare("PRAGMA table_info(series)").all().map((c) => c.name);
if (!seriesCols.includes("parent_id")) {
  db.exec("ALTER TABLE series ADD COLUMN parent_id TEXT REFERENCES series(id)");
}

export const q = (sql, ...params) => db.prepare(sql).all(...params);
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

export const tx = (fn) => {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
};
