/* توليد أغلفة PNG لكل شريط — node server/scripts/gen-covers.mjs
   يقرأ من Firebase (أشرطة + علماء + تصنيفات) ويولّد غلافاً زخرفياً لكل شريط
   في public/covers/{id}.png ليُضمَّن في التطبيق. */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const OUT_DIR = path.join(process.cwd(), "public", "covers");

const get = async (p) => {
  const r = await fetch(`${RTDB_URL}/${p}.json`);
  if (!r.ok) throw new Error(`HTTP ${r.status} لـ ${p}`);
  return Object.values(await r.json()) || [];
};

/* ألوان وتصاميم لكل تصنيف — bg: اللون الأساسي، accent: لون الزخرفة، dark: للحدود العلوية */
const CAT_STYLE = {
  quran:   { bg: "#1a6b3c", accent: "#b8e6c8", dark: "#0d4a28" },
  aqeedah: { bg: "#1a3a5c", accent: "#a8c8e8", dark: "#0d2440" },
  hadith:  { bg: "#6b1a2a", accent: "#e8a8b8", dark: "#4a0d1a" },
  fiqh:    { bg: "#1a5c5c", accent: "#a8e0e0", dark: "#0d3a3a" },
  seerah:  { bg: "#7a5a1a", accent: "#e8d0a0", dark: "#5a3d0d" },
  raqaiq:  { bg: "#4a1a5c", accent: "#d0a8e8", dark: "#2d0d40" },
  fatawa:  { bg: "#3a5a1a", accent: "#c0e0a0", dark: "#26400d" },
  khutab:  { bg: "#5c3a1a", accent: "#e0c0a0", dark: "#3d240d" },
};
const DEFAULT_STYLE = { bg: "#3a3a3a", accent: "#d0d0d0", dark: "#242424" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* هاش بسيط لتوليد أرقام عشوائية ثابتة من النص */
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* تقسيم العنوان إلى سطر أو سطرين أو ثلاثة */
function wrapTitle(t, max = 24) {
  const s = t.trim();
  if (s.length <= max) return [s];
  const mid = Math.floor(s.length / 2);
  const cut = s.slice(0, mid);
  let best = -1;
  for (let i = 0; i < cut.length; i++) {
    if (" -–—".includes(s[mid + i]) || " -–—".includes(s[mid - i])) { best = i; break; }
  }
  const idx = best >= 0 ? mid + best : mid;
  const line1 = s.slice(0, idx).trim();
  const line2 = s.slice(idx).trim();
  if (line2.length > max + 4) {
    const cut2 = Math.floor(line2.length / 2);
    let b2 = -1;
    for (let i = 0; i < cut2; i++) {
      if (" -–—".includes(line2[cut2 + i]) || " -–—".includes(line2[cut2 - i])) { b2 = i; break; }
    }
    const i2 = b2 >= 0 ? cut2 + b2 : cut2;
    return [line1, line2.slice(0, i2).trim(), line2.slice(i2).trim()];
  }
  return [line1, line2];
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
  const st = CAT_STYLE[cat] || DEFAULT_STYLE;
  const bg = st.bg;
  const accent = st.accent;
  const dark = st.dark;
  const gold = "#e9d9a6";
  const cream = "#f4ecd7";
  const cx = size / 2;

  const h = hashStr(audioId || title);
  const ornIdx = h % ORNAMENTS.length;
  const cornerIdx = (h >> 3) % CORNER_ORNAMENTS.length;
  const hasGeoGrid = (h >> 6) % 3 === 0;

  const lines = wrapTitle(title);
  const n = lines.length;
  const titleFont = n === 1 ? 30 : n === 2 ? 28 : 24;
  const lineGap = n === 1 ? 0 : n === 2 ? 36 : 30;
  const titleH = n === 1 ? titleFont : titleFont + (n - 1) * lineGap;
  const titleY = 70 + ((120 - titleH) / 2);
  const scholarName = scholar || "";
  const sub = series ? `${series}` : "";
  const sepY = titleY + titleH + 16;

  const cornerFn = CORNER_ORNAMENTS[cornerIdx];
  const ornFn = ORNAMENTS[ornIdx];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="14" y="14" width="${size - 28}" height="${size - 28}" rx="16" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.6"/>
  <rect x="24" y="24" width="${size - 48}" height="${size - 48}" rx="12" fill="none" stroke="${accent}" stroke-width="1" opacity="0.35"/>
  ${hasGeoGrid ? geoGrid(cx, cx, size * 0.35, accent) : ""}
  ${cornerFn(40, 40, 18, accent)}
  ${cornerFn(size - 40, 40, 18, accent)}
  ${cornerFn(40, size - 40, 18, accent)}
  ${cornerFn(size - 40, size - 40, 18, accent)}
  ${ornFn(cx, cx, size * 0.28, accent)}
  <text x="${cx}" y="76" font-family="Aref Ruqaa" font-size="17" fill="${gold}" text-anchor="middle" opacity="0.9">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</text>
  <text x="${cx}" y="${titleY}" font-family="Aref Ruqaa" font-size="${titleFont}" fill="${cream}" text-anchor="middle">
    ${lines.map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : lineGap}">${esc(l)}</tspan>`).join("")}
  </text>
  <line x1="${size * 0.22}" y1="${sepY}" x2="${size * 0.78}" y2="${sepY}" stroke="${accent}" stroke-width="1.2" opacity="0.7"/>
  <text x="${cx}" y="${sepY + 24}" font-family="Aref Ruqaa" font-size="22" fill="${gold}" text-anchor="middle">${esc(scholarName)}</text>
  ${sub ? `<text x="${cx}" y="${sepY + 48}" font-family="Aref Ruqaa" font-size="16" fill="${cream}" text-anchor="middle" opacity="0.85">${esc(sub)}</text>` : ""}
</svg>`;
}

const audios = await get("audios").then((list) => list.filter((a) => a && a.status === "published" && a.title));
const scholars = await get("scholars");
const cats = await get("categories");
const series = await get("series");

const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "";
const seriesTitle = (id) => series.find((s) => s.id === id)?.title || "";

fs.mkdirSync(OUT_DIR, { recursive: true });
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
    ok++;
    if (ok % 100 === 0) console.log(`  ${ok}/${audios.length}...`);
  } catch (e) {
    fail++;
    if (fail <= 5) console.error(`  [ERR] ${a.id}: ${e.message}`);
  }
}
console.log(`تم: ${ok} غلافاً، فشل: ${fail}`);
