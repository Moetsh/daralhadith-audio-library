/* ═══════════════════════════════════════════════════════════
   دار الحديث الصوتية — قاعدة بيانات المحتوى
   المحتوى المدمج: التصنيفات + الشيخ المزوّد من المستخدم فقط.
   الأشرطة والسلاسل الحقيقية تُجلب من الخادم (Firebase / Internet Archive)
   تلقائياً عند فتح التطبيق.
════════════════════════════════════════════════════════════ */
import { norm } from "../lib/utils";
import { useUserContent, scholarIdOfSeries } from "../store/userContent";
import { useServerContent } from "../store/serverContent";

export interface Category { id: string; name: string; parent?: string; icon: string }
export interface Scholar { id: string; name: string; title: string; bio: string; era: string; reciter?: boolean }
export interface Series { id: string; title: string; scholarId: string; categoryId: string; desc: string; totalEpisodes?: number }
export interface AudioItem {
  id: string; title: string; scholarId: string; categoryId: string; subCategoryId?: string;
  duration: number; description: string; archiveUrl: string; streamUrl: string; streamAlt: string;
  addedDays: number; listenCount: number; seriesId?: string; episode?: number; cover?: string;
}

const h = (s: string) => { let n = 7; for (const c of s) n = (n * 31 + c.charCodeAt(0)) >>> 0; return n; };

/* ── التصنيفات الشجرية ── */
export const CATS: Category[] = [
  { id: "quran", name: "القرآن الكريم وعلومه", icon: "book" },
  { id: "tilawat", name: "تلاوات", parent: "quran", icon: "waves" },
  { id: "tafsir", name: "تفسير", parent: "quran", icon: "tafsir" },
  { id: "tajweed", name: "أحكام التجويد", parent: "quran", icon: "tune" },
  { id: "aqeedah", name: "العقيدة والتوحيد", icon: "shield" },
  { id: "sharh-aq", name: "شروحات العقيدة", parent: "aqeedah", icon: "scroll" },
  { id: "radd", name: "الرد على الشبهات", parent: "aqeedah", icon: "swords" },
  { id: "asmaa", name: "الأسماء والصفات", parent: "aqeedah", icon: "star" },
  { id: "hadith", name: "الحديث وعلومه", icon: "scroll" },
  { id: "bukhari", name: "شروح صحيح البخاري", parent: "hadith", icon: "book" },
  { id: "muslim", name: "شروح صحيح مسلم", parent: "hadith", icon: "book" },
  { id: "arbaeen", name: "شروح الأربعين النووية", parent: "hadith", icon: "list" },
  { id: "mustalah", name: "مصطلح الحديث", parent: "hadith", icon: "tune" },
  { id: "sunan", name: "كتب السنن والمسانيد", parent: "hadith", icon: "library" },
  { id: "fiqh", name: "الفقه وأصوله", icon: "scale" },
  { id: "ibadat", name: "فقه العبادات", parent: "fiqh", icon: "moon" },
  { id: "muamalat", name: "فقه المعاملات", parent: "fiqh", icon: "coins" },
  { id: "usrah", name: "فقه الأسرة", parent: "fiqh", icon: "heart" },
  { id: "usul", name: "أصول الفقه", parent: "fiqh", icon: "scale" },
  { id: "seerah", name: "السيرة النبوية والتاريخ", icon: "landmark" },
  { id: "sirah", name: "السيرة النبوية", parent: "seerah", icon: "map" },
  { id: "sahaba", name: "سير الصحابة", parent: "seerah", icon: "users" },
  { id: "ulama", name: "سير العلماء", parent: "seerah", icon: "feather" },
  { id: "tarikh", name: "التاريخ الإسلامي", parent: "seerah", icon: "landmark" },
  { id: "raqaiq", name: "الآداب والرقائق", icon: "heart" },
  { id: "athkar", name: "الأذكار والأدعية", parent: "raqaiq", icon: "sun" },
  { id: "tazkiyah", name: "التزكية والرقائق", parent: "raqaiq", icon: "heart" },
  { id: "akhlaq", name: "الأخلاق الإسلامية", parent: "raqaiq", icon: "sparkle" },
  { id: "fadail", name: "الفضائل والرقائق", parent: "raqaiq", icon: "star" },
  { id: "fatawa", name: "الفتاوى", icon: "question" },
  { id: "ft-salah", name: "فتاوى الصلاة", parent: "fatawa", icon: "moon" },
  { id: "ft-zakah", name: "فتاوى الزكاة والصيام", parent: "fatawa", icon: "coins" },
  { id: "ft-hajj", name: "فتاوى الحج والعمرة", parent: "fatawa", icon: "map" },
  { id: "ft-muam", name: "فتاوى المعاملات", parent: "fatawa", icon: "scale" },
  { id: "khutab", name: "خطب ودروس الجمعة", icon: "mic" },
];

