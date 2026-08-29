/* مكتبة دار الحديث الصوتية — الهيكل الرئيسي */
import { AnimatePresence, motion } from "framer-motion";
import {
  BatteryFull, Compass, Fingerprint, Headphones, Home, LayoutGrid, LibraryBig,
  MoonStar, Search, Settings as SettingsIcon, Signal, Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MiniPlayer, FullPlayer } from "./components/Player";
import { GirihBG, Logo, Toast } from "./components/ui";
import { useApp } from "./store/appStore";
import { useNav, useSettings, type Route } from "./store/core";
import { useServerContent } from "./store/serverContent";
import { CatsScreen, CatScreen } from "./screens/Categories";
import { DetailScreen } from "./screens/Detail";
import { HomeScreen } from "./screens/Home";
import { LibraryIndexScreen } from "./screens/LibraryIndex";
import { LibraryScreen, PlaylistScreen } from "./screens/Library";
import { ScholarScreen } from "./screens/Scholar";
import { SearchScreen } from "./screens/Search";
import { SeriesScreen } from "./screens/Series";
import { SettingsScreen } from "./screens/Settings";
import { Splash } from "./screens/Splash";
import { UserSeriesScreen } from "./screens/UserSeries";

const useDesktop = () => {
  const [d, setD] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const f = () => setD(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return d;
};

/* تطبيق تأثيرات الإعدادات على المستند */
const useApplySettings = () => {
  const { theme, lang, fsize } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    root.lang = lang;
    root.dataset.fsize = String(fsize);
    const eff = theme === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    root.dataset.theme = eff;
  }, [theme, lang, fsize]);
};

/* شاشة حسب المسار */
const ScreenFor = ({ r }: { r: Route }) => {
  switch (r.name) {
    case "home": return <HomeScreen />;
    case "cats": return <CatsScreen />;
    case "cat": return <CatScreen id={r.id} />;
    case "series": return <SeriesScreen />;
    case "library-index": return <LibraryIndexScreen />;
    case "search": return <SearchScreen />;
    case "detail": return <DetailScreen id={r.id} />;
    case "scholar": return <ScholarScreen id={r.id} />;
    case "library": return <LibraryScreen tab={r.tab} />;
    case "playlist": return <PlaylistScreen id={r.id} />;
    case "user-series": return <UserSeriesScreen id={r.id} />;
    case "settings": return <SettingsScreen />;
  }
};

