/* أغلفة الأشرطة — طراز دار الحديث المزخرف المطابق لسكربت React Native (patternUri + tintColor)
   مربع 640×640 — خلفية داكنة + زخرفة هندسية إسلامية ملوّنة بلون التمييز (شفافية منخفضة)
   شعار أعلى، شارة الشريط، عنوان (مع بادئة)، فاصل زخرفي، اسم الشيخ أسفل.
   node server/scripts/gen-covers-lux.mjs  (SAMPLE=1 للعينات) */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const RTDB_URL = "https://daralhadith-8e2c5-default-rtdb.europe-west1.firebasedatabase.app";
const OUT_DIR = path.join(process.cwd(), "dist", "covers");

const FONTS = [
  "C:/Windows/Fonts/aref-bold.ttf",
  "C:/Windows/Fonts/arabtype.ttf",
];

/* خمسة تلوينات داكنة — accent للإطار والعنوان */
const THEMES = {
  gold:    { bg: "#111622", bg2: "#171d2e", accent: "#e8c56a", soft: "#cbd5e1", author: "#f1c40f" },
  emerald: { bg: "#0d1f18", bg2: "#12291f", accent: "#6fd8a0", soft: "#c8dcd2", author: "#a8e6c4" },
  navy:    { bg: "#0e1526", bg2: "#141d33", accent: "#7fb2f0", soft: "#c9d4e8", author: "#a8c8f0" },
  maroon:  { bg: "#1f1013", bg2: "#2a161b", accent: "#e89aa8", soft: "#e0ccd0", author: "#f0b8c4" },
  copper:  { bg: "#1c130c", bg2: "#261a10", accent: "#e0a878", soft: "#e0d4c8", author: "#f0c898" },
};

const CAT_THEME = {
  gold:    ["khutab","seerah","sirah","sahaba","ulama","tarikh","raqaiq","athkar","tazkiyah","akhlaq","fadail","fatawa","ft-salah","ft-zakah","ft-hajj","ft-muam"],
  emerald: ["quran","tilawat","tafsir","tafsir-araf","tafsir-journey","tajweed"],
  navy:    ["aqeedah","sharh-aq","sharh-tawheed","sharh-qawl-mufid","sharh-wasitiyyah","sharh-hamawiyah","sharh-qawaid","sharh-usul-3","radd","asmaa","simh-al-manhaj"],
  maroon:  ["hadith","bukhari","muslim","arbaeen","mustalah","sunan","jarh-tadil","matn","matn-tawheed","matn-wasitiyyah","matn-usul-3","matn-usul-6","matn-qawaid-4","matn-kashf","matn-wajibat"],
  copper:  ["fiqh","ibadat","muamalat","usrah","usul","usul-rabahiyya","usul-warqat","lugha","arab","nahw","balagha"],
};
const FALLBACK = { quran: "emerald", aqeedah: "navy", matn: "maroon", hadith: "maroon", fiqh: "copper", usul: "copper", fatawa: "gold", seerah: "gold", lugha: "copper", tafsir: "emerald" };