/* ── العلماء ── (فقط ما زوّد به المستخدم) */
export const SCHOLARS: Scholar[] = [
  {
    id: "fallatah",
    name: "عمر بن محمد فلاتة",
    title: "خطيب وداعية",
    era: "السودان",
    bio: "خطيب وداعية من السودان، له سلسلة «فضائل الصحابة» ضمن مكتبة دار الحديث الصوتية من أرشيف الإنترنت.",
  },
];

/* ── السلاسل والأشرطة تُجلب من الخادم عند فتح التطبيق ── */
export const SERIES: Series[] = [];
export const ITEMS: AudioItem[] = [];

/* ── عبارات الافتتاحية اليومية ── */
export const QUOTES: { text: string; src: string; type: "quran" | "hadith" }[] = [
  { text: "﴿وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا﴾", src: "سورة المزمل — ٤", type: "quran" },
  { text: "«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»", src: "رواه البخاري", type: "hadith" },
  { text: "﴿فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ﴾", src: "سورة البقرة — ١٥٢", type: "quran" },
  { text: "«مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ»", src: "رواه مسلم", type: "hadith" },
  { text: "﴿وَقُلْ رَبِّ زِدْنِي عِلْمًا﴾", src: "سورة طه — ١١٤", type: "quran" },
  { text: "«بَلِّغُوا عَنِّي وَلَوْ آيَةً»", src: "رواه البخاري", type: "hadith" },
  { text: "﴿إِنَّ فِي ذَٰلِكَ لَذِكْرَىٰ لِمَنْ كَانَ لَهُ قَلْبٌ أَوْ أَلْقَى السَّمْعَ وَهُوَ شَهِيدٌ﴾", src: "سورة ق — ٣٧", type: "quran" },
  { text: "«الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ»", src: "رواه الترمذي", type: "hadith" },
  { text: "﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾", src: "سورة الرعد — ٢٨", type: "quran" },
  { text: "«الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ»", src: "متفق عليه", type: "hadith" },
  { text: "﴿وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا﴾", src: "سورة الطلاق — ٢", type: "quran" },
  { text: "«إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى»", src: "متفق عليه", type: "hadith" },
];
export const dailyQuote = () => QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];

/* ── وصول وبحث ── */
const sc = () => useServerContent.getState();
const serverItems = () => sc().items;
const serverCats = () => sc().cats;
const serverScholars = () => sc().scholars;
const serverSeries = () => sc().series;
const userTracks = () => useUserContent.getState().series.flatMap((s) => useUserContent.getState().tracksOf(s.id));

/* كل المحتوى: ثابت + من الخادم + أشرطة المستخدم */
export const allItems = () => [...ITEMS, ...serverItems(), ...userTracks()];
export const allScholars = () => {
  const ids = new Set(SCHOLARS.map((s) => s.id));
  return [...SCHOLARS, ...serverScholars().filter((s) => !ids.has(s.id))];
};
export const allSeries = () => {
  const ids = new Set(SERIES.map((s) => s.id));
  return [...SERIES, ...serverSeries().filter((s) => !ids.has(s.id))];
};
export const allCats = () => {
  const ids = new Set(CATS.map((c) => c.id));
  return [...CATS, ...serverCats().filter((c) => !ids.has(c.id))];
};

