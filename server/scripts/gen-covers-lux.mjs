/* أغلفة الأشرطة — طراز داكن أنيق مطابق للنموذج (React Native reference)
   مربع 640×640 — خلفية داكنة، إطار بزوايا، شارة "الشريط 01"،
   السلسلة أعلى، العنوان ذهبي وسط، اسم الشيخ أسفل.
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

function makeCoverSvg({ title, scholar, series, cat, audioId, episode, size = 640 }) {
  const th = themeFor(cat);
  const S = size;
  const cx = S / 2;
  const uid = "u" + Math.abs([...(audioId || title)].reduce((a, c) => a + c.charCodeAt(0), 0)) % 9973;

  const [prefix, mainTitle] = splitPrefix(title);
  const lines = wrapTitle(mainTitle, 3);
  const n = lines.length;
  const maxLen = Math.max(...lines.map((l) => l.length), prefix.length, 1);
  /* خط كبير وواضح — يتقلص تلقائياً ليلائم المساحة */
  let titleFont = Math.min(74, Math.floor(640 / (maxLen * 0.56)));
  if (titleFont < 38) titleFont = 38;
  let lineGap, blockH, midY, startY, subY, firstLineY;
  for (;;) {
    lineGap = Math.round(titleFont * 1.2);
    blockH = (prefix ? titleFont * 1.12 : 0) + titleFont + (n - 1) * lineGap;
    midY = 318;
    startY = midY - blockH / 2;
    /* يجب أن يبقى الكتلة بين الفاصلين (150 → 462) */
    if (startY >= 152 && startY + blockH <= 462) break;
    titleFont -= 2;
    if (titleFont < 30) { titleFont = 30; break; }
  }

  subY = prefix ? startY + titleFont * 0.82 : 0;
  firstLineY = (prefix ? startY + titleFont * 1.12 : startY) + titleFont * 0.8;

  const hasEp = Number(episode) > 0;
  const epLabel = hasEp ? `الشريط ${String(episode).padStart(2, "0")}` : "";
  const top = series ? series : "مَكْتَبَةُ دَارِ الْحَدِيثِ";
  const topFont = top.length > 34 ? 30 : 36;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
  <radialGradient id="bg${uid}" cx="50%" cy="30%" r="95%">
    <stop offset="0%" stop-color="${th.bg2}"/>
    <stop offset="100%" stop-color="${th.bg}"/>
  </radialGradient>
</defs>

<rect width="${S}" height="${S}" fill="url(#bg${uid})"/>

<rect x="14" y="14" width="${S - 28}" height="${S - 28}" rx="14" fill="none" stroke="${th.accent}" stroke-width="2.4" opacity="0.85"/>
<rect x="26" y="26" width="${S - 52}" height="${S - 52}" rx="10" fill="none" stroke="${th.accent}" stroke-width="1" opacity="0.4"/>

<g stroke="${th.accent}" stroke-width="2.6" fill="none" opacity="0.95">
  <path d="M40,74 L40,40 L74,40"/>
  <path d="M${S - 40},74 L${S - 40},40 L${S - 74},40"/>
  <path d="M40,${S - 74} L40,${S - 40} L74,${S - 40}"/>
  <path d="M${S - 40},${S - 74} L${S - 40},${S - 40} L${S - 74},${S - 40}"/>
</g>

${epLabel ? `<rect x="50" y="50" width="158" height="48" rx="9" fill="rgba(0,0,0,0.45)" stroke="${th.accent}" stroke-width="1.4"/>
<text x="129" y="84" font-family="Arabic Typesetting" font-size="33" fill="${th.accent}" text-anchor="middle">${esc(epLabel)}</text>` : ""}

<text x="${cx}" y="120" font-family="Arabic Typesetting" font-size="${topFont}" fill="${th.soft}" text-anchor="middle" opacity="0.92">${esc(top)}</text>
<rect x="${S * 0.16}" y="138" width="${S * 0.68}" height="1.6" fill="${th.accent}" opacity="0.55"/>

${prefix ? `<text x="${cx}" y="${subY}" font-family="Aref Ruqaa" font-size="${Math.round(titleFont * 0.72)}" fill="${th.soft}" text-anchor="middle" opacity="0.9">${esc(prefix)}</text>` : ""}
${lines.map((l, i) => `<text x="${cx}" y="${firstLineY + i * lineGap}" font-family="Aref Ruqaa" font-weight="bold" font-size="${titleFont}" fill="${th.accent}" text-anchor="middle">${esc(l)}</text>`).join("\n")}

<rect x="${S * 0.16}" y="${S - 168}" width="${S * 0.68}" height="1.6" fill="${th.accent}" opacity="0.55"/>
<text x="${cx}" y="${S - 114}" font-family="Arabic Typesetting" font-size="42" fill="${th.author}" text-anchor="middle">${esc(scholar || "")}</text>
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
    { title: "فقه الأمر بالمعروف والنهي عن المنكر", scholar: "محمد سعيد رسلان", cat: "khutab", id: "lux-4", series: "", episode: 0 },
    { title: "إقامة الدليل على شرعية الجرح والتعديل", scholar: "مقبل بن هادي الوادعي", cat: "jarh-tadil", id: "lux-5", series: "", episode: 0 },
  ];
  for (const s of samples) {
    const svg = makeCoverSvg(s);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 640 }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Aref Ruqaa" } });
    fs.writeFileSync(path.join(outDir, `${s.id}.png`), resvg.render().asPng());
    console.log("ok", s.id);
  }
  console.log("done ->", outDir);
}
