/* الوصول إلى Internet Archive API — جلب بيانات السلاسل والأشرطة */
import { ar } from "./utils";

const EXTRACT = /archive\.org\/(?:details|download)\/([^/?#]+)/i;

export const extractIdentifier = (url: string): string | null => {
  const t = url.trim();
  if (!t) return null;
  const m = t.match(EXTRACT);
  if (m) return decodeURIComponent(m[1]);
  if (/^[A-Za-z0-9._-]+$/.test(t)) return t; // معرف مباشر
  return null;
};

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i;
const SKIP_RE = /\.(jpg|jpeg|png|gif|txt|pdf|zip|xml|json|htm|html|css|js|svg)$/i;

export interface ArchFile {
  name: string;
  title?: string;
  track?: number;
  length: number;
}

const parseLen = (v: string | number | undefined | null): number => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":").map((x) => parseFloat(x));
  if (parts.some((x) => isNaN(x))) return 0;
  const [hh, mm, ss] = parts.length === 3 ? parts : parts.length === 2 ? [0, ...parts] : [0, 0, parts[0]];
  return (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
};

export const fileDownloadUrl = (identifier: string, name: string) =>
  "https://archive.org/download/" + identifier + "/" + name.split("/").map(encodeURIComponent).join("/");

/* تنظيف اسم ملف/عنوان */
const scrub = (s: string) =>
  s
    .replace(/\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i, "")
    .replace(/[_]/g, " ")
    .replace(/\s+[-–—]\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

/* عنوان عربي للشريط: عنوان عربي من الأرشيف → رقم الشريط من الاسم → ترقيم تسلسلي */
const AR_L: Record<string, string> = { a: "أ", b: "ب", c: "ج", d: "د", e: "هـ" };

export const trackTitle = (f: ArchFile, index: number): string => {
  const meta = scrub(f.title || "");
  if (/[\u0600-\u06FF]/.test(meta)) return meta;
  const name = scrub(f.name || "");
  const lead = name.match(/^0*(\d+)([a-z]?)/i);
  if (lead) {
    const n = parseInt(lead[1], 10);
    const l = lead[2] ? (AR_L[lead[2].toLowerCase()] ?? "") : "";
    return `الشريط ${ar(n)}${l}`;
  }
  if (/[\u0600-\u06FF]/.test(name)) return name;
  const m = name.match(/(\d+)/);
  if (m) return `الشريط ${ar(parseInt(m[1], 10))}`;
  return `الشريط ${ar(index + 1)}`;
};

export async function fetchArchiveSeries(identifier: string): Promise<{ title?: string; creator?: string; files: ArchFile[] }> {
  const res = await fetch("https://archive.org/metadata/" + encodeURIComponent(identifier));
  if (!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  const files: ArchFile[] = (j.files ?? [])
    .filter((f: any) => AUDIO_RE.test(f.name || "") || (typeof f.format === "string" && f.format.includes("MP3")))
    .filter((f: any) => !(SKIP_RE.test(f.name || "") || (f.format && /image|cover|jpeg|zip|playlist/i.test(String(f.format)))))
    .map((f: any) => ({
      name: f.name,
      title: f.title || f.name,
      track: parseInt(f.track, 10) || undefined,
      length: parseLen(f.length),
    }));
  files.sort((a, b) => {
    const ta = a.track ?? Number.MAX_SAFE_INTEGER;
    const tb = b.track ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return String(a.name).localeCompare(String(b.name), "en", { numeric: true });
  });
  return { title: j.metadata?.title, creator: j.metadata?.creator, files };
}
