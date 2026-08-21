import { Router } from "express";
import { getNode, setNode, removeNode, pushNode, mapNode, listNode, wrap, nowISO } from "../fb.js";
import { authUser, adminOnly, logAction } from "../auth.js";

const r = Router();
r.use(authUser, adminOnly);

const DEFAULTS = {
  app_name: "مكتبة دار الحديث الصوتية",
  app_description: "مكتبة صوتية إسلامية مجانية — نشر العلم الشرعي من أرشيف الإنترنت",
  arch_collection: "",
  arch_base_url: "https://archive.org/details/",
  allow_download: "1",
  default_quality: "high",
  home_items: "10",
  per_page: "25",
  notif_new_audio: "1",
  facebook: "",
  twitter: "",
  telegram: "",
  email: "",
};

r.get("/", wrap(async (req, res) => {
  const map = await mapNode("admin/settings");
  res.json({ ...DEFAULTS, ...map });
}));

r.put("/", wrap(async (req, res) => {
  const body = req.body || {};
  await setNode("admin/settings", { ...body });
  logAction(req, "update", "settings", null, "عدّل الإعدادات العامة");
  res.json({ ...DEFAULTS, ...body });
}));

/* النسخ الاحتياطي: تصدير كامل كـ JSON من Firebase */
r.get("/backup", wrap(async (req, res) => {
  const tables = ["users", "categories", "scholars", "series", "audios", "settings", "announcements", "activity_logs"];
  const dump = {};
  for (const t of tables) {
    const base = t === "users" || t === "announcements" || t === "activity_logs" ? "admin/" + t : t;
    dump[t] = (await listNode(base)).map(({ id, value }) => ({ ...value, id }));
  }
  logAction(req, "backup", "settings", null, "أنشأ نسخة احتياطية");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=daralhadith-backup-" + nowISO().slice(0, 10) + ".json");
  res.json(dump);
}));

r.get("/activity", wrap(async (req, res) => {
  const rows = (await listNode("admin/activity"))
    .sort((a, b) => (b.value.created_at || "").localeCompare(a.value.created_at || ""))
    .slice(0, 200)
    .map(({ id, value }) => ({ ...value, id }));
  res.json(rows);
}));

r.get("/announcements", wrap(async (req, res) => {
  const rows = (await listNode("admin/announcements"))
    .sort((a, b) => (b.value.created_at || "").localeCompare(a.value.created_at || ""))
    .map(({ id, value }) => ({ ...value, id }));
  res.json(rows);
}));

r.post("/announcements", wrap(async (req, res) => {
  const { title, content, type, target_audience, is_active, starts_at, expires_at } = req.body || {};
  if (!title) return res.status(400).json({ error: "العنوان مطلوب" });
  await pushNode("admin/announcements", {
    title, content: content ?? null, type: type ?? "banner", target_audience: target_audience ?? "all",
    is_active: is_active === false ? 0 : 1, starts_at: starts_at ?? null, expires_at: expires_at ?? null,
    created_at: nowISO(),
  });
  logAction(req, "create", "announcement", null, `أضاف تنبيهاً «${title}»`);
  res.status(201).json({ ok: true });
}));

r.delete("/announcements/:id", wrap(async (req, res) => {
  await removeNode("admin/announcements/" + req.params.id);
  logAction(req, "delete", "announcement", req.params.id, "حذف تنبيهاً");
  res.json({ ok: true });
}));

/* إدارة المستخدمين (مشرف) */
r.get("/users", wrap(async (req, res) => {
  const rows = (await listNode("admin/users"))
    .sort((a, b) => (b.value.created_at || "").localeCompare(a.value.created_at || ""))
    .map(({ id, value }) => ({ id, name: value.name, email: value.email, role: value.role, is_banned: value.is_banned, created_at: value.created_at, last_login_at: value.last_login_at }));
  res.json(rows);
}));

r.put("/users/:id/ban", wrap(async (req, res) => {
  const ban = req.body?.ban !== false;
  const u = await getNode("admin/users/" + req.params.id);
  if (u && u.role !== "admin") await setNode("admin/users/" + req.params.id, { ...u, is_banned: ban ? 1 : 0 });
  logAction(req, "ban", "user", req.params.id, ban ? "حظر مستخدماً" : "ألغى حظر مستخدم");
  res.json({ ok: true });
}));

r.get("/admins", wrap(async (req, res) => {
  const rows = (await listNode("admin/users"))
    .filter(({ value }) => value.role === "admin")
    .map(({ id, value }) => ({ id, name: value.name, email: value.email, role: value.role, created_at: value.created_at }));
  res.json(rows);
}));

/* المزامنة أصبحت تلقائية (Firebase هو قاعدة البيانات نفسها) — تُرجع الإحصائيات فقط */
r.post("/firebase-sync", wrap(async (req, res) => {
  const [audios, scholars, categories, series] = await Promise.all([
    mapNode("audios"), mapNode("scholars"), mapNode("categories"), mapNode("series"),
  ]);
  const stats = {
    audios: Object.keys(audios).length,
    scholars: Object.keys(scholars).length,
    categories: Object.keys(categories).length,
    series: Object.keys(series).length,
  };
  await setNode("meta", { lastPush: nowISO() });
  logAction(req, "firebase-sync", "catalog", null, `تحقّق من المحتوى (${stats.audios} شريطاً، ${stats.scholars} شيخاً، ${stats.categories} تصنيفاً، ${stats.series} سلسلة)`);
  res.json({ ok: true, ...stats });
}));

export default r;
