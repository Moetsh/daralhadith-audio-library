import { Router } from "express";
import { z } from "zod";
import { getNode, setNode, updateNode, removeNode, pushNode, mapNode, listNode, findOne, wrap, nowISO } from "../fb.js";
import { authUser, adminOnly, logAction } from "../auth.js";
import { inspectArchive } from "../archive.js";

const r = Router();

const maps = async () => {
  const [scholars, categories, series] = await Promise.all([
    mapNode("scholars"), mapNode("categories"), mapNode("series"),
  ]);
  return { scholars, categories, series };
};

const attach = (audios, { scholars, categories, series }) =>
  audios.map((a) => ({
    ...a,
    scholar_name: scholars[a.scholar_id]?.name ?? null,
    category_name: categories[a.category_id]?.name ?? null,
    category_icon: categories[a.category_id]?.icon ?? null,
    sub_category_name: a.sub_category_id ? categories[a.sub_category_id]?.name ?? null : null,
    series_title: series[a.series_id]?.title ?? null,
  }));

const childCategories = async (categories) => {
  const children = {};
  for (const c of Object.values(categories)) {
    if (!c.parent_id) continue;
    (children[c.parent_id] ||= new Set()).add(c.id);
  }
  return children;
};

/* قائمة مع فلاتر + ترتيب + Pagination */
r.get("/", wrap(async (req, res) => {
  const { q: search, category, sub_category, scholar, series, status, page = 1, per = 25, sort = "new" } = req.query;
  const m = await maps();
  const cats = await mapNode("categories");
  const children = await childCategories(cats);
  const s = String(search || "").toLowerCase();
  let rows = (await listNode("audios")).map(({ value }) => value);

  if (s) {
    rows = rows.filter((a) =>
      (a.title || "").toLowerCase().includes(s) ||
      (a.description || "").toLowerCase().includes(s) ||
      (m.scholars[a.scholar_id]?.name || "").toLowerCase().includes(s)
    );
  }
  if (category) {
    const set = children[category] ? [...children[category]] : [];
    rows = rows.filter((a) => a.category_id === category || set.includes(a.category_id));
  }
  if (sub_category) rows = rows.filter((a) => a.category_id === sub_category);
  if (scholar) rows = rows.filter((a) => a.scholar_id === scholar);
  if (series) rows = rows.filter((a) => a.series_id === series);
  if (status) rows = rows.filter((a) => a.status === status);

  if (sort === "popular") rows.sort((a, b) => (b.listen_count || 0) - (a.listen_count || 0));
  else if (sort === "old") rows.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  else if (sort === "duration") rows.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  else rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const total = rows.length;
  const pageN = Math.max(1, parseInt(page, 10) || 1);
  const perN = Math.min(100, Math.max(1, parseInt(per, 10) || 25));
  const items = attach(rows.slice((pageN - 1) * perN, pageN * perN), m);
  res.json({ items, total, page: pageN, per: perN, pages: Math.ceil(total / perN) });
}));

r.get("/latest", wrap(async (req, res) => {
  const n = Math.min(50, parseInt(req.query.n, 10) || 10);
  const m = await maps();
  const rows = (await listNode("audios"))
    .filter(({ value }) => value.status === "published")
    .sort((a, b) => (b.value.created_at || "").localeCompare(a.value.created_at || ""))
    .slice(0, n)
    .map(({ value }) => value);
  res.json(attach(rows, m));
}));

r.get("/popular", wrap(async (req, res) => {
  const n = Math.min(100, parseInt(req.query.n, 10) || 20);
  const m = await maps();
  const rows = (await listNode("audios"))
    .filter(({ value }) => value.status === "published")
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, n)
    .map(({ value }) => value);
  res.json(attach(rows, m));
}));

r.get("/search", wrap(async (req, res) => {
  const search = (req.query.q || "").trim();
  const n = Math.min(50, parseInt(req.query.n, 10) || 20);
  if (!search) return res.json([]);
  const m = await maps();
  const s = search.toLowerCase();
  const rows = (await listNode("audios"))
    .filter(({ value }) => value.status === "published")
    .filter(({ value }) =>
      (value.title || "").toLowerCase().includes(s) ||
      (value.description || "").toLowerCase().includes(s) ||
      (m.scholars[value.scholar_id]?.name || "").toLowerCase().includes(s) ||
      (m.series[value.series_id]?.title || "").toLowerCase().includes(s)
    )
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, n)
    .map(({ value }) => value);
  res.json(attach(rows, m));
}));