/* شريط التنقل السفلي */
const BottomNav = () => {
  const t = useSettings((s) => s.t);
  const nav = useNav();
  const top = nav.top();
  const items: { ic: any; label: string; r: Route; match: string[] }[] = [
    { ic: Home, label: t.home, r: { name: "home" }, match: ["home", "detail", "scholar", "cat"] },
    { ic: LayoutGrid, label: t.cats, r: { name: "cats" }, match: ["cats"] },
    { ic: Search, label: t.searchT, r: { name: "search" }, match: ["search"] },
    { ic: LibraryBig, label: t.library, r: { name: "library" }, match: ["library", "playlist"] },
    { ic: SettingsIcon, label: t.settings, r: { name: "settings" }, match: ["settings"] },
  ];
  return (
    <div className="absolute bottom-0 inset-x-0 z-40 px-3 pb-3 pt-1 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg surface border bline rounded-[22px] shadow-pop flex items-stretch h-[68px] px-1.5"
        style={{ background: "color-mix(in srgb, var(--card) 92%, transparent)" }}>
        {items.map((it) => {
          const active = it.match.includes(top.name);
          const Icon = it.ic;
          return (
            <button key={it.label} onClick={() => (it.r.name === "search" ? nav.push(it.r) : nav.tab(it.r as Route))}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] relative active:scale-95 transition">
              {active && <motion.span layoutId="nav-pill" className="absolute top-1.5 w-10 h-[3px] rounded-full bg-gold" />}
              <Icon size={19} className={active ? "c-gold" : "ink-3"} strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[0.6rem] font-extrabold ${active ? "c-gold" : "ink-3"}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* جسم التطبيق داخل الإطار */
const AppShell = ({ framed }: { framed: boolean }) => {
  const nav = useNav();
  const [splash, setSplash] = useState(true);
  const top = nav.top();
  const push = nav.act === "push";
  const key = nav.stack.map((x) => x.name + ("id" in x ? x.id : "") + (("tab" in x && x.tab) || "")).join(">");

  return (
    <div className="relative h-full w-full overflow-hidden bg-app noise" style={{ borderRadius: framed ? 36 : 0 }}>
      {framed && (
        <div className="absolute top-0 inset-x-0 h-8 z-[60] flex items-center justify-between px-7 pointer-events-none">
          <span className="text-[0.66rem] font-bold ink-2" dir="ltr">9:41</span>
          <span className="flex items-center gap-1.5 ink-3"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></span>
        </div>
      )}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={key}
          className="absolute inset-0"
          initial={{ x: splash ? 0 : push ? -52 : 52, opacity: splash ? 1 : 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: push ? 52 : -52, opacity: 0.4 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
        >
          <ScreenFor r={top} />
        </motion.div>
      </AnimatePresence>

      <BottomNav />
      <MiniPlayer />
      <FullPlayer />
      <Toast />

      <AnimatePresence>
        {splash && <Splash done={() => setSplash(false)} />}
      </AnimatePresence>
    </div>
  );
};

/* عرض سطح المكتب: إطار هاتف + عرض تقديمي */
const DesktopStage = () => {
  const feats = [
    { ic: Headphones, t: "استماع متواصل", d: "استئناف تلقائي من آخر موضع توقفت عنده في أي شريط" },
    { ic: MoonStar, t: "مؤقت النوم وسرعة التشغيل", d: "من 15 إلى 60 دقيقة، وسرعة من 0.5× حتى 2×" },
    { ic: Compass, t: "٩ تصنيفات شرعية", d: "قرآن وتفسير، حديث، عقيدة، فقه، سيرة، رقائق وغيرها" },
    { ic: Fingerprint, t: "مفضلة وقوائم وتحميل", d: "نظّم مكتبتك واستمع دون اتصال بالإنترنت" },
  ];
  return (
    <div className="h-dvh w-full relative overflow-hidden flex items-center" style={{ background: "#08120c" }}>
      <img src="/medal.jpg" alt="" className="absolute -start-40 -top-40 w-[720px] h-[720px] object-cover opacity-[0.22] spin-slow" />
      <GirihBG color="#d9a13f" opacity={0.05} />
      <div className="absolute inset-0 noise" />

      <div className="relative max-w-6xl mx-auto w-full px-10 flex items-center gap-14">
        {/* النص التقديمي */}
        <div className="flex-1 min-w-0 max-h-[94vh] overflow-y-auto no-bar py-4">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex items-center gap-4">
            <Logo size={64} />
            <div>
              <div className="text-[0.7rem] font-black tracking-[0.3em] text-[#d9a13f]">ANDROID APP · PROTOTYPE</div>
              <h1 className="font-brand text-[2.2rem] leading-snug text-[#f4ecd7]">مكتبة دار الحديث الصوتية</h1>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
            className="font-quran text-[#e9d9a6] text-[1.3rem] leading-loose mt-7">
            ﴿مَثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ﴾
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-[#8fa795] text-[0.84rem] font-bold leading-loose mt-3 max-w-xl">
            تطبيق خيري مجاني بالكامل لنشر العلم الشرعي صوتاً — آلاف الأشرطة من المحاضرات والدروس والتلاوات والفتاوى،
            دون إعلانات أو اشتراكات.
          </motion.p>

          <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-xl">
            {feats.map((f, i) => (
              <motion.div key={f.t} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.09 }}
                className="rounded-2xl p-4 border border-[#d9a13f26] backdrop-blur-sm" style={{ background: "rgba(30,19,9,0.65)" }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,128,36,0.16)" }}>
                  <f.ic size={18} style={{ color: "#d9a13f" }} />
                </span>
                <div className="font-extrabold text-[#f4ecd7] text-[0.88rem] mt-3">{f.t}</div>
                <div className="text-[#8fa795] text-[0.7rem] font-bold leading-relaxed mt-1">{f.d}</div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="flex flex-wrap gap-2 mt-8">
            {["Kotlin", "Jetpack Compose", "ExoPlayer (Media3)", "Room DB", "Hilt", "Retrofit", "MVVM + Clean"].map((x) => (
              <span key={x} className="text-[0.64rem] font-black text-[#e9d9a6] border border-[#d9a13f33] rounded-full px-3 py-1.5" dir="ltr">{x}</span>
            ))}
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-[#5f7466] text-[0.66rem] font-bold mt-5">
            النموذج التفاعلي يعمل بالكامل داخل الهاتف المعروض — جرّب البحث والتشغيل والتصنيفات
          </motion.p>
        </div>

        {/* الهاتف */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
          className="shrink-0"
        >
          <div className="rounded-[52px] p-[10px] shadow-pop" style={{ background: "#221a12", border: "1px solid #d9a13f33" }}>
            <div className="relative rounded-[42px] overflow-hidden border border-black/60" style={{ width: 372, height: "min(800px, 90vh)" }}>
              <AppShell framed />
              <div className="absolute top-2 inset-x-0 flex justify-center pointer-events-none z-[65]">
                <div className="w-24 h-[22px] rounded-full bg-black/95" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const desktop = useDesktop();
  const resumeDownloads = useApp((s) => s.resumeDownloads);
  useApplySettings();
  useEffect(() => { resumeDownloads(""); }, [resumeDownloads]);
  useEffect(() => { useServerContent.getState().sync(); }, []);

  return desktop ? (
    <DesktopStage />
  ) : (
    <div className="h-dvh w-full relative overflow-hidden bg-app">
      <AppShell framed={false} />
    </div>
  );
}