export const catById = (id: string) => CATS.find((c) => c.id === id) ?? serverCats().find((c) => c.id === id);
export const scholarById = (id: string): Scholar => {
  const s = SCHOLARS.find((x) => x.id === id);
  if (s) return s;
  const ss = serverScholars().find((x) => x.id === id);
  if (ss) return ss;
  if (id.startsWith("usrsch-")) {
    const uid = id.slice("usrsch-".length);
    const us = useUserContent.getState().asSeries(uid);
    if (us) return { id, name: us.scholarName, title: "سلسلة مضافة من الأرشيف", era: "", bio: us.desc };
  }
  return SCHOLARS[0];
};
export const seriesById = (id?: string) => {
  if (!id) return undefined;
  const st = SERIES.find((s) => s.id === id);
  if (st) return st;
  const srv = serverSeries().find((s) => s.id === id);
  if (srv) return srv;
  const u = useUserContent.getState().asSeries(id);
  return u ? { id: u.id, title: u.title, scholarId: u.scholarId, categoryId: u.categoryId, desc: u.desc } : undefined;
};
export const itemById = (id: string) => {
  const it = ITEMS.find((i) => i.id === id);
  if (it) return it;
  const si = serverItems().find((i) => i.id === id);
  if (si) return si;
  return useUserContent.getState().findTrack(id);
};
export const mainCats = (): Category[] => {
  const staticMains = CATS.filter((c) => !c.parent);
  const ids = new Set(staticMains.map((c) => c.id));
  const serverMains = serverCats().filter((c) => !c.parent && !ids.has(c.id));
  return [...staticMains, ...serverMains];
};
export const subCatsOf = (id: string): Category[] => {
  const all = [...CATS, ...serverCats().filter((c) => !CATS.some((x) => x.id === c.id))];
  const direct = all.filter((c) => c.parent === id);
  return [...direct, ...direct.flatMap((d) => subCatsOf(d.id))];
};
export const childCatsOf = (id: string): Category[] => {
  const all = [...CATS, ...serverCats().filter((c) => !CATS.some((x) => x.id === c.id))];
  return all.filter((c) => c.parent === id);
};
export const mainOf = (id: string) => {
  const c = catById(id);
  if (!c) return CATS[0];
  if (!c.parent) return c;
  return catById(c.parent) ?? c;
};
export const itemsOfCat = (id: string) => {
  const subs = new Set([id, ...subCatsOf(id).map((s) => s.id)]);
  const staticItems = ITEMS.filter((i) => subs.has(i.categoryId) || (i.subCategoryId && subs.has(i.subCategoryId)));
  const server = serverItems().filter((i) => subs.has(i.categoryId) || (i.subCategoryId && subs.has(i.subCategoryId)));
  const userItems = useUserContent.getState().series
    .filter((s) => subs.has(s.categoryId))
    .flatMap((s) => useUserContent.getState().tracksOf(s.id));
  return [...staticItems, ...server, ...userItems];
};
export const itemsOfScholar = (id: string) => {
  const staticItems = ITEMS.filter((i) => i.scholarId === id);
  const server = serverItems().filter((i) => i.scholarId === id);
  const userItems = useUserContent.getState().series
    .filter((s) => scholarIdOfSeries(s.id) === id)
    .flatMap((s) => useUserContent.getState().tracksOf(s.id));
  return [...staticItems, ...server, ...userItems];
};
export const itemsOfSeries = (id: string) => {
  if (SERIES.some((s) => s.id === id)) {
    return ITEMS.filter((i) => i.seriesId === id).sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  }
  if (serverSeries().some((s) => s.id === id)) {
    return serverItems().filter((i) => i.seriesId === id).sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  }
  return useUserContent.getState().tracksOf(id);
};
export const seriesOfScholar = (id: string) => {
  const staticSeries = SERIES.filter((s) => s.scholarId === id);
  const srv = serverSeries().filter((s) => s.scholarId === id);
  const userSeries = useUserContent.getState().series
    .filter((s) => scholarIdOfSeries(s.id) === id)
    .map((s) => ({ id: s.id, title: s.title, scholarId: scholarIdOfSeries(s.id), categoryId: s.categoryId, desc: s.desc }));
  return [...staticSeries, ...srv, ...userSeries];
};

/* الحلقات الناقصة في سلسلة: الأرقام من 1..total_episodes غير الموجودة فعلياً */
export const missingEpisodesOfSeries = (id: string): number[] => {
  const sr = seriesById(id);
  const total = Number(sr?.totalEpisodes) || 0;
  if (total <= 0) return [];
  const have = new Set(itemsOfSeries(id).map((i) => Number(i.episode) || 0).filter((n) => n > 0));
  const missing: number[] = [];
  for (let n = 1; n <= total; n++) if (!have.has(n)) missing.push(n);
  return missing;
};
export const countOfCat = (id: string) => itemsOfCat(id).length;
export const relatedOf = (it: AudioItem, n = 8) =>
  [...ITEMS, ...serverItems()]
    .filter((x) => x.id !== it.id && (x.categoryId === it.categoryId || (it.subCategoryId && x.subCategoryId === it.subCategoryId) || x.scholarId === it.scholarId))
    .sort((a, b) => (b.categoryId === it.categoryId ? 1 : 0) - (a.categoryId === it.categoryId ? 1 : 0) || b.listenCount - a.listenCount)
    .slice(0, n);

