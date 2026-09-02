/* توليد أغلفة PNG لكل شريط — node server/scripts/gen-covers.mjs
   يقرأ من Firebase (أشرطة + علماء + تصنيفات) ويولّد غلافاً زخرفياً لكل شريط
   في public/covers/{id}.png ليُضمَّن في التطبيق. */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const OUT_DIR = path.join(process.cwd(), "public", "covers");
/* نسخة يخدمها الخادم على الإنتاج عبر express.static(adminDist) */
const OUT_DIR_ADMIN = path.join(process.cwd(), "admin", "dist", "covers");

const get = async (p) => {
  const r = await fetch(`${RTDB_URL}/${p}.json`);
  if (!r.ok) throw new Error(`HTTP ${r.status} لـ ${p}`);
  return Object.values(await r.json()) || [];
};

/* ألوان وزخارف كل فئة — من cat-styles.mjs (هوية مميزة لكل قسم وفرع) */
const { CAT_STYLES, ornamentByType } = await import("./cat-styles.mjs");
/* ألوان الفئات الأب كاحتياط */
const PARENT_FALLBACK = {
  quran: "tafsir", aqeedah: "sharh-aq", hadith: "bukhari", fiqh: "ibadat",
  seerah: "sahaba", raqaiq: "athkar", fatawa: "ft-salah", lugha: "arab",
  matn: "matn-tawheed", usul: "usul-rabahiyya", tafsir: "tafsir-araf", sharh_aq: "sharh-tawheed",
};
const DEFAULT_STYLE = { bg: "#3a3a3a", accent: "#d0d0d0", orn: "star8" };

function styleFor(catId) {
  if (CAT_STYLES[catId]) return CAT_STYLES[catId];
  if (PARENT_FALLBACK[catId] && CAT_STYLES[PARENT_FALLBACK[catId]]) return CAT_STYLES[PARENT_FALLBACK[catId]];
  return DEFAULT_STYLE;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* هاش بسيط لتوليد أرقام عشوائية ثابتة من النص */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* تقسيم العنوان إلى أسطر متوازنة حسب الطول (حتى 5 أسطر) */
function wrapTitle(t) {
  const words = String(t ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const total = words.join(" ").length;
  const nLines = Math.min(5, Math.max(1, Math.ceil(total / 20)));
  const target = Math.ceil(total / nLines);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? cur + " " + w : w;
    if (cand.length > target && cur && lines.length < nLines - 1) {
      lines.push(cur);
      cur = w;
    } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ==================== زخارف إسلامية ==================== */

/* نجمة ثمانية في الزاوية */
function cornerStar(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI / 8) * i;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>`;
}

/* نجمة ثمانية مملوءة في الوسط */
function centerStar8(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI / 8) * i - Math.PI / 8;
    const rad = i % 2 === 0 ? r : r * 0.38;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.35"/>`;
}

/* نجمة ستة */
function star6(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI / 6) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.5;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.35"/>`;
}

/* نجمة عشرية */
function star10(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const ang = (Math.PI / 10) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.35;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>`;
}

/* هلال */
function crescent(cx, cy, r, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.3"/>
  <circle cx="${cx + r * 0.35}" cy="${cy - r * 0.1}" r="${r * 0.78}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.3"/>`;
}

/* مزخرف هندسي مركزي — نجمة8 داخل مaru八角 */
function geometricRosette(cx, cy, r, color) {
  const inner = r * 0.55;
  let oct = "";
  for (let i = 0; i < 8; i++) {
    const a1 = (Math.PI / 4) * i - Math.PI / 8;
    const a2 = (Math.PI / 4) * (i + 1) - Math.PI / 8;
    oct += `M${(cx + Math.cos(a1) * r).toFixed(1)},${(cy + Math.sin(a1) * r).toFixed(1)} `;
    oct += `L${(cx + Math.cos(a2) * r).toFixed(1)},${(cy + Math.sin(a2) * r).toFixed(1)} `;
  }
  let star = "";
  for (let i = 0; i < 8; i++) {
    const a1 = (Math.PI / 4) * i;
    const a2 = (Math.PI / 4) * (i + 0.5);
    const a3 = (Math.PI / 4) * (i + 1);
    star += `M${(cx + Math.cos(a1) * inner).toFixed(1)},${(cy + Math.sin(a1) * inner).toFixed(1)} `;
    star += `L${(cx + Math.cos(a2) * r * 0.85).toFixed(1)},${(cy + Math.sin(a2) * r * 0.85).toFixed(1)} `;
    star += `L${(cx + Math.cos(a3) * inner).toFixed(1)},${(cy + Math.sin(a3) * inner).toFixed(1)} `;
  }
  return `<path d="${oct}Z" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.25"/>
  <path d="${star}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.25"/>`;
}

/* دوائر متداخلة */
function interlockingCircles(cx, cy, r, color) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = cx + Math.cos(a) * r * 0.45;
    const y = cy + Math.sin(a) * r * 0.45;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.22"/>`;
  }
  return s;
}

