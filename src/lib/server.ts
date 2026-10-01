/* التكامل مع خادم لوحة التحكم: جلب الأشرطة المنشورة وعرضها في التطبيق */
import type { AudioItem, Category, Scholar, Series } from "../data/library";

export interface ServerAudio {
  id: string;
  title: string;
  scholar_id: string;
  category_id: string;
  sub_category_id?: string | null;
  series_id?: string | null;
  episode_number?: number | null;
  description?: string | null;
  archive_url?: string | null;
  file_url?: string | null;
  cover_image_url?: string | null;
  duration?: number | null;
  added_days?: number | null;
  listen_count?: number | null;
  status?: string | null;
}
export interface ServerCategory {
  id: string;
  name: string;
  parent_id?: string | null;
  icon?: string | null;
}
export interface ServerScholar {
  id: string;
  name: string;
  bio?: string | null;
  specialization?: string | null;
  country?: string | null;
}
export interface ServerSeries {
  id: string;
  title: string;
  scholar_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  total_episodes?: number | null;
}

export const toAudio = (a: ServerAudio): AudioItem => {
  const stream = a.file_url || a.archive_url || "";
  return {
    id: a.id,
    title: a.title,
    scholarId: a.scholar_id,
    categoryId: a.category_id,
    subCategoryId: a.sub_category_id || undefined,
    duration: Number(a.duration) || 0,
    description: a.description || "",
    archiveUrl: a.archive_url || stream,
    streamUrl: stream,
    streamAlt: stream,
    addedDays: Number(a.added_days) || 0,
    listenCount: Number(a.listen_count) || 0,
    seriesId: a.series_id || undefined,
    episode: a.episode_number ?? undefined,
    cover: coverUrl(a.cover_image_url || "", a.id),
  };
};

export const toCat = (c: ServerCategory): Category => ({
  id: c.id,
  name: c.name,
  parent: c.parent_id || undefined,
  icon: c.icon || "book",
});

export const toScholar = (s: ServerScholar): Scholar => ({
  id: s.id,
  name: s.name,
  title: s.specialization || "",
  bio: s.bio || "",
  era: s.country || "",
});

export const toSeries = (s: ServerSeries): Series => ({
  id: s.id,
  title: s.title,
  scholarId: s.scholar_id || "",
  categoryId: s.category_id || "",
  desc: s.description || "",
  totalEpisodes: Number(s.total_episodes) || 0,
});

export const RTDB_URL =
  "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";

const MAX_AUDIOS = 5000;
const toArray = <T,>(obj: Record<string, T> | null): T[] => Object.values(obj ?? {});

/* ═══ الحزمة الخفيفة (المفضّلة) ═══
   الحزمة مضغوطة عند الخادم (gzip) ومخزّنة مؤقتاً، وتتجنّب إرسال الحقول الثقيلة
   (description/tags/dates) التي كانت تُبطئ ظهور الأشرطة وتfringح ذاكرة الجهاز. */
const PACK_URL = "https://daralhadith.vercel.app/api/admin/client-pack";

/* أغلفة archive.org: نعيد بناء الرابط من المعرّف المحفوظ (يوفّر 6MB من Payload) */
const coverUrl = (idOrCover: string, audioId: string): string => {
  const c = idOrCover || "";
  if (!c) return `/covers/${audioId}.jpg`;
  if (c.startsWith("http")) return c;
  return `https://archive.org/services/img/${encodeURIComponent(c)}`;
};

type Pack = {
  v: number;
  a: Record<string, [string, string, string, string, number, string, number, string, string]>;
  s: Record<string, [string, string, string, number]>;
  c: [string, string, string, string][];
  h: [string, string, string, string, string, number][];
};

const unpack = (p: Pack) => {
  const audios: ServerAudio[] = [];
  for (const [id, r] of Object.entries(p.a || {})) {
    audios.push({
      id,
      scholar_id: r[0],
      category_id: r[1],
      series_id: r[2] || null,
      title: r[3],
      duration: r[4],
      cover_image_url: r[5] || null,
      episode_number: r[6] >= 0 ? r[6] : null,
      /* روابط البث تُجلب عند الطلب: r[7]=archive_id و r[8]=اسم الملف */
      archive_url: r[7] ? `https://archive.org/details/${encodeURIComponent(r[7])}` : "",
      /* نحافظ على ترميز filename كامل (-slashes-%20) — نفس رابط RTDB الأصلي */
      file_url: r[7] && r[8] ? `https://archive.org/download/${r[7]}/${r[8]}` : "",
      description: "",
      status: "published",
    });
  }
  const series: ServerSeries[] = [];
  for (const [id, r] of Object.entries(p.s || {})) {
    series.push({ id, title: r[0], scholar_id: r[1], category_id: r[2], total_episodes: r[3] });
  }
  const cats: ServerCategory[] = (p.c || []).map((r) => ({ id: r[0], name: r[1], parent_id: r[2] || null, icon: r[3] || null }));
  const scholars: ServerScholar[] = (p.h || []).map((r) => ({ id: r[0], name: r[1], title: r[2], bio: r[3], era: r[4], reciter: !!r[5] }));
  return { audios, cats, scholars, series };
};

async function fetchPack(): Promise<ReturnType<typeof unpack> | null> {
  try {
    const res = await fetch(PACK_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const p = (await res.json()) as Pack;
    if (!p || p.v !== 1 || !p.a) return null;
    return unpack(p);
  } catch {
    return null;
  }
}

/* يجلب كل الأشرطة المنشورة + التصنيفات + العلماء + السلاسل من الخادم */
export async function fetchServerContent() {
  const pack = await fetchPack();
  if (pack && pack.audios.length) return pack;

  const [audiosRes, catsRes, schRes, serRes] = await Promise.all([
    fetch(`${RTDB_URL}/audios.json`),
    fetch(`${RTDB_URL}/categories.json`),
    fetch(`${RTDB_URL}/scholars.json`),
    fetch(`${RTDB_URL}/series.json`),
  ]);
  if (!audiosRes.ok || !catsRes.ok || !schRes.ok || !serRes.ok)
    throw new Error("تعذّر الاتصال بالخادم");

  const audios = (toArray<ServerAudio>(await audiosRes.json().catch(() => null)) || [])
    .filter((a) => a.status == null || a.status === "published")
    .slice(0, MAX_AUDIOS);
  const cats = toArray<ServerCategory>(await catsRes.json().catch(() => null)) || [];
  const scholars = toArray<ServerScholar>(await schRes.json().catch(() => null)) || [];
  const series = toArray<ServerSeries>(await serRes.json().catch(() => null)) || [];

  return { audios, cats, scholars, series };
}
