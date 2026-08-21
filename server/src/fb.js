/* طبقة البيانات: Firebase Realtime Database عبر REST — بديل SQLite
   الخادم يوقّع عبر Firebase Authentication (Email/Password) ويجلب idToken
   تلقائياً (مع تخزين مؤقت وتجديد عند الانتهاء) ثم يمرّره كـ ?auth= لكل طلبات RTDB.
   متغيرات البيئة المطلوبة:
     FIREBASE_API_KEY, FIREBASE_AUTH_EMAIL, FIREBASE_AUTH_PASSWORD
   بديل قديم (للاستخدام المحلي فقط): RTDB_SECRET */
export const RTDB_URL =
  process.env.RTDB_URL || "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";

const API_KEY = process.env.FIREBASE_API_KEY;
const AUTH_EMAIL = process.env.FIREBASE_AUTH_EMAIL;
const AUTH_PASSWORD = process.env.FIREBASE_AUTH_PASSWORD;

let cachedToken = "";
let cachedExp = 0;

/* تسجيل الدخول إلى Firebase Auth واسترجاع idToken (صلاحيته ساعة تقريباً) */
const getIdToken = async () => {
  if (API_KEY && AUTH_EMAIL && AUTH_PASSWORD) {
    if (cachedToken && Date.now() < cachedExp - 60_000) return cachedToken;
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(API_KEY)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, returnSecureToken: true }),
      },
    );
    const d = await r.json();
    if (!r.ok || !d.idToken)
      throw new Error(`Firebase Auth sign-in → HTTP ${r.status}: ${d?.error?.message || "unknown"}`);
    cachedToken = d.idToken;
    cachedExp = Date.now() + Number(d.expiresIn || 3600) * 1000;
    return cachedToken;
  }
  return process.env.RTDB_SECRET ? process.env.RTDB_SECRET : "";
};

const req = async (path, method, body) => {
  const token = await getIdToken();
  const suffix = token ? `?auth=${encodeURIComponent(token)}` : "";
  const url = `${RTDB_URL}/${path}.json${suffix}`;
  const r = await fetch(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Firebase ${method} ${path} → HTTP ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

export const getNode = (path) => req(path, "GET");
export const setNode = (path, val) => req(path, "PUT", val);
export const updateNode = (path, val) => req(path, "PATCH", val);
export const removeNode = (path) => req(path, "DELETE");

/* إضافة عنصر في قائمة — يعيد المفتاح المولّد */
export const pushNode = async (path, val) => {
  const out = await req(path, "POST", val);
  return out?.name;
};

/* كل العقد كقائمة { id, value } */
export const listNode = async (path) => {
  const obj = await getNode(path);
  return obj ? Object.entries(obj).map(([id, value]) => ({ id, value })) : [];
};

/* كل العقد كسجل { id: value } */
export const mapNode = async (path) => (await getNode(path)) || {};

export const countNode = async (path) => Object.keys(await mapNode(path)).length;

export const findOne = async (path, fn) => {
  for (const { id, value } of await listNode(path)) if (fn(value, id)) return { id, value };
  return null;
};

export const sumNode = async (path, key) =>
  (await listNode(path)).reduce((s, { value }) => s + (Number(value?.[key]) || 0), 0);

/* لالتقاط أخطاء الـ async في Express 4 */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const nowISO = () => new Date().toISOString();