r.get("/:id", wrap(async (req, res) => {
  const it = await getNode("audios/" + req.params.id);
  if (!it) return res.status(404).json({ error: "غير موجود" });
  const m = await maps();
  const related = (await listNode("audios"))
    .filter(({ value }) => value.id !== req.params.id && (value.category_id === it.category_id || value.scholar_id === it.scholar_id))
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, 8)
    .map(({ value }) => value);
  res.json({ ...attach([it], m)[0], related });
}));

const audioSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  title_en: z.string().optional().nullable(),
  scholar_id: z.string().min(1),
  category_id: z.string().min(1),
  sub_category_id: z.string().optional().nullable(),
  series_id: z.string().optional().nullable(),
  episode_number: z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  archive_url: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  duration: z.number().optional().default(0),
  file_size: z.number().optional().default(0),
  bitrate: z.number().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["published", "draft", "hidden"]).optional().default("published"),
  is_featured: z.boolean().optional(),
  allow_download: z.boolean().optional(),
});

const scrub = (d) => ({
  title: d.title,
  title_en: d.title_en ?? null,
  scholar_id: d.scholar_id,
  category_id: d.category_id,
  sub_category_id: d.sub_category_id ?? null,
  series_id: d.series_id ?? null,
  episode_number: d.episode_number ?? null,
  description: d.description ?? null,
  description_en: d.description_en ?? null,
  archive_url: d.archive_url ?? null,
  file_url: d.file_url ?? null,
  duration: Number(d.duration) || 0,
  file_size: Number(d.file_size) || 0,
  bitrate: d.bitrate ?? null,
  cover_image_url: d.cover_image_url ?? null,
  tags: JSON.stringify(d.tags ?? []),
  status: d.status ?? "published",
  is_featured: d.is_featured ? 1 : 0,
  allow_download: d.allow_download !== false ? 1 : 0,
});

r.post("/", authUser, adminOnly, wrap(async (req, res) => {
  const p = audioSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "بيانات غير صحيحة", issues: p.error.issues });
  const d = p.data;
  const id = d.id || "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  if (await getNode("audios/" + id)) return res.status(409).json({ error: "المعرف مستخدم" });
  if (d.file_url) {
    const dup = await findOne("audios", (a) => a.file_url === d.file_url);
    if (dup) return res.status(409).json({ error: "هذا الشريط موجود مسبقاً (نفس الملف)" });
  }
  const rec = {
    ...scrub(d), id, listen_count: 0, download_count: 0, added_days: 0,
    created_at: nowISO(), updated_at: nowISO(),
    published_at: d.status === "published" ? nowISO() : null,
  };
  await setNode("audios/" + id, rec);
  logAction(req, "create", "audio", id, `أنشأ شريط «${d.title}»`);
  res.status(201).json({ ...rec, id });
}));

r.put("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const p = audioSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "بيانات غير صحيحة" });
  const it = await getNode("audios/" + req.params.id);
  if (!it) return res.status(404).json({ error: "غير موجود" });
  if (p.data.file_url) {
    const dup = await findOne("audios", (a) => a.file_url === p.data.file_url && a.id !== req.params.id);
    if (dup) return res.status(409).json({ error: "هذا الشريط موجود مسبقاً (نفس الملف)" });
  }
  const merged = { ...it, ...p.data };
  const rec = { ...it, ...scrub(merged), updated_at: nowISO() };
  if (rec.status === "published" && !rec.published_at) rec.published_at = nowISO();
  await setNode("audios/" + req.params.id, rec);
  logAction(req, "update", "audio", req.params.id, `عدّل شريط «${rec.title}»`);
  res.json({ ...rec, id: req.params.id });
}));

r.delete("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const it = await getNode("audios/" + req.params.id);
  if (!it) return res.status(404).json({ error: "غير موجود" });
  await removeNode("audios/" + req.params.id);
  logAction(req, "delete", "audio", req.params.id, `حذف شريط «${it.title}»`);
  res.json({ ok: true });
}));

