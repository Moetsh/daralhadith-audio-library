import { Router } from "express";
import { mapNode, listNode, sumNode, wrap } from "../fb.js";
import { authUser, adminOnly } from "../auth.js";

const r = Router();
r.use(authUser, adminOnly);

r.get("/overview", wrap(async (req, res) => {
  const [audios, scholars, categories, users, listens, downloads, series] = await Promise.all([
    mapNode("audios"), mapNode("scholars"), mapNode("categories"),
    mapNode("admin/users"), sumNode("audios", "listen_count"), sumNode("audios", "download_count"), mapNode("series"),
  ]);
  res.json({
    audios: Object.keys(audios).length,
    scholars: Object.keys(scholars).length,
    categories: Object.keys(categories).length,
    users: Object.values(users).filter((u) => u.role !== "admin").length,
    listens, downloads,
    series: Object.keys(series).length,
  });
}));

/* استماعات آخر 30 يوماً (من سجل الاستماع) */
r.get("/listens", wrap(async (req, res) => {
  const days = 30;
  const byDate = new Map();
  for (const { value } of await listNode("admin/listening_history")) {
    const d = String(value.listened_at || "").slice(0, 10);
    if (d) byDate.set(d, (byDate.get(d) || 0) + 1);
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: dt, count: byDate.get(dt) || 0 });
  }
  res.json(out);
}));

/* توزيع الأشرطة حسب التصنيف الرئيسي */
r.get("/categories", wrap(async (req, res) => {
  const [audios, categories] = await Promise.all([mapNode("audios"), mapNode("categories")]);
  const byId = new Map();
  for (const c of Object.values(categories)) byId.set(c.id, c);
  const agg = new Map();
  for (const a of Object.values(audios)) {
    if (a.status !== "published") continue;
    const c = byId.get(a.category_id);
    if (!c) continue;
    const main = c.parent_id ? byId.get(c.parent_id) || c : c;
    const rec = agg.get(main.id) || { main_id: main.id, name: main.name, count: 0 };
    rec.count += 1;
    agg.set(main.id, rec);
  }
  res.json([...agg.values()].sort((a, b) => b.count - a.count));
}));

r.get("/popular", wrap(async (req, res) => {
  const n = parseInt(req.query.n, 10) || 10;
  const scholars = await mapNode("scholars");
  const rows = (await listNode("audios"))
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, n)
    .map(({ value }) => ({ ...value, scholar_name: scholars[value.scholar_id]?.name ?? null }));
  res.json(rows);
}));

/* تحميلات آخر 30 يوماً */
r.get("/downloads", wrap(async (req, res) => {
  const out = [];
  const byDate = new Map();
  for (const { value } of await listNode("admin/downloads")) {
    const d = String(value.downloaded_at || "").slice(0, 10);
    if (d) byDate.set(d, (byDate.get(d) || 0) + 1);
  }
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ d: dt, c: byDate.get(dt) || 0 });
  }
  res.json(out);
}));

r.get("/top-scholars", wrap(async (req, res) => {
  const [audios, scholars] = await Promise.all([mapNode("audios"), mapNode("scholars")]);
  const agg = new Map();
  for (const a of Object.values(audios)) {
    if (!a.scholar_id) continue;
    const rec = agg.get(a.scholar_id) || { scholar_id: a.scholar_id, audios: 0, listens: 0 };
    rec.audios += 1;
    rec.listens += Number(a.listen_count) || 0;
    agg.set(a.scholar_id, rec);
  }
  const rows = [...agg.values()]
    .map((x) => ({ ...x, name: scholars[x.scholar_id]?.name ?? null }))
    .sort((a, b) => b.listens - a.listens)
    .slice(0, 10);
  res.json(rows);
}));

r.get("/search-terms", wrap(async (req, res) => {
  const agg = new Map();
  for (const { value } of await listNode("admin/search_logs")) {
    const qq = value.query || "";
    const rec = agg.get(qq) || { query: qq, c: 0, results: 0 };
    rec.c += 1;
    rec.results = Math.max(rec.results, Number(value.results_count) || 0);
    agg.set(qq, rec);
  }
  res.json([...agg.values()].sort((a, b) => b.c - a.c).slice(0, 10));
}));

r.get("/export", wrap(async (req, res) => {
  const rows = (await listNode("audios")).map(({ value }) => value);
  const csv = ["id,title,scholar_id,category_id,duration,listen_count,download_count,status,archive_url,file_url,created_at"]
    .concat(rows.map((a) => [a.id, `"${(a.title || "").replace(/"/g, '""')}"`, a.scholar_id, a.category_id, a.duration, a.listen_count, a.download_count, a.status, a.archive_url, a.file_url, a.created_at].join(",")))
    .join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=audios.csv");
  res.send("\uFEFF" + csv);
}));

export default r;
