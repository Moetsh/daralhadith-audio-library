/* خريطة ألوان وزخارف كل فئة وفروعها — هوية بصرية مميزة لكل قسم
   bg: الخلفية، accent: الزخرفة، dark: حدود/تدرج */
export const CAT_STYLES = {
  /* ── القرآن ── أخضر */
  quran:          { bg: "#1a6b3c", accent: "#b8e6c8", orn: "star8" },
  tilawat:        { bg: "#2e8b57", accent: "#c9f0d6", orn: "waves" },
  tafsir:         { bg: "#14635a", accent: "#b0e6dc", orn: "rosette" },
  "tafsir-araf":  { bg: "#0f7c68", accent: "#bdf2e4", orn: "circles" },
  "tafsir-journey": { bg: "#5b7028", accent: "#dbe8ae", orn: "grid" },
  tajweed:        { bg: "#3d7a1e", accent: "#cde8b0", orn: "star10" },

  /* ── العقيدة ── أزرق نيلي */
  aqeedah:          { bg: "#1a3a5c", accent: "#a8c8e8", orn: "star8" },
  "sharh-aq":       { bg: "#274b73", accent: "#bcd4ee", orn: "rosette" },
  "sharh-tawheed":  { bg: "#1f5f96", accent: "#bfe0f7", orn: "star6" },
  "sharh-qawl-mufid": { bg: "#17618f", accent: "#c2ecff", orn: "circles" },
  "sharh-wasitiyyah": { bg: "#155a86", accent: "#aad9f5", orn: "crescent" },
  "sharh-hamawiyah":  { bg: "#1b5077", accent: "#b8dcf2", orn: "rosette" },
  "sharh-qawaid":     { bg: "#20558c", accent: "#c4e2fb", orn: "star10" },
  "sharh-usul-3":      { bg: "#184f80", accent: "#b5ddf7", orn: "star5" },
  radd:             { bg: "#123c63", accent: "#a8cce8", orn: "swords" },
  asmaa:            { bg: "#24537e", accent: "#c0e2fa", orn: "star10" },

  /* ── المتون ── بنفسجي مزرق */
  matn:           { bg: "#44497a", accent: "#cccfe8", orn: "grid" },
  "matn-tawheed": { bg: "#4a55a2", accent: "#ccd4f5", orn: "star8" },
  "matn-wasitiyyah": { bg: "#504a94", accent: "#d4cef2", orn: "rosette" },
  "matn-usul-3":  { bg: "#3f4f95", accent: "#c6d2f2", orn: "star6" },
  "matn-usul-6":  { bg: "#45599e", accent: "#cad8f4", orn: "star5" },
  "matn-qawaid-4": { bg: "#4b4494", accent: "#d2cbef", orn: "circles" },
  "matn-kashf":   { bg: "#39448c", accent: "#c2caf0", orn: "crescent" },
  "matn-wajibat": { bg: "#4f4f9e", accent: "#d6d6f5", orn: "star10" },

  /* ── الحديث ── عنابي */
  hadith:         { bg: "#6b1a2a", accent: "#e8a8b8", orn: "star8" },
  bukhari:        { bg: "#8a2338", accent: "#f5c2ce", orn: "rosette" },
  muslim:         { bg: "#7a1f33", accent: "#f0b8c6", orn: "star6" },
  arbaeen:        { bg: "#5f1622", accent: "#e09aa8", orn: "list" },
  mustalah:       { bg: "#70203a", accent: "#eeaec4", orn: "grid" },
  sunan:          { bg: "#651d30", accent: "#e8a6b8", orn: "circles" },

  /* ── الفقه ── تركوازي */
  fiqh:           { bg: "#1a5c5c", accent: "#a8e0e0", orn: "star8" },
  ibadat:         { bg: "#17706b", accent: "#b2ece7", orn: "crescent" },
  muamalat:       { bg: "#136a60", accent: "#abe6db", orn: "circles" },
  usrah:          { bg: "#207a72", accent: "#bcf0e9", orn: "heart" },

  /* ── أصول الفقه ── سماوي داكن */
  usul:           { bg: "#0f5e75", accent: "#a8e0ef", orn: "scale" },
  "usul-rabahiyya": { bg: "#127089", accent: "#b5ecf7", orn: "rosette" },
  "usul-warqat":  { bg: "#0d667f", accent: "#a8e4f2", orn: "star6" },

  /* ── السيرة ── رملي ذهبي */
  seerah:         { bg: "#7a5a1a", accent: "#e8d0a0", orn: "landmark" },
  sirah:          { bg: "#8a6a22", accent: "#f2ddb0", orn: "map" },
  sahaba:         { bg: "#6f5218", accent: "#e6cd98", orn: "users" },
  ulama:          { bg: "#75581c", accent: "#ead6a4", orn: "feather" },
  tarikh:         { bg: "#654a14", accent: "#e2c78e", orn: "grid" },

  /* ── الرقائق ── بنفسجي */
  raqaiq:         { bg: "#4a1a5c", accent: "#d0a8e8", orn: "star8" },
  athkar:         { bg: "#5a2470", accent: "#deb8f0", orn: "sun" },
  tazkiyah:       { bg: "#40154f", accent: "#c89ade", orn: "heart" },
  akhlaq:         { bg: "#52205f", accent: "#d4aeea", orn: "sparkle" },
  fadail:         { bg: "#46185a", accent: "#c6a2e2", orn: "star10" },

  /* ── الفتاوى ── زيتوني */
  fatawa:         { bg: "#3a5a1a", accent: "#c0e0a0", orn: "question" },
  "ft-salah":     { bg: "#47701f", accent: "#d0eda8", orn: "moon" },
  "ft-zakah":     { bg: "#33611a", accent: "#c2ea9c", orn: "coins" },
  "ft-hajj":      { bg: "#40651f", accent: "#c8eca0", orn: "map" },
  "ft-muam":      { bg: "#2f5c17", accent: "#bee694", orn: "scale" },

  /* ── الخطابة ── نحاسي */
  khutab:         { bg: "#5c3a1a", accent: "#e0c0a0", orn: "mic" },

  /* ── اللغة ── سماوي فاتح */
  lugha:          { bg: "#16607e", accent: "#a8daee", orn: "book" },
  arab:           { bg: "#1a6a88", accent: "#b0e2f5", orn: "pen" },
  nahw:           { bg: "#125873", accent: "#a2d6ea", orn: "grid" },
  balagha:        { bg: "#187087", accent: "#b4e8f5", orn: "rosette" },

  /* ── إضافات ── */
  "jarh-tadil":   { bg: "#6e2a17", accent: "#f0c0a8", orn: "scales" },
  "simh-al-manhaj": { bg: "#276734", accent: "#bcecc6", orn: "compass" },
};

