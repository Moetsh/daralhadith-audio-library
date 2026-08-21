import { Router } from "express";
import { z } from "zod";
import { mapNode, findOne, getNode, setNode, updateNode, wrap, nowISO } from "../fb.js";
import {
  hashPw, verifyPw, sign, authUser, loginLimiter, noteAttempt, getRefresh, setRefresh, delRefresh, logAction,
} from "../auth.js";

const r = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) });

r.post("/register", wrap(async (req, res) => {
  const p = registerSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "بيانات غير صحيحة" });
  const { name, email, password } = p.data;
  const existing = await findOne("admin/users", (u) => u.email === email);
  if (existing) return res.status(409).json({ error: "البريد مستخدم مسبقاً" });
  const users = await mapNode("admin/users");
  const isFirst = Object.keys(users).length === 0;
  const id = "u" + (Object.keys(users).length + 1);
  await setNode("admin/users/" + id, {
    name, email, password_hash: hashPw(password), role: isFirst ? "admin" : "user",
    is_banned: 0, created_at: nowISO(), last_login_at: null,
  });
  res.status(201).json({ message: "تم التسجيل" });
}));

r.post("/login", loginLimiter, wrap(async (req, res) => {
  const ip = req.ip || "x";
  const p = loginSchema.safeParse(req.body);
  if (!p.success) { noteAttempt(ip, false); return res.status(400).json({ error: "بيانات غير صحيحة" }); }
  const found = await findOne("admin/users", (u) => u.email === p.data.email);
  if (!found || !verifyPw(p.data.password, found.value.password_hash)) {
    noteAttempt(ip, false);
    return res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
  }
  if (found.value.is_banned) return res.status(403).json({ error: "الحساب محظور" });
  noteAttempt(ip, true);
  const u = { ...found.value, id: found.id };
  await updateNode("admin/users/" + found.id, { last_login_at: nowISO() });
  const access = sign(u);
  const refresh = Math.random().toString(36).slice(2) + Date.now().toString(36);
  await setRefresh(refresh, u.id);
  res.json({ accessToken: access, refreshToken: refresh, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
}));

r.post("/refresh-token", wrap(async (req, res) => {
  const rt = req.body?.refreshToken;
  const uid = rt ? await getRefresh(rt) : null;
  const u = uid ? await getNode("admin/users/" + uid) : null;
  if (!u) return res.status(401).json({ error: "انتهت الجلسة" });
  const access = sign({ ...u, id: uid });
  res.json({ accessToken: access });
}));

r.get("/me", authUser, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

r.post("/logout", wrap(async (req, res) => {
  const rt = req.body?.refreshToken;
  if (rt) await delRefresh(rt);
  res.json({ ok: true });
}));

r.post("/change-password", authUser, wrap(async (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !next || String(next).length < 6)
    return res.status(400).json({ error: "كلمة المرور الجديدة قصيرة" });
  if (!verifyPw(current, req.user.password_hash))
    return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
  await updateNode("admin/users/" + req.user.id, { password_hash: hashPw(next) });
  logAction(req, "change-password", "user", String(req.user.id), "غيّر كلمة المرور");
  res.json({ ok: true });
}));

export default r;
