// إضافة شرح صحيح البخاري كتاب الإيمان للشيخ عبيد بن عبد الله الجابري

const DB = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
const AUTH_EMAIL = "firebase-admin@daralhadith.app";
const AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";

const server = "ia800502.us.archive.org";
const dir = "/10/items/photo_5832455675916173884_y";
const base = `https://${server}${dir}/`;

const enc = encodeURIComponent;

// scholar
const scholar = {
  id: "al-jabiri",
  name: "عبيد بن عبد الله الجابري",
  name_en: "Ubayd bin Abdullah al-Jabiri",
  specialization: "الحديث",
  country: "المدينة المنورة",
  bio: "الشيخ عبيد بن عبد الله بن سليمان الجابري، من علماء الحديث المعاصرين، من تلاميذ الشيخ محمد أمان الجامي والشيخ مقبل الوادعي، اشتغل بالتدريس في الحرم النبوي والمساجد.",
  is_featured: 0,
  status: "active",
};

// series
const series = {
  id: "sr-شرح-صحيح-البخاري-الايمان-الجابري",
  title: "شرح صحيح البخاري — كتاب الإيمان",
  title_en: "Sharh Sahih al-Bukhari - Kitab al-Iman",
  scholar_id: "al-jabiri",
  category_id: "bukhari",
  description: "شرح صحيح البخاري كتاب الإيمان للشيخ عبيد بن عبد الله الجابري حفظه الله.",
  total_episodes: 9,
  status: "published",
};

// lessons: N (باستثناء 9 المفقود)
const lessons = [
  { n: 1, title: "الدرس الأول", duration: 3591.05 },
  { n: 2, title: "الدرس الثاني", duration: 3758.35 },
  { n: 3, title: "الدرس الثالث", duration: 3941.97 },
  { n: 4, title: "الدرس الرابع", duration: 3628.77 },
  { n: 5, title: "الدرس الخامس", duration: 4401.04 },
  { n: 6, title: "الدرس السادس", duration: 5376.3 },
  { n: 7, title: "الدرس السابع", duration: 2978.98 },
  { n: 8, title: "الدرس الثامن", duration: 5304.7 },
  { n: 10, title: "الدرس العاشر", duration: 3387.59 },
];

const now = new Date().toISOString();

function buildAudio(lesson) {
  const fname = `شرح_صحيح_البخاري_الشيخ_عبيد_بن_عبد_الله_الجابري_الدرس_${lesson.n}_01.mp3`;
  return {
    id: `arch-bukhari-iman-jabiri-${lesson.n}`,
    title: lesson.title,
    scholar_id: "al-jabiri",
    category_id: "bukhari",
    series_id: series.id,
    episode_number: lesson.n,
    description: `شرح صحيح البخاري كتاب الإيمان - ${lesson.title} للشيخ عبيد بن عبد الله الجابري حفظه الله`,
    archive_url: "https://archive.org/details/photo_5832455675916173884_y",
    file_url: base + enc(fname),
    duration: Math.round(lesson.duration),
    status: "published",
    allow_download: 1,
    is_featured: 0,
    listen_count: 0,
    download_count: 0,
    added_days: 0,
    created_at: now,
    updated_at: now,
    published_at: now,
  };
}

async function db(path, verb, body) {
  const authR = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD, returnSecureToken: true }),
    },
  );
  const auth = await authR.json();
  if (!authR.ok || !auth.idToken) throw new Error(`Auth failed: ${auth?.error?.message}`);
  const url = `${DB}/${path}.json?auth=${encodeURIComponent(auth.idToken)}`;
  const r = await fetch(url, {
    method: verb,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}: ${await r.text()}`);
  return r.json();
}

await db(`scholars/${scholar.id}`, "PUT", scholar);
console.log("scholar PUT OK");

await db(`series/${encodeURIComponent(series.id)}`, "PUT", series);
console.log("series PUT OK");

for (const l of lessons) {
  const a = buildAudio(l);
  await db(`audios/${a.id}`, "PUT", a);
  console.log(`audio ${a.id} PUT OK`);
}
