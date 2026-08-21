/* التكامل مع Internet Archive: فحص الرابط، جلب الملفات، عنوان عربي */
const EXTRACT = /archive\.org\/(?:details|download)\/([^/?#]+)/i;
export const extractIdentifier = (url) => {
  const t = (url || "").trim();
  if (!t) return null;
  const m = t.match(EXTRACT);
  if (m) return decodeURIComponent(m[1]);
  return /^[A-Za-z0-9._-]+$/.test(t) ? t : null;
};

const AR = "٠١٢٣٤٥٦٧٨٩";
const arNum = (n) => String(n).replace(/[0-9]/g, (d) => AR[+d]);

const scrub = (s) =>
  String(s || "")
    .replace(/\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+[-–—]\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

const AR_L = { a: "أ", b: "ب", c: "ج", d: "د", e: "هـ" };

export const trackTitle = (f, index) => {
  const meta = scrub(f.title);
  if (/[\u0600-\u06FF]/.test(meta)) return meta;
  const name = scrub(f.name);
  const lead = name.match(/^0*(\d+)([a-z]?)/i);
  if (lead) {
    const l = lead[2] ? (AR_L[lead[2].toLowerCase()] ?? "") : "";
    return `الشريط ${arNum(parseInt(lead[1], 10))}${l}`;
  }
  if (/[\u0600-\u06FF]/.test(name)) return name;
  const m = name.match(/(\d+)/);
  if (m) return `الشريط ${arNum(parseInt(m[1], 10))}`;
  return `الشريط ${arNum(index + 1)}`;
};

const parseLen = (v) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":").map((x) => parseFloat(x));
  if (parts.some((x) => isNaN(x))) return 0;
  const [hh, mm, ss] = parts.length === 3 ? parts : parts.length === 2 ? [0, ...parts] : [0, 0, parts[0]];
  return (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
};

export const fileDownloadUrl = (id, name) =>
  "https://archive.org/download/" + id + "/" + name.split("/").map(encodeURIComponent).join("/");

/* فحص رابط عنصر: يعيد معلومات ملفاته الصوتية */
export async function inspectArchive(urlOrId) {
  const id = extractIdentifier(urlOrId);
  if (!id) return { ok: false, error: "رابط غير صالح" };
  const res = await fetch("https://archive.org/metadata/" + encodeURIComponent(id));
  if (!res.ok) return { ok: false, error: "تعذّر الوصول للعنصر (HTTP " + res.status + ")" };
  const j = await res.json();
  const files = (j.files ?? [])
    .filter((f) => /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i.test(f.name || "") || /MP3/i.test(f.format || ""))
    .filter((f) => !/(image|cover|jpeg|zip|playlist)/i.test(f.format || ""))
    .map((f, i) => ({
      name: f.name,
      title: trackTitle(f, i),
      length: parseLen(f.length),
      size: parseInt(f.size, 10) || 0,
      url: fileDownloadUrl(id, f.name),
    }));
  files.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  return {
    ok: true,
    identifier: id,
    title: j.metadata?.title || null,
    creator: j.metadata?.creator || null,
    description: j.metadata?.description || null,
    files,
  };
}

export { arNum };
