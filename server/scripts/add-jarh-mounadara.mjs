// 1) إصلاح مادة "ابن تيمية السلفي" (المنهج) ببيانات صحيحة
// 2) إضافة "مناظرة الشيخ العربي العلوي مع الشيخ تقي الدين الهلالي" (الجرح والتعديل)

const DB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
const AUTH_EMAIL = "firebase-admin@daralhadith.app";
const AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const enc = encodeURIComponent;
const now = new Date().toISOString();

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

// 1) إصلاح مادة ابن تيمية السلفي (المنهج) — قيم/رابط صحيح
const minhaj = {
  id: "arch-minhaj-ibn-taymiyyah-herras",
  title: "ابن تيمية السلفي",
  title_en: "Ibn Taymiyyah the Salafi",
  scholar_id: "herras",
  category_id: "simh-al-manhaj",
  series_id: null,
  episode_number: 0,
  description: "محاضرة ابن تيمية السلفي للشيخ محمد خليل هراس رحمه الله.",
  archive_url: "https://archive.org/details/photo_5956532775676919802_y",
  file_url: "https://ia600600.us.archive.org/26/items/photo_5956532775676919802_y/" + enc("محاضرة_ابن_تيمية_السلفي_الشيخ_محمد_خليل_هراس_01.mp3"),
  duration: 5776,
  file_size: 138631519,
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

// 2) إضافة المناظرة (الجرح والتعديل)
const mounadara = {
  id: "arch-jarh-mounadara-hilali",
  title: "مناظرة الشيخ العربي العلوي مع الشيخ تقي الدين الهلالي",
  title_en: "Munadharah: ash-Shaykh al-Arabi al-Alawi vs ash-Shaykh Taqi al-Din al-Hilali",
  scholar_id: "hilali",
  category_id: "jarh-tadil",
  series_id: null,
  episode_number: 0,
  description: "مناظرة الشيخ العربي العلوي مع الشيخ تقي الدين الهلالي رحمه الله.",
  archive_url: "https://archive.org/details/21-mounadara-sheikh-bel-arbi-alaoui-01",
  file_url: "https://ia800906.us.archive.org/16/items/21-mounadara-sheikh-bel-arbi-alaoui-01/" + enc("21Mounadara_SheikhBelArbiAlaoui_01.mp3"),
  duration: 310,
  file_size: 7442075,
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

// المادة موجودة = لا نضيفها/لا نكررها؛ فقط نستكمل الحقول الناقصة (duration/file_size/file_url) إن كانت صفراً
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

await putIfMissing(minhaj.id, minhaj);
await putIfMissing(mounadara.id, mounadara);

console.log("done");