/* الزخرفة المركزية حسب النوع — توقيع بصري للفئة */
function ornamentByType(type, cx, cy, r, c) {
  const poly = (n, rot, inner) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const ang = (Math.PI / n) * i + rot;
      const rad = i % 2 === 0 ? r : r * (inner ?? 0.42);
      pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="1.8" opacity="0.38"/>`;
  };
  switch (type) {
    case "star8":   return poly(8, -Math.PI / 8);
    case "star6":   return poly(6, -Math.PI / 2);
    case "star5":   return poly(5, -Math.PI / 2);
    case "star10":  return poly(10, -Math.PI / 2, 0.35);
    case "waves":
      return `<path d="M${cx - r},${cy} q${r * 0.25},-${r * 0.35} ${r * 0.5},0 t${r * 0.5},0 t${r * 0.5},0 M${cx - r},${cy + r * 0.35} q${r * 0.25},-${r * 0.35} ${r * 0.5},0 t${r * 0.5},0 t${r * 0.5},0" fill="none" stroke="${c}" stroke-width="2" opacity="0.35"/>`;
    case "circles": {
      let s = "";
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        s += `<circle cx="${cx + Math.cos(a) * r * 0.45}" cy="${cy + Math.sin(a) * r * 0.45}" r="${r * 0.5}" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.28"/>`;
      }
      return s;
    }
    case "rosette": {
      const inner = r * 0.55;
      let star = "";
      for (let i = 0; i < 8; i++) {
        const a1 = (Math.PI / 4) * i;
        const a2 = (Math.PI / 4) * (i + 0.5);
        const a3 = (Math.PI / 4) * (i + 1);
        star += `M${cx + Math.cos(a1) * inner},${cy + Math.sin(a1) * inner} L${cx + Math.cos(a2) * r * 0.85},${cy + Math.sin(a2) * r * 0.85} L${cx + Math.cos(a3) * inner},${cy + Math.sin(a3) * inner} `;
      }
      let oct = "";
      for (let i = 0; i < 8; i++) {
        const a1 = (Math.PI / 4) * i - Math.PI / 8;
        oct += `M${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} `;
      }
      return `<path d="${oct}Z" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.3"/><path d="${star}" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.3"/>`;
    }
    case "crescent":
      return `<circle cx="${cx}" cy="${cy}" r="${r * 0.9}" fill="none" stroke="${c}" stroke-width="2" opacity="0.32"/><circle cx="${cx + r * 0.32}" cy="${cy - r * 0.08}" r="${r * 0.72}" fill="none" stroke="${c}" stroke-width="2" opacity="0.32"/>`;
    case "grid": {
      const step = r * 0.35;
      let s = `<g opacity="0.16" stroke="${c}" stroke-width="1">`;
      for (let d = -r; d <= r; d += step) {
        s += `<line x1="${cx - r}" y1="${cy + d}" x2="${cx + r}" y2="${cy + d}"/><line x1="${cx + d}" y1="${cy - r}" x2="${cx + d}" y2="${cy + r}"/>`;
      }
      return s + "</g>";
    }
    default:
      return poly(8, 0);
  }
}

export { ornamentByType };
