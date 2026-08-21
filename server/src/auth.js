/* المصادقة JWT + التفويض + Rate limiting بسيط — البيانات من Firebase RTDB */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getNode, setNode, removeNode, pushNode, nowISO } from "./fb.js";

export const JWT_SECRET = process.env.JWT_SECRET || "daralhadith-dev-secret-change-me";
export const JWT_EXP = process.env.JWT_EXP || "7d";

export const hashPw = (pw) => bcrypt.hashSync(pw, 10);
export const verifyPw = (pw, hash) => bcrypt.compareSync(pw, hash);

export const sign = (u) => jwt.sign({ sub: u.id, role: u.role }, JWT_SECRET, { expiresIn: JWT_EXP });

/* توكن التحديث مخزّن في Firebase: admin/refresh/{rt} = userId */
const refreshPath = (rt) => "admin/refresh/" + encodeURIComponent(rt);
export const getRefresh = (rt) => getNode(refreshPath(rt));
export const setRefresh = (rt, uid) => setNode(refreshPath(rt), String(uid));
export const delRefresh = (rt) => removeNode(refreshPath(rt));

export async function authUser(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "غير مصرّح" });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    const u = await getNode("admin/users/" + p.sub);
    if (!u || u.is_banned) return res.status(401).json({ error: "غير مصرّح" });
    req.user = { ...u, id: p.sub };
    next();
  } catch {
    return res.status(401).json({ error: "انتهت الجلسة" });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "تحتاج صلاحيات مشرف" });
  next();
}

/* سجل نشاط للمشرفين (في Firebase) */
export function logAction(req, action, entityType, entityId, details) {
  pushNode("admin/activity", {
    admin_id: req.user?.id ?? null,
    admin_name: req.user?.name ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details: details ?? null,
    ip_address: req.ip ?? req.socket?.remoteAddress ?? null,
    created_at: nowISO(),
  }).catch(() => {});
}

/* حدّ محاولات تسجيل الدخول: 5 محاولات / 10 دقائق لكل عنوان IP */
const attempts = new Map();
export function loginLimiter(req, res, next) {
  const ip = req.ip || "x";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec) {
    if (rec.count >= 5 && now - rec.t < 10 * 60 * 1000)
      return res.status(429).json({ error: "محاولات كثيرة — انتظر 10 دقائق" });
    if (now - rec.t > 10 * 60 * 1000) attempts.set(ip, { count: 0, t: now });
  }
  next();
}
export const noteAttempt = (ip, ok) => {
  if (!ip) return;
  const rec = attempts.get(ip) || { count: 0, t: Date.now() };
  rec.t = Date.now();
  if (ok) attempts.delete(ip);
  else {
    rec.count += 1;
    attempts.set(ip, rec);
  }
};
