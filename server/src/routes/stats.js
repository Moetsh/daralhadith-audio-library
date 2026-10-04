import { Router } from "express";
import { mapNode, listNode, sumNode, getNode, setNode, updateNode, countNode, wrap } from "../fb.js";
import { authUser, adminOnly } from "../auth.js";

const r = Router();

/* تسجيل تثبيت/أول تشغيل للتطبيق (عام): يخزّن معرفاً عشوائياً لكل جهاز بدون أي بيانات شخصية */
r.post("/install", wrap(async (req, res) => {
  try {
    const b = req.body || {};
    const id = String(b.install_id || "");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return res.status(400).json({ error: "bad id" });
    const cut = (v, n) => String(v ?? "").slice(0, n);
    const now = new Date().toISOString();
    const prev = await getNode("admin/installs/" + id);
    if (!prev) {
      await setNode("admin/installs/" + id, {
        first_seen: now, last_seen: now,
        platform: cut(b.platform, 16), app_version: cut(b.app_version, 20),
      });
    } else {
      await updateNode("admin/installs/" + id, {
        last_seen: now,
        platform: cut(b.platform, 16) || prev.platform || null,
        app_version: cut(b.app_version, 20) || prev.app_version || null,
      });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
}));

/* حزمة خفيفة عامة للتطبيق: نفس بيانات RTDB بلا الحقول الثقيلة (description/tags/dates) */
r.get("/client-pack", wrap(async (_req, res) => {
  const [audios, scholars, categories, series] = await Promise.all([
    mapNode("audios"), mapNode("scholars"), mapNode("categories"), mapNode("series"),
  ]);
  const pack = {};
  for (const [id, a] of Object.entries(audios)) {
    if (a.status && a.status !== "published") continue;
    /* cover_image_url كان 6MB من أصل 7.3MB (رو CDN طويلة) — نستبدله بمعرّف الأرشيف فقط */
    const coverId = String(a.cover_image_url || "").match(/archive\.org\/(?:download|images)\/([^/?#]+)/i)?.[1] || "";
    /* file_url كان رابطاً طويلاً مُرمَّزاً — نحفظ المعرّف + اسم الملف ونعيد بناءه عند العميل */
    const fu = String(a.file_url || "");
    const fm = fu.match(/archive\.org\/download\/([^/?#]+)\/([^?#]+)$/i);
    const arId = fm ? fm[1] : String(a.archive_url || "").match(/archive\.org\/(?:details|download)\/([^/?#]+)/i)?.[1] || "";
    /* نُبقي اسم الملف بترميزه الأصلي كما في RTDB (سلاسل وأرقام حقيقية) */
    const arName = fm ? fm[2] : "";
    pack[id] = [
      a.scholar_id || "",
      a.category_id || "",
      a.series_id || "",
      a.title || "",
      Math.round(Number(a.duration) || 0),
      coverId,
      a.episode_number ?? -1,
      arId,
      arName,
    ];
  }
  const packs = {};
  for (const [id, s] of Object.entries(series)) {
    packs[id] = [s.title || "", s.scholar_id || "", s.category_id || "", Number(s.total_episodes) || 0];
  }
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=86400");
  res.json({
    v: 1,
    a: pack,
    s: packs,
    c: Object.values(categories).map((c) => [c.id, c.name || "", c.parent_id || "", c.icon || ""]),
    h: Object.values(scholars).map((s) => [s.id, s.name || "", s.title || "", s.bio || "", s.era || "", s.reciter ? 1 : 0]),
  });
}));

r.use(authUser, adminOnly);

r.get("/overview", wrap(async (req, res) => {
  const [audios, scholars, categories, users, listens, downloads, series, installs] = await Promise.all([
    mapNode("audios"), mapNode("scholars"), mapNode("categories"),
    mapNode("admin/users"), sumNode("audios", "listen_count"), sumNode("audios", "download_count"), mapNode("series"),
    countNode("admin/installs"),
  ]);
  res.json({
    audios: Object.keys(audios).length,
    scholars: Object.keys(scholars).length,
    categories: Object.keys(categories).length,
    users: Object.values(users).filter((u) => u.role !== "admin").length,
    listens, downloads,
    series: Object.keys(series).length,
    installs,
  });
}));

/* تثبيتات جديدة يومياً — آخر 30 يوماً (حسب first_seen) */
r.get("/installs", wrap(async (_req, res) => {
  const byDate = new Map();
  for (const { value } of await listNode("admin/installs")) {
    const d = String(value?.first_seen || "").slice(0, 10);
    if (d) byDate.set(d, (byDate.get(d) || 0) + 1);
  }
  const out = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: dt, count: byDate.get(dt) || 0 });
  }
  res.json(out);
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