function themeFor(catId) {
  for (const [t, cats] of Object.entries(CAT_THEME)) if (cats.includes(catId)) return THEMES[t];
  if (FALLBACK[catId]) return THEMES[FALLBACK[catId]];
  return THEMES.gold;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* فصل الكلمة البادئة الشائعة (شرح/متن/...) عن باقي العنوان */
const PREFIXES = ["شرح","متن","درس","دروس","خطبة","خطبة الجمعة","تفسير","فقه","كتاب","حاشية","تعليق","عقيدة","الجواب","فتاوى","دورة"];
function splitPrefix(title) {
  const t = String(title ?? "").trim();
  for (const p of PREFIXES) {
    if (t.startsWith(p + " ")) {
      const rest = t.slice(p.length + 1).trim();
      if (rest.length > 4) return [p, rest];
    }
  }
  return ["", t];
}

/* توزيع العنوان على أسطر متوازنة بدون حروف يتيمة */
function wrapTitle(t, maxLines = 3) {
  const words = String(t ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const total = words.join(" ").length;
  let n = Math.min(maxLines, Math.max(1, Math.ceil(total / 16)));
  for (;;) {
    const lines = [];
    const target = Math.ceil(total / n);
    let cur = "";
    for (const w of words) {
      const cand = cur ? cur + " " + w : w;
      if (cand.length > target && cur && lines.length < n - 1) { lines.push(cur); cur = w; }
      else cur = cand;
    }
    if (cur) lines.push(cur);
    if (lines.length > 1 && lines[lines.length - 1].length < 4 && n > 1) { n--; continue; }
    return lines;
  }
}

/* توتّر زخرفي هندسي إسلامي (نجمة ثمانية) — يحاكي patternUri + tintColor + opacity من سكربت RN */
function ismicPattern(accent) {
  const c = accent;
  // خلية النمط: معيَّن متداخل / نجمة 8 عبر قطعتين معاكستين
  return `<pattern id="ip" width="96" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <g fill="none" stroke="${c}" stroke-width="1.1">
      <rect x="18" y="18" width="60" height="60" rx="6"/>
      <rect x="30" y="30" width="36" height="36" rx="4" opacity="0.75"/>
      <path d="M48 0 L60 48 L48 96 L36 48 Z" fill="${c}" opacity="0.5"/>
    </g>
  </pattern>`;
}

function makeCoverSvg({ title, scholar, series, cat, audioId, episode, size = 640 }) {
  const th = themeFor(cat);
  const S = size;
  const cx = S / 2;
  const uid = "u" + Math.abs([...(audioId || title)].reduce((a, c) => a + c.charCodeAt(0), 0)) % 9973;

  const [prefix, mainTitle] = splitPrefix(title);
  const lines = wrapTitle(mainTitle, 2);
  const n = lines.length;
  const maxLen = Math.max(...lines.map((l) => l.length), prefix.length, 1);
  let titleFont = Math.min(72, Math.floor(640 / (maxLen * 0.6)));
  if (titleFont < 36) titleFont = 36;
  let lineGap, blockH, topY, startY, subY, firstLineY;
  for (;;) {
    lineGap = Math.round(titleFont * 1.2);
    blockH = (prefix ? titleFont * 1.12 : 0) + titleFont + (n - 1) * lineGap;
    startY = 300; // مركز الكتلة (مطابق للنص المركزي في RN)
    startY = startY - blockH / 2;
    if (startY >= 150 && startY + blockH <= 470) break;
    titleFont -= 2;
    if (titleFont < 28) { titleFont = 28; break; }
  }
  subY = prefix ? startY + titleFont * 0.7 : 0;
  firstLineY = (prefix ? startY + titleFont * 1.12 : startY) + titleFont * 0.8;

  const hasEp = Number(episode) > 0;
  const epLabel = hasEp ? `الشريط ${String(episode).padStart(2, "0")}` : "";
  // "العنوان الفرعي" بين شرطتين = السلسلة/الشارة
  const subLabel = series ? series : (prefix ? prefix : "");
  const SHOW_SUB = subLabel && subLabel.length > 2;
  const logoText = "✦ دار الحديث ✦";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
  <radialGradient id="bg${uid}" cx="50%" cy="30%" r="100%">
    <stop offset="0%" stop-color="${th.bg2}"/>
    <stop offset="100%" stop-color="${th.bg}"/>
  </radialGradient>
  ${ismicPattern(th.accent)}
</defs>

<rect width="${S}" height="${S}" fill="url(#bg${uid})"/>

<!-- الزخرفة الملوّنة بلون التمييز (كـ tintColor) بشفافية منخفضة -->
<rect width="${S}" height="${S}" fill="url(#ip)" opacity="0.16"/>

<!-- إطار خارجي (حواف مستديرة كـ borderRadius) -->
<rect x="16" y="16" width="${S - 32}" height="${S - 32}" rx="20" fill="none" stroke="${th.accent}" stroke-width="2.2" opacity="0.9"/>
<rect x="27" y="27" width="${S - 54}" height="${S - 54}" rx="14" fill="none" stroke="${th.accent}" stroke-width="1" opacity="0.45"/>

<!-- الشعار أعلى (مطابق logoText) -->
<text x="${cx}" y="70" font-family="Arabic Typesetting" font-size="30" fill="${th.accent}" text-anchor="middle" font-weight="bold">${esc(logoText)}</text>

<!-- العنوان -->
${prefix ? `<text x="${cx}" y="${subY}" font-family="Arabic Typesetting" font-size="${Math.round(titleFont * 0.78)}" fill="${th.soft}" text-anchor="middle" opacity="0.95">${esc(prefix)}</text>` : ""}
${lines.map((l, i) => `<text x="${cx}" y="${firstLineY + i * lineGap}" font-family="Aref Ruqaa" font-weight="bold" font-size="${titleFont}" fill="${th.accent}" text-anchor="middle">${esc(l)}</text>`).join("\n")}

<!-- فاصل زخرفي بين العنوان واسم الشيخ -->
<g opacity="0.8">
  <line x1="${cx - 70}" y1="${S - 170}" x2="${cx + 70}" y2="${S - 170}" stroke="${th.accent}" stroke-width="1.6"/>
  <path d="M${cx - 16} ${S - 178} L${cx} ${S - 162} L${cx + 16} ${S - 178}" fill="none" stroke="${th.accent}" stroke-width="1.6"/>
</g>

<!-- اسم الشيخ أسفل -->
<text x="${cx}" y="${S - 128}" font-family="Arabic Typesetting" font-size="40" fill="${th.author}" text-anchor="middle">${esc(scholar || "")}</text>

<!-- رقم الشريط تحت اسم المؤلف -->
${epLabel ? `<text x="${cx}" y="${S - 88}" font-family="Arabic Typesetting" font-size="27" fill="${th.soft}" text-anchor="middle" opacity="0.85">${esc(epLabel)}</text>` : ""}
</svg>`;
}

export { makeCoverSvg, themeFor };

/* ============ التوليد الكامل — يقرأ من Firebase ويولّد غلافاً لكل شريط ============ */
if (!process.env.SAMPLE) {
  const get = async (p) => {
    const r = await fetch(`${RTDB_URL}/${p}.json`);
    if (!r.ok) throw new Error(`HTTP ${r.status} لـ ${p}`);
    return Object.values((await r.json()) || {});
  };
  const audios = (await get("audios")).filter((a) => a && a.status === "published" && a.title);
  const scholars = await get("scholars");
  const series = await get("series");
  const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "";
  const seriesTitle = (id) => series.find((s) => s.id === id)?.title || "";

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`توليد أغلفة لـ ${audios.length} شريطاً...`);

  let ok = 0, fail = 0, t0 = Date.now();
  for (const a of audios) {
    try {
      const svg = makeCoverSvg({
        title: a.title,
        scholar: scholarName(a.scholar_id),
        series: seriesTitle(a.series_id),
        cat: a.category_id,
        audioId: a.id,
        episode: a.episode_number,
      });
      const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 640 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Aref Ruqaa" } });
      fs.writeFileSync(path.join(OUT_DIR, `${a.id}.png`), resvg.render().asPng());
      ok++;
      if (ok % 100 === 0) console.log(`  ${ok}/${audios.length} (${Math.round((Date.now() - t0) / 1000)}ث)`);
    } catch (e) {
      fail++;
      if (fail <= 5) console.error(`  [ERR] ${a.id}: ${e.message}`);
    }
  }
  console.log(`تم: ${ok} غلافاً، فشل: ${fail}، الزمن: ${Math.round((Date.now() - t0) / 1000)}ث`);
}

/* وضع العينات — غلاف واحد لكل شريط */
if (process.env.SAMPLE) {
  const outDir = process.env.SAMPLE_DIR || path.join(process.cwd(), "covers-sample-lux");
  fs.mkdirSync(outDir, { recursive: true });
  const samples = [
    { title: "شرح الورقات", scholar: "محمد بن هادي المدخلي", cat: "usul-warqat", id: "lux-1", series: "سلسلة الدروس والتعليقات", episode: 1 },
    { title: "خطبة الجمعة من أنواع الشرك الأصغر", scholar: "محمد سعيد رسلان", cat: "khutab", id: "lux-2", series: "", episode: 0 },
    { title: "شرح كتاب كشف الشبهات", scholar: "صالح بن فوزان الفوزان", cat: "matn-kashf", id: "lux-3", series: "شرح كشف الشبهات", episode: 3 },
    { title: "الدرس الأول", scholar: "عبيد بن عبد الله الجابري", cat: "bukhari", id: "lux-4", series: "شرح صحيح البخاري — كتاب الإيمان", episode: 1 },
    { title: "شرح العقيدة الواسطية", scholar: "محمد ناصر الدين الألباني", cat: "sharh-wasitiyyah", id: "lux-5", series: "شرح العقيدة الواسطية", episode: 8 },
    { title: "تفسير سورة الفاتحة", scholar: "محمد الأمين الشنقيطي", cat: "tafsir", id: "lux-6", series: "تفسير القرآن العظيم", episode: 2 },
  ];
  for (const s of samples) {
    const svg = makeCoverSvg(s);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 640 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Aref Ruqaa" } });
    fs.writeFileSync(path.join(outDir, `${s.id}.png`), resvg.render().asPng());
    console.log("ok", s.id);
  }
  console.log("done ->", outDir);
}
