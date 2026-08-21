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
    cover: a.cover_image_url || `/covers/${a.id}.png`,
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

/* يجلب كل الأشرطة المنشورة + التصنيفات + العلماء + السلاسل من Firebase */
export async function fetchServerContent() {
  const [audiosRes, catsRes, schRes, serRes] = await Promise.all([
    fetch(`${RTDB_URL}/audios.json`),
    fetch(`${RTDB_URL}/categories.json`),
    fetch(`${RTDB_URL}/scholars.json`),
    fetch(`${RTDB_URL}/series.json`),
  ]);
  if (!audiosRes.ok || !catsRes.ok || !schRes.ok || !serRes.ok)
    throw new Error("تعذّر الاتصال بقاعدة البيانات");

  const audios = (toArray<ServerAudio>(await audiosRes.json().catch(() => null)) || [])
    .filter((a) => a.status == null || a.status === "published")
    .slice(0, MAX_AUDIOS);
  const cats = toArray<ServerCategory>(await catsRes.json().catch(() => null)) || [];
  const scholars = toArray<ServerScholar>(await schRes.json().catch(() => null)) || [];
  const series = toArray<ServerSeries>(await serRes.json().catch(() => null)) || [];

  return { audios, cats, scholars, series };
}
