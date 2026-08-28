// إضافة محاضرة "الرقية الشرعية، مخلفات وظوابط" — الشيخ عبد الرزاق بن عبد المحسن البدر
// تصنيف: خطب ودروس (khutab)

const DB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
const AUTH_EMAIL = "firebase-admin@daralhadith.app";
const AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const enc = encodeURIComponent;
const now = new Date().toISOString();

const item = {
  id: "arch-khutab-ruqya-sharia-badr",
  title: "الرقية الشرعية، مخلفات وظوابط",
  scholar_id: "badr",
  category_id: "khutab",
  series_id: null,
  episode_number: 0,
  description: "محاضرة الرقية الشرعية، مخلفات وظوابط للشيخ عبد الرزاق بن عبد المحسن البدر حفظه الله.",
  archive_url: "https://archive.org/details/20260828_20260828_0829",
  file_url: "https://ia803209.us.archive.org/16/items/20260828_20260828_0829/" + enc("محاضرة_الرقية_الشرعية_مخلفات_و_ضوابط_الشيخ_عبد_الرزاق_بن_عبد_المحسن_البدر_01.mp3"),
  duration: 2070,
  file_size: 49712994,
  status: "published",
  allow_download: 1,
  is_featured: 0,
  listen_count: 0,
  download_count: 0,
  added_days: 0,
  tags: "[]",
  created_at: now,
  updated_at: now,
  published_at: now,
};

async function db(path, verb, body) {
  const authR = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${enc(API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, returnSecureToken: true }),
    },
  );
  const auth = await authR.json();
  if (!authR.ok || !auth.idToken) throw new Error(`Auth failed: ${auth?.error?.message}`);
  const url = `${DB}/${path}.json?auth=${enc(auth.idToken)}`;
  const r = await fetch(url, {
    method: verb,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}: ${await r.text()}`);
  return r.json();
}

async function putIfMissing(id, obj) {
  const existing = await db(`audios/${id}`, "GET");
  if (existing) {
    const need = obj.file_url && (!existing.file_url || existing.file_url.includes(".mp3/") || existing.duration === 0 || existing.file_size === 0);
    if (need) {
      const merged = { ...existing, ...obj };
      await db(`audios/${id}`, "PUT", merged);
      console.log(`exists - repaired fields OK: ${id}`);
    } else {
      console.log(`exists - skipped (complete): ${id}`);
    }
    return;
  }
  await db(`audios/${id}`, "PUT", obj);
  console.log(`added new: ${id}`);
}

await putIfMissing(item.id, item);
console.log("done");