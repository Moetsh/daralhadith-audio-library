/* استخراج كتالوج التطبيق (CATS/SCHOLARS/SERIES/ITEMS) وتهيئة قاعدة البيانات
   الطريقة: تجميع src/data/library.ts عبر esbuild ثم استيراده مع محاكاة localStorage */
import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";
import { db, one, run } from "../src/db.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..", "..");
const tmpOut = join(__dir, "_catalog.mjs");
const catalogOut = join(__dir, "..", "data", "catalog.json");

async function extractCatalog() {
  if (!globalThis.localStorage) {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
  }
  const res = await build({
    entryPoints: [join(root, "src", "data", "library.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
    logLevel: "silent",
  });
  writeFileSync(tmpOut, res.outputFiles[0].text);
  const mod = await import(pathToFileURL(tmpOut).href);
  rmSync(tmpOut, { force: true });
  return { cats: mod.CATS, scholars: mod.SCHOLARS, series: mod.SERIES, items: mod.ITEMS };
}

function seed() {
  const catCount = one("SELECT COUNT(*) c FROM categories").c;
  if (catCount > 0) {
    console.log("✦ قاعدة البيانات تحتوي بيانات — تخطي البذر (احذف data/daralhadith.db لإعادة البذر)");
    return;
  }

  console.log("… بذر قاعدة البيانات");
  db.exec("BEGIN");
  const now = Date.now();

  /* المشرف الافتراضي */
  const email = process.env.ADMIN_EMAIL || "admin@daralhadith.app";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  run("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')", "مدير النظام", email, bcrypt.hashSync(password, 10));

  for (const c of catalog.cats) {
    run("INSERT INTO categories (id, name, icon, parent_id, sort_order) VALUES (?,?,?,?,?)", c.id, c.name, c.icon || "book", c.parent || null, 0);
  }
  for (const s of catalog.scholars) {
    run("INSERT INTO scholars (id, name, bio, specialization, status) VALUES (?,?,?,?, 'active')", s.id, s.name, s.bio || null, s.title || null);
  }
  for (const s of catalog.series) {
    run("INSERT INTO series (id, title, scholar_id, category_id, description, total_episodes) VALUES (?,?,?,?,?, 0)", s.id, s.title, s.scholarId, s.categoryId, s.desc || null);
  }
  for (const it of catalog.items) {
    const created = new Date(now - (it.addedDays || 0) * 86400000).toISOString();
    run(
      `INSERT INTO audios (id, title, scholar_id, category_id, series_id, episode_number, description, archive_url, file_url, duration, listen_count, added_days, status, created_at, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'published', ?, ?)`,
      it.id, it.title, it.scholarId, it.categoryId, it.seriesId || null, it.episode ?? null,
      it.description || null, it.archiveUrl || null, it.streamUrl || null, it.duration || 0,
      it.listenCount || 0, it.addedDays || 0, created, created
    );
  }

  /* بيانات استماع اصطناعية لرسوم آخر 30 يوم */
  let k = 0;
  for (let d = 29; d >= 0; d--) {
    const n = 5 + ((k * 7) % 25);
    for (let i = 0; i < n; i++) {
      const dt = new Date(now - d * 86400000 + i * 3600000).toISOString();
      run("INSERT INTO listening_history (audio_id, position, duration, listened_at) VALUES (?,?,?,?)",
        catalog.items[(k * 13 + i * 7) % catalog.items.length].id, Math.random() * 3000, 3000, dt);
    }
    k++;
  }

  /* عمليات بحث شائعة */
  for (const qq of ["تفسير", "السيرة النبوية", "رياض الصالحين", "فتاوى", "التوحيد", "الأربعين النووية"]) {
    run("INSERT INTO search_logs (query, results_count) VALUES (?, 12)", qq);
  }

  /* إعدادات افتراضية */
  run("INSERT INTO settings (key, value) VALUES ('app_name','مكتبة دار الحديث الصوتية')");
  run("INSERT INTO settings (key, value) VALUES ('arch_base_url','https://archive.org/details/')");
  run("INSERT INTO settings (key, value) VALUES ('allow_download','1')");
  run("INSERT INTO settings (key, value) VALUES ('home_items','10')");

  db.exec("COMMIT");
  console.log("✓ تم البذر: " + catalog.items.length + " شريطاً، " + catalog.scholars.length + " شيخاً، " + catalog.cats.length + " تصنيفاً");
  console.log("  دخول اللوحة → " + email + " / " + password);
}

let catalog;
try {
  catalog = await extractCatalog();
} catch (e) {
  console.error("تعذّر استخراج الكتالوج:", e.message);
  process.exit(1);
}
writeFileSync(catalogOut, JSON.stringify({ cats: catalog.cats, scholars: catalog.scholars, series: catalog.series, items: catalog.items }, null, 1));
console.log("✓ catalog.json (" + catalog.items.length + " شريطاً)");
seed();