/* شبكة هندسية — خطوط متوازية متقاطعة */
function geoGrid(cx, cy, r, color) {
  const step = r * 0.35;
  let s = `<g opacity="0.15" stroke="${color}" stroke-width="1">`;
  for (let d = -r; d <= r; d += step) {
    s += `<line x1="${(cx - r).toFixed(1)}" y1="${(cy + d).toFixed(1)}" x2="${(cx + r).toFixed(1)}" y2="${(cy + d).toFixed(1)}"/>`;
    s += `<line x1="${(cx + d).toFixed(1)}" y1="${(cy - r).toFixed(1)}" x2="${(cx + d).toFixed(1)}" y2="${(cy + r).toFixed(1)}"/>`;
  }
  s += `</g>`;
  return s;
}

/* نجمة خماسية */
function star5(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.4;
    pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" opacity="0.3"/>`;
}

/* رموز الزخارف حسب نوعها */
const ORNAMENTS = [
  (cx, cy, r, c) => centerStar8(cx, cy, r, c),
  (cx, cy, r, c) => star6(cx, cy, r, c),
  (cx, cy, r, c) => star10(cx, cy, r, c),
  (cx, cy, r, c) => crescent(cx, cy, r, c),
  (cx, cy, r, c) => geometricRosette(cx, cy, r, c),
  (cx, cy, r, c) => interlockingCircles(cx, cy, r, c),
  (cx, cy, r, c) => star5(cx, cy, r, c),
];

/* زخرفة الزاوية — تختلف حسب الزاوية */
const CORNER_ORNAMENTS = [
  (cx, cy, r, c) => cornerStar(cx, cy, r, c),
  (cx, cy, r, c) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="1.8" opacity="0.45"/>`;
  },
  (cx, cy, r, c) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.5;
      pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="1.8" opacity="0.45"/>`;
  },
  (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="1.8" opacity="0.4"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.3"/>`,
];

