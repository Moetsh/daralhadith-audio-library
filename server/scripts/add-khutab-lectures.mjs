// إضافة خطب ومحاضرات منفردة إلى تصنيف خطب ودروس (khutab)
// 1) محاضرة خلق النبي ﷺ في الحج — الشيخ علي بن فهد أبا بطين (جديد)
// 2) محاضرة هل الاحتفال بالمولد بدعة أم سنة؟ — الشيخ محمد أمان الجامي (موجود)

const DB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
const AUTH_EMAIL = "firebase-admin@daralhadith.app";
const AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const enc = encodeURIComponent;
const now = new Date().toISOString();

// scholar جديد — علي بن فهد أبا بطين
const scholar = {
  id: "abin-fahd-ababtin",
  name: "علي بن فهد أبو بطين",
  name_en: "Ali bin Fahd Aba Butain",
  specialization: "العقيدة والسيرة",
  country: "السعودية",
  bio: "الشيخ علي بن فهد أبا بطين، من علماء العقيدة والدعوة، محاضر ومدرس في مساجد المملكة العربية السعودية، عني بدروس العقيدة والسيرة.",
  is_featured: 0,
  status: "active",
};

// المادتان المنفردتان
const items = [
  {
    id: "arch-khutab-khuluq-nabi",
    title: "خلق النبي ﷺ في الحج",
    category_id: "khutab",
    scholar_id: "abin-fahd-ababtin",
    description: "محاضرة خلق النبي ﷺ في الحج للشيخ علي بن فهد أبا بطين حفظه الله.",
    archive_url: "https://archive.org/details/01_20260822_20260822_1147",
    server: "ia800605.us.archive.org",
    dir: "/13/items/01_20260822_20260822_1147",
    fname: "محاضرة_خلق_النبي_ﷺ_في_الحج_الشيخ_علي_بن_فهد_أبابطين_01.mp3",
    duration: 1964,
    file_size: 7863477,
    episode: null,
  },
  {
    id: "arch-khutab-mawlid-jami",
    title: "هل الاحتفال بالمولد بدعة أم سنة؟",
    category_id: "khutab",
    scholar_id: "jami",
    description: "محاضرة هل الاحتفال بالمولد بدعة أم سنة؟ ومتى عُرف هذا الاحتفال؟ للشيخ محمد أمان بن علي الجامي رحمه الله.",
    archive_url: "https://archive.org/details/20260823_20260823_0802",
    server: "ia903104.us.archive.org",
    dir: "/34/items/20260823_20260823_0802",
    fname: "محاضرة_هل_الاحتفال_بالمولد_بدعة_أو_سنة_؟_ومتى_عرف_هذا_الاحتفال_الشيخ.mp3",
    duration: 905,
    file_size: 21724265,
    episode: null,
  },
];

function buildAudio(it) {
  const base = `https://${it.server}${it.dir}/`;
  return {
    id: it.id,
    title: it.title,
    scholar_id: it.scholar_id,
    category_id: it.category_id,
    series_id: null,
    episode_number: 0,
    description: it.description,
    archive_url: it.archive_url,
    file_url: base + enc(it.fname),
    duration: it.duration,
    file_size: it.file_size,
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
}

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

await db(`scholars/${scholar.id}`, "PUT", scholar);
console.log("scholar PUT OK:", scholar.id);

for (const it of items) {
  await db(`audios/${it.id}`, "PUT", buildAudio(it));
  console.log(`audio PUT OK: ${it.id}`);
}

console.log("done");