export interface SearchHit { items: AudioItem[]; scholars: Scholar[]; series: Series[] }
export function searchAll(q: string): SearchHit {
  const nq = norm(q);
  if (!nq) return { items: [], scholars: [], series: [] };
  const uc = useUserContent.getState();
  const userItems = uc.series.flatMap((s) => uc.tracksOf(s.id));
  const userSeries = uc.series;
  const items = [...ITEMS, ...serverItems(), ...userItems].filter((i) => {
    const sch = scholarById(i.scholarId);
    const sr = seriesById(i.seriesId);
    return norm(i.title).includes(nq) || norm(sch.name).includes(nq) || norm(i.description).includes(nq) || (sr && norm(sr.title).includes(nq));
  }).sort((a, b) => b.listenCount - a.listenCount);
  const scholars = [
    ...SCHOLARS.filter((s) => norm(s.name).includes(nq) || norm(s.title).includes(nq)),
    ...serverScholars().filter((s) => norm(s.name).includes(nq) || norm(s.title).includes(nq)),
    ...userSeries
      .filter((s) => norm(s.scholarName).includes(nq))
      .map((s) => scholarById(scholarIdOfSeries(s.id))),
  ];
  const series = [
    ...SERIES.filter((s) => norm(s.title).includes(nq) || norm(scholarById(s.scholarId).name).includes(nq)),
    ...serverSeries().filter((s) => norm(s.title).includes(nq) || norm(scholarById(s.scholarId).name).includes(nq)),
    ...userSeries
      .filter((s) => norm(s.title).includes(nq) || norm(s.scholarName).includes(nq))
      .map((s) => ({ id: s.id, title: s.title, scholarId: scholarIdOfSeries(s.id), categoryId: s.categoryId, desc: s.desc })),
  ];
  return { items, scholars, series };
}

export const scholarColor = (id: string) => {
  const palette = ["#e8842b", "#b07b2e", "#c65c2a", "#8a5a24", "#a86f22", "#d98e2b", "#bf5b25", "#6f4a1e"];
  return palette[h(id) % palette.length];
};
/* ألوان الفئات — مطابقة لأغلفة الأقسام (cat-styles) */
const CAT_COLORS: Record<string, string> = {
  quran: "#1a6b3c", tilawat: "#2e8b57", tafsir: "#14635a", "tafsir-araf": "#0f7c68",
  "tafsir-journey": "#5b7028", tajweed: "#3d7a1e",
  aqeedah: "#1a3a5c", "sharh-aq": "#274b73", "sharh-tawheed": "#1f5f96",
  "sharh-qawl-mufid": "#17618f", "sharh-wasitiyyah": "#155a86", "sharh-hamawiyah": "#1b5077",
  "sharh-qawaid": "#20558c", "sharh-usul-3": "#184f80", radd: "#123c63", asmaa: "#24537e",
  matn: "#44497a", "matn-tawheed": "#4a55a2", "matn-wasitiyyah": "#504a94",
  "matn-usul-3": "#3f4f95", "matn-usul-6": "#45599e", "matn-qawaid-4": "#4b4494",
  "matn-kashf": "#39448c", "matn-wajibat": "#4f4f9e",
  hadith: "#6b1a2a", bukhari: "#8a2338", muslim: "#7a1f33", arbaeen: "#5f1622",
  mustalah: "#70203a", sunan: "#651d30",
  fiqh: "#1a5c5c", ibadat: "#17706b", muamalat: "#136a60", usrah: "#207a72",
  usul: "#0f5e75", "usul-rabahiyya": "#127089", "usul-warqat": "#0d667f",
  seerah: "#7a5a1a", sirah: "#8a6a22", sahaba: "#6f5218", ulama: "#75581c", tarikh: "#654a14",
  raqaiq: "#4a1a5c", athkar: "#5a2470", tazkiyah: "#40154f", akhlaq: "#52205f", fadail: "#46185a",
  fatawa: "#3a5a1a", "ft-salah": "#47701f", "ft-zakah": "#33611a", "ft-hajj": "#40651f", "ft-muam": "#2f5c17",
  khutab: "#5c3a1a",
  lugha: "#16607e", arab: "#1a6a88", nahw: "#125873", balagha: "#187087",
  "jarh-tadil": "#6e2a17", "simh-al-manhaj": "#276734",
};
export const catColor = (catId: string): string => {
  if (CAT_COLORS[catId]) return CAT_COLORS[catId];
  return CAT_COLORS[mainOf(catId).id] ?? "#e8842b";
};