/* استيراد جماعي من Internet Archive */
const slugOf = (s) =>
  "sr-" +
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sr";

const findOrCreateSeries = async (title, { scholar_id, category_id, total_episodes, parent_id, cover_image_url }) => {
  const clean = String(title || "").trim();
  if (!clean) return null;
  const existing = await findOne("series", (s) => s.title === clean && (s.parent_id ?? null) === (parent_id ?? null));
  if (existing) return existing.id;
  const sid = slugOf(clean) + (parent_id ? "-" + parent_id.slice(-6) : "");
  await setNode("series/" + sid, { id: sid, title: clean, scholar_id, category_id, total_episodes, parent_id, cover_image_url: cover_image_url ?? null });
  return sid;
};

r.post("/bulk-import", authUser, adminOnly, wrap(async (req, res) => {
  const { url, scholar_id, category_id, series_id, selected, new_series, branch_map } = req.body || {};
  const insp = await inspectArchive(url);
  if (!insp.ok) return res.status(400).json({ error: insp.error });
  let files = insp.files;
  if (Array.isArray(selected) && selected.length) {
    const sel = new Set(selected);
    files = files.filter((f) => sel.has(f.name));
  }
  if (!files.length) return res.status(400).json({ error: "لا توجد ملفات مختارة" });

  let mainId = series_id || null;
  const branchIds = new Map();
  const itemCover = "https://archive.org/services/img/" + insp.identifier;
  if (new_series?.title) {
    mainId = await findOrCreateSeries(new_series.title, {
      scholar_id, category_id, total_episodes: new_series.total_episodes ?? files.length, cover_image_url: itemCover,
    });
    const branches = Array.isArray(new_series.branches) ? new_series.branches.filter((b) => String(b || "").trim()) : [];
    for (const b of branches) {
      const bid = await findOrCreateSeries(b, { scholar_id, category_id, parent_id: mainId, cover_image_url: itemCover });
      branchIds.set(b.trim(), bid);
    }
  } else if (mainId && Array.isArray(new_series?.branches)) {
    for (const b of new_series.branches) {
      if (!String(b || "").trim()) continue;
      const bid = await findOrCreateSeries(b, { scholar_id, category_id, parent_id: mainId, cover_image_url: itemCover });
      branchIds.set(b.trim(), bid);
    }
  }

  /* ترقيم الحلقات: يستخرج الرقم من اسم الملف (مثل 212_01.mp3 → الحلقة 212) عندما تكون
     الأسماء مرقّمة بوضوح، وإلا يكمل تسلسلياً من أقصى حلقة موجودة أو من start_episode */
  const epOfName = (name) => {
    const m = String(name || "").match(/^(\d{1,4})[_\-. ]/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n > 0 && n < 10000 ? n : null;
  };
  const derivedEps = files.map((f) => epOfName(f.name));
  const uniqueDerived = new Set(derivedEps.filter((x) => x != null)).size;
  const useFilenames = derivedEps.some((x) => x != null) && uniqueDerived >= Math.ceil(files.length * 0.7);

  const nextEpisode = new Map();
  const batchEps = new Map();
  const existingEps = new Map();
  const seriesMax = new Map();
  const startOver = parseInt(req.body?.start_episode, 10);
  if (mainId) {
    const audios = await mapNode("audios");
    for (const a of Object.values(audios)) {
      if (!a.series_id) continue;
      const key = String(a.series_id);
      const n = Number(a.episode_number) || 0;
      if (n > 0) {
        if (!existingEps.has(key)) existingEps.set(key, new Set());
        existingEps.get(key).add(n);
        nextEpisode.set(key, Math.max(nextEpisode.get(key) ?? 0, n));
      }
    }
    const mainKey = String(mainId);
    if (!Number.isNaN(startOver) && startOver > 0) nextEpisode.set(mainKey, startOver - 1);
  }

  /* منع التكرار: نتجاهل أي ملف رابطُه موجود مسبقاً في المكتبة */
  const existingUrls = new Set();
  for (const a of Object.values(await mapNode("audios"))) {
    if (a.file_url) existingUrls.add(a.file_url);
  }

  let idx = 0;
  let imported = 0;
  let skipped = 0;
  for (const f of files) {
    idx++;
    const id = "arch-" + insp.identifier.replace(/[^a-zA-Z0-9_-]/g, "") + "-" + idx;
    if (await getNode("audios/" + id)) { skipped++; continue; }
    if (f.url && existingUrls.has(f.url)) { skipped++; continue; }
    const branchName = branch_map ? branch_map[f.name] : null;
    const sid = branchName && branchIds.has(branchName) ? branchIds.get(branchName) : mainId;
    const key = String(sid ?? "");
    let n = useFilenames ? epOfName(f.name) : null;
    if (n != null) {
      const pre = existingEps.get(key);
      const inBatch = batchEps.get(key)?.has(n);
      if ((pre && pre.has(n)) || inBatch) { skipped++; continue; }
    } else {
      n = (nextEpisode.get(key) ?? 0) + 1;
    }
    nextEpisode.set(key, n);
    if (!batchEps.has(key)) batchEps.set(key, new Set());
    batchEps.get(key).add(n);
    seriesMax.set(key, Math.max(seriesMax.get(key) ?? 0, n));
    await setNode("audios/" + id, {
      id, title: f.title, scholar_id, category_id, series_id: sid || null, episode_number: n,
      description: insp.title ? `من: ${insp.title}` : null,
      cover_image_url: itemCover,
      archive_url: "https://archive.org/details/" + insp.identifier,
      file_url: f.url, duration: Math.round(f.length), file_size: f.size,
      listen_count: 0, download_count: 0, added_days: 0, tags: "[]",
      status: "published", is_featured: 0, allow_download: 1,
      created_at: nowISO(), updated_at: nowISO(), published_at: nowISO(),
    });
    existingUrls.add(f.url);
    imported++;
  }

  /* تحديث عدد حلقات السلسلة الرئيسية */
  if (mainId) {
    const ser = await getNode("series/" + mainId);
    if (ser) {
      const key = String(mainId);
      const all = new Set([...(existingEps.get(key) || []), ...(seriesMax.get(key) ? [seriesMax.get(key)] : [])]);
      const total = all.size ? Math.max(...all) : 0;
      if (total > 0) await setNode("series/" + mainId, { ...ser, total_episodes: total });
    }
  }

  const seriesTitles = async (ids) => {
    const out = [];
    for (const sid of ids) {
      const s = sid ? await getNode("series/" + sid) : null;
      if (s?.title) out.push(s.title);
    }
    return out;
  };
  const detail = (await seriesTitles([mainId, ...branchIds.values()])).join("، ");
  logAction(req, "bulk-import", "audio", insp.identifier, `استورد ${imported} شريطاً من أرشيف الإنترنت${detail ? ` (${detail})` : ""}${skipped ? `، تجاوز ${skipped} مكرراً` : ""}`);
  res.json({ ok: true, imported, skipped, series_id: mainId, branches: [...branchIds.values()] });
}));

/* تسجيل استماع/تحميل */
r.post("/:id/listen", wrap(async (req, res) => {
  const it = await getNode("audios/" + req.params.id);
  if (!it) return res.status(404).json({ error: "غير موجود" });
  await updateNode("audios/" + req.params.id, { listen_count: { ".sv": { increment: 1 } } });
  await pushNode("admin/listening_history", {
    user_id: req.user?.id ?? null,
    audio_id: req.params.id,
    position: Number(req.body?.position) || 0,
    duration: Number(req.body?.duration) || 0,
    is_completed: req.body?.is_completed ? 1 : 0,
    listened_at: nowISO(),
  });
  res.json({ ok: true });
}));

r.post("/:id/download", wrap(async (req, res) => {
  const it = await getNode("audios/" + req.params.id);
  if (!it) return res.status(404).json({ error: "غير موجود" });
  await updateNode("audios/" + req.params.id, { download_count: { ".sv": { increment: 1 } } });
  await pushNode("admin/downloads", {
    user_id: req.user?.id ?? null,
    audio_id: req.params.id,
    status: "done",
    downloaded_at: nowISO(),
  });
  res.json({ ok: true });
}));

export default r;
