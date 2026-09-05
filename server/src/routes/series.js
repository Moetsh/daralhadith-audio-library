import { Router } from "express";
import { getNode, setNode, updateNode, removeNode, listNode, wrap } from "../fb.js";
import { authUser, adminOnly, logAction } from "../auth.js";

const r = Router();

const episodeNumbers = async () => {
  const out = {};
  for (const { value } of await listNode("audios")) {
    if (!value.series_id) continue;
    const key = value.series_id;
    (out[key] ||= []).push(Number(value.episode_number) || 0);
  }
  return out;
};

const missingOf = (total, nums) => {
  const have = new Set(nums.filter((n) => n > 0));
  const missing = [];
  for (let n = 1; n <= total; n++) if (!have.has(n)) missing.push(n);
  return missing;
};

const withParent = async (rows) => {
  const all = new Map(rows.map((s) => [s.id, s]));
  return rows.map((s) => {
    const parent = s.parent_id ? all.get(s.parent_id) : null;
    return {
      ...s,
      parent_title: parent?.title ?? null,
      branches: rows.filter((x) => x.parent_id === s.id).map((x) => ({ id: x.id, title: x.title })),
    };
  });
};

r.get("/", wrap(async (req, res) => {
  const nums = await episodeNumbers();
  const rows = (await listNode("series")).map(({ id, value }) => {
    const eps = nums[id] || [];
    const total = Number(value.total_episodes) || 0;
    const missing = missingOf(total, eps);
    return { ...value, id, episodes: eps.length, total_episodes: total, missing_count: missing.length, missing_episodes: missing };
  });
  rows.sort((a, b) => (a.title || "").localeCompare(b.title || "ar"));
  res.json(await withParent(rows));
}));

r.get("/:id", wrap(async (req, res) => {
  const s = await getNode("series/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const branches = (await listNode("series")).filter(({ value }) => value.parent_id === req.params.id).map(({ value }) => value);
  res.json({ ...s, id: req.params.id, branches });
}));

r.get("/:id/episodes", wrap(async (req, res) => {
  const rows = (await listNode("audios"))
    .filter(({ value }) => value.series_id === req.params.id)
    .sort((a, b) =>
      (a.value.episode_number || 0) - (b.value.episode_number || 0) ||
      (a.value.created_at || "").localeCompare(b.value.created_at || "")
    )
    .map(({ value }) => value);
  res.json(rows);
}));

r.post("/", authUser, adminOnly, wrap(async (req, res) => {
  const { id, title, title_en, scholar_id, category_id, description, cover_image_url, total_episodes, is_complete, order_direction, parent_id } = req.body || {};
  if (!id || !title) return res.status(400).json({ error: "المعرف والعنوان مطلوبان" });
  if (await getNode("series/" + id)) return res.status(409).json({ error: "المعرف مستخدم" });
  await setNode("series/" + id, {
    id, title, title_en: title_en ?? null, scholar_id: scholar_id ?? null, category_id: category_id ?? null,
    description: description ?? null, cover_image_url: cover_image_url ?? null,
    total_episodes: total_episodes ?? 0, is_complete: is_complete ? 1 : 0,
    order_direction: order_direction ?? "asc", parent_id: parent_id ?? null,
  });
  logAction(req, "create", "series", id, `أنشأ سلسلة «${title}»`);
  res.status(201).json({ ...(await getNode("series/" + id)), id });
}));

r.put("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const s = await getNode("series/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const d = { ...s, ...req.body };
  await setNode("series/" + req.params.id, {
    ...s,
    title: d.title, title_en: d.title_en ?? null, scholar_id: d.scholar_id ?? null, category_id: d.category_id ?? null,
    description: d.description ?? null, cover_image_url: d.cover_image_url ?? null,
    total_episodes: d.total_episodes ?? 0, is_complete: d.is_complete ? 1 : 0,
    order_direction: d.order_direction ?? "asc", parent_id: d.parent_id ?? null,
  });
  logAction(req, "update", "series", req.params.id, `عدّل سلسلة «${d.title}»`);
  res.json({ ...(await getNode("series/" + req.params.id)), id: req.params.id });
}));

r.post("/:id/apply-cover", authUser, adminOnly, wrap(async (req, res) => {
  const s = await getNode("series/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const cover = s.cover_image_url;
  if (!cover) return res.status(400).json({ error: "لا يوجد غلاف محفوظ لهذه السلسلة" });
  const mode = req.body?.mode === "all" ? "all" : "empty";
  const eps = (await listNode("audios")).filter(({ value }) => value.series_id === req.params.id);
  let updated = 0;
  for (const { id, value } of eps) {
    if (mode === "empty" && value.cover_image_url) continue;
    await updateNode("audios/" + id, { cover_image_url: cover });
    updated++;
  }
  logAction(req, "update", "series", req.params.id, `طبّق غلاف السلسلة على ${updated} من ${eps.length} حلقة`);
  res.json({ ok: true, updated, total: eps.length });
}));

r.delete("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const s = await getNode("series/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const audios = (await listNode("audios")).filter(({ value }) => value.series_id === req.params.id).length;
  if (audios > 0) return res.status(400).json({ error: "يوجد حلقات في هذه السلسلة" });
  await removeNode("series/" + req.params.id);
  logAction(req, "delete", "series", req.params.id, `حذف سلسلة «${s.title}»`);
  res.json({ ok: true });
}));

export default r;
