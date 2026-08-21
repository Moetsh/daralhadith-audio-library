import { Router } from "express";
import { mapNode, getNode, setNode, removeNode, listNode, wrap } from "../fb.js";
import { authUser, adminOnly, logAction } from "../auth.js";

const r = Router();

const audioCounts = async () => {
  const audios = await mapNode("audios");
  const counts = {};
  for (const id of Object.keys(audios)) {
    const a = audios[id];
    if (a.category_id) counts[a.category_id] = (counts[a.category_id] || 0) + 1;
    if (a.sub_category_id) counts[a.sub_category_id] = (counts[a.sub_category_id] || 0) + 1;
  }
  return counts;
};

const seriesCounts = async () => {
  const series = await mapNode("series");
  const counts = {};
  for (const id of Object.keys(series)) {
    const cid = series[id].category_id;
    if (cid) counts[cid] = (counts[cid] || 0) + 1;
  }
  return counts;
};

/* القائمة (مسطحة) */
r.get("/", wrap(async (req, res) => {
  const counts = await audioCounts();
  const sc = await seriesCounts();
  const rows = (await listNode("categories")).map(({ id, value }) => ({ ...value, id, audio_count: counts[id] || 0, series_count: sc[id] || 0 }));
  rows.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.name || "").localeCompare(b.name || "ar"));
  res.json(rows);
}));

/* الشجرة الهرمية */
r.get("/tree", wrap(async (req, res) => {
  const counts = await audioCounts();
  const sc = await seriesCounts();
  const byId = new Map();
  for (const { id, value } of await listNode("categories"))
    byId.set(id, { ...value, id, audio_count: counts[id] || 0, series_count: sc[id] || 0, children: [] });
  for (const c of byId.values())
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(c);
  res.json([...byId.values()].filter((c) => !c.parent_id));
}));

r.get("/:id", wrap(async (req, res) => {
  const c = await getNode("categories/" + req.params.id);
  if (!c) return res.status(404).json({ error: "غير موجود" });
  const children = (await listNode("categories")).filter(({ value }) => value.parent_id === req.params.id).map(({ value }) => value);
  const audios = (await listNode("audios"))
    .filter(({ value }) => value.category_id === req.params.id)
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, 50)
    .map(({ value }) => value);
  res.json({ ...c, id: req.params.id, audio_count: audios.length, children, audios });
}));

r.post("/", authUser, adminOnly, wrap(async (req, res) => {
  const { id, name, name_en, parent_id, icon, description, cover_image_url, sort_order, is_active } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: "المعرف والاسم مطلوبان" });
  if (await getNode("categories/" + id)) return res.status(409).json({ error: "المعرف مستخدم" });
  if (parent_id && !(await getNode("categories/" + parent_id)))
    return res.status(400).json({ error: "التصنيف الأب غير موجود" });
  await setNode("categories/" + id, {
    id, name, name_en: name_en ?? null, parent_id: parent_id ?? null, icon: icon ?? "book",
    description: description ?? null, cover_image_url: cover_image_url ?? null,
    sort_order: sort_order ?? 0, is_active: is_active === false ? 0 : 1,
  });
  logAction(req, "create", "category", id, `أنشأ تصنيف «${name}»`);
  res.status(201).json({ ...(await getNode("categories/" + id)), id });
}));

r.put("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const c = await getNode("categories/" + req.params.id);
  if (!c) return res.status(404).json({ error: "غير موجود" });
  const d = { ...c, ...req.body };
  if (d.parent_id === req.params.id) return res.status(400).json({ error: "لا يمكن أن يكون التصنيف أباً لنفسه" });
  await setNode("categories/" + req.params.id, {
    ...c,
    name: d.name, name_en: d.name_en ?? null, parent_id: d.parent_id ?? null, icon: d.icon ?? "book",
    description: d.description ?? null, cover_image_url: d.cover_image_url ?? null,
    sort_order: d.sort_order ?? 0, is_active: d.is_active === false ? 0 : 1,
  });
  logAction(req, "update", "category", req.params.id, `عدّل تصنيف «${d.name}»`);
  res.json({ ...(await getNode("categories/" + req.params.id)), id: req.params.id });
}));

r.delete("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const c = await getNode("categories/" + req.params.id);
  if (!c) return res.status(404).json({ error: "غير موجود" });
  const children = (await listNode("categories")).filter(({ value }) => value.parent_id === req.params.id).length;
  if (children > 0) return res.status(400).json({ error: "يوجد تصنيفات فرعية — انقلها أو احذفها أولاً" });
  const audios = (await listNode("audios")).filter(({ value }) => value.category_id === req.params.id || value.sub_category_id === req.params.id).length;
  if (audios > 0) return res.status(400).json({ error: "يوجد أشرطة في هذا التصنيف" });
  await removeNode("categories/" + req.params.id);
  logAction(req, "delete", "category", req.params.id, `حذف تصنيف «${c.name}»`);
  res.json({ ok: true });
}));

export default r;
