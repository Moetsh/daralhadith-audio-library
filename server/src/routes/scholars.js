import { Router } from "express";
import { getNode, setNode, removeNode, listNode, wrap } from "../fb.js";
import { authUser, adminOnly, logAction } from "../auth.js";

const r = Router();

const counts = async () => {
  const out = {};
  for (const { value } of await listNode("audios")) {
    if (!value.scholar_id) continue;
    out[value.scholar_id] = (out[value.scholar_id] || 0) + 1;
  }
  return out;
};

r.get("/", wrap(async (req, res) => {
  const c = await counts();
  const rows = (await listNode("scholars")).map(({ id, value }) => ({ ...value, id, audio_count: c[id] || 0 }));
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || "ar"));
  res.json(rows);
}));

r.get("/:id", wrap(async (req, res) => {
  const s = await getNode("scholars/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const audios = (await listNode("audios"))
    .filter(({ value }) => value.scholar_id === req.params.id)
    .sort((a, b) => (b.value.listen_count || 0) - (a.value.listen_count || 0))
    .slice(0, 50)
    .map(({ value }) => value);
  res.json({ ...s, id: req.params.id, audio_count: audios.length, audios });
}));

r.get("/:id/audios", wrap(async (req, res) => {
  const rows = (await listNode("audios"))
    .filter(({ value }) => value.scholar_id === req.params.id)
    .sort((a, b) => (b.value.created_at || "").localeCompare(a.value.created_at || ""))
    .map(({ value }) => value);
  res.json(rows);
}));

r.post("/", authUser, adminOnly, wrap(async (req, res) => {
  const { id, name, name_en, bio, bio_en, image_url, specialization, country, status, is_featured } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: "المعرف والاسم مطلوبان" });
  if (await getNode("scholars/" + id)) return res.status(409).json({ error: "المعرف مستخدم" });
  await setNode("scholars/" + id, {
    id, name, name_en: name_en ?? null, bio: bio ?? null, bio_en: bio_en ?? null,
    image_url: image_url ?? null, specialization: specialization ?? null, country: country ?? null,
    status: status ?? "active", is_featured: is_featured ? 1 : 0,
  });
  logAction(req, "create", "scholar", id, `أضاف شيخاً «${name}»`);
  res.status(201).json({ ...(await getNode("scholars/" + id)), id });
}));

r.put("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const s = await getNode("scholars/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const d = { ...s, ...req.body };
  await setNode("scholars/" + req.params.id, {
    ...s,
    name: d.name, name_en: d.name_en ?? null, bio: d.bio ?? null, bio_en: d.bio_en ?? null,
    image_url: d.image_url ?? null, specialization: d.specialization ?? null, country: d.country ?? null,
    status: d.status ?? "active", is_featured: d.is_featured ? 1 : 0,
  });
  logAction(req, "update", "scholar", req.params.id, `عدّل شيخاً «${d.name}»`);
  res.json({ ...(await getNode("scholars/" + req.params.id)), id: req.params.id });
}));

r.delete("/:id", authUser, adminOnly, wrap(async (req, res) => {
  const s = await getNode("scholars/" + req.params.id);
  if (!s) return res.status(404).json({ error: "غير موجود" });
  const audios = (await listNode("audios")).filter(({ value }) => value.scholar_id === req.params.id).length;
  if (audios > 0) return res.status(400).json({ error: "يوجد أشرطة لهذا الشيخ" });
  await removeNode("scholars/" + req.params.id);
  logAction(req, "delete", "scholar", req.params.id, `حذف شيخاً «${s.name}»`);
  res.json({ ok: true });
}));

export default r;