function makeSvg({ title, scholar, cat, audioId, episode, series, size = 320 }) {
  const st = styleFor(cat);
  const bg = st.bg;
  const accent = st.accent;
  const gold = "#e9d9a6";
  const cream = "#f4ecd7";
  const cx = size / 2;

  const h = hashStr(audioId || title);
  const cornerIdx = (h >> 3) % CORNER_ORNAMENTS.length;
  const hasGeoGrid = (h >> 6) % 3 === 0;

  const lines = wrapTitle(title);
  const n = lines.length;
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  /* خط متكيّف — Aref Ruqaa عريض: معامل 0.78 من حجم الخط للرمز العربي */
  const baseFont = [30, 27, 24, 21, 19][Math.min(n - 1, 4)];
  let titleFont = Math.min(baseFont, Math.floor(215 / (maxLen * 0.78)));
  if (titleFont < 13) titleFont = 13;
  const lineGap = n === 1 ? 0 : Math.round(titleFont * 1.3);
  const titleH = n === 1 ? titleFont : titleFont + (n - 1) * lineGap;

  /* العنوان في منتصف الغلاف عمودياً — البسملة أعلى والشيخ أسفل */
  const midY = size / 2 + 8;                       /* مركز بصري مُزاح قليلاً للأسفل */
  const titleTop = midY - titleH / 2;              /* أعلى كتلة العنوان */
  const titleY = titleTop + titleFont * 0.78;      /* baseline السطر الأول */
  const scholarName = scholar || "";
  const sub = series ? `${series}` : "";
  const sepY = Math.min(titleTop + titleH + 18, size - 92);
  const clamped = sepY >= size - 92;
  const schOff = clamped ? 21 : 24;
  const subOff = clamped ? 41 : 48;

  const cornerFn = CORNER_ORNAMENTS[cornerIdx];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="14" y="14" width="${size - 28}" height="${size - 28}" rx="16" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
  <rect x="24" y="24" width="${size - 48}" height="${size - 48}" rx="12" fill="none" stroke="${accent}" stroke-width="1" opacity="0.35"/>
  ${hasGeoGrid ? geoGrid(cx, cx, size * 0.35, accent) : ""}
  ${cornerFn(40, 40, 18, accent)}
  ${cornerFn(size - 40, 40, 18, accent)}
  ${cornerFn(40, size - 40, 18, accent)}
  ${cornerFn(size - 40, size - 40, 18, accent)}
  ${ornamentByType(st.orn || "star8", cx, cx, size * 0.30, accent)}
  <text x="${cx}" y="76" font-family="Aref Ruqaa" font-size="17" fill="${gold}" text-anchor="middle" opacity="0.9">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</text>
  <text x="${cx}" y="${titleY}" font-family="Aref Ruqaa" font-size="${titleFont}" fill="${cream}" text-anchor="middle">
    ${lines.map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : lineGap}">${esc(l)}</tspan>`).join("")}
  </text>
  <line x1="${size * 0.22}" y1="${sepY}" x2="${size * 0.78}" y2="${sepY}" stroke="${accent}" stroke-width="1.2" opacity="0.7"/>
  <text x="${cx}" y="${sepY + schOff}" font-family="Aref Ruqaa" font-size="22" fill="${gold}" text-anchor="middle">${esc(scholarName)}</text>
  ${sub ? `<text x="${cx}" y="${sepY + subOff}" font-family="Aref Ruqaa" font-size="16" fill="${cream}" text-anchor="middle" opacity="0.85">${esc(sub)}</text>` : ""}
</svg>`;
}

export { makeSvg };

if (process.env.COVER_TEST) { /* وضع الاختبار — بدون توليد */ }
else {

const audios = await get("audios").then((list) => list.filter((a) => a && a.status === "published" && a.title && !a.cover_image_url));
const scholars = await get("scholars");
const cats = await get("categories");
const series = await get("series");

const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "";
const seriesTitle = (id) => series.find((s) => s.id === id)?.title || "";

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR_ADMIN, { recursive: true });
console.log(`توليد أغلفة لـ ${audios.length} شريطاً...`);

let ok = 0, fail = 0;
for (const a of audios) {
  try {
    const svg = makeSvg({
      title: a.title,
      scholar: scholarName(a.scholar_id),
      cat: a.category_id,
      audioId: a.id,
      episode: a.episode_number,
      series: seriesTitle(a.series_id),
    });
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 320 },
      font: {
        fontFiles: ["C:/Windows/Fonts/aref-bold.ttf"],
        loadSystemFonts: false,
        defaultFontFamily: "Aref Ruqaa",
      },
    });
    const png = resvg.render().asPng();
    fs.writeFileSync(path.join(OUT_DIR, `${a.id}.png`), png);
    fs.writeFileSync(path.join(OUT_DIR_ADMIN, `${a.id}.png`), png);
    ok++;
    if (ok % 100 === 0) console.log(`  ${ok}/${audios.length}...`);
  } catch (e) {
    fail++;
    if (fail <= 5) console.error(`  [ERR] ${a.id}: ${e.message}`);
  }
}
console.log(`تم: ${ok} غلافاً، فشل: ${fail}`);

} /* نهاية وضع التوليد */
