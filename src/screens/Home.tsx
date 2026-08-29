/* الشاشة الرئيسية */
import { motion } from "framer-motion";
import { Play, Clock3 } from "lucide-react";
import { useMemo } from "react";
import {
  allItems, allScholars, allSeries, dailyQuote, itemById, itemsOfSeries, mainCats, scholarById,
} from "../data/library";
import { ar } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings, type Route } from "../store/core";
import { useServerContent } from "../store/serverContent";
import { usePlayer } from "../store/player";
import { AudioCardH, AudioRow, Avatar, CatIcon, GirihBG, Logo, Ornament, SearchEntry, SectionHead, SeriesCard } from "../components/ui";

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 + i * 0.06, duration: 0.5 },
});

export const HomeScreen = () => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const history = useApp((s) => s.history);
  const positions = useApp((s) => s.positions);
  const counts = useApp((s) => s.counts);
  const syncVer = useServerContent((s) => s.lastSync);

  const recent = useMemo(() => allItems().sort((a, b) => a.addedDays - b.addedDays).slice(0, 12), [syncVer]);
  const most = useMemo(
    () => allItems().sort((a, b) => b.listenCount + (counts[b.id] ?? 0) - (a.listenCount + (counts[a.id] ?? 0))).slice(0, 5),
    [counts, syncVer]
  );
  const seriesSugg = useMemo(() => allSeries().filter((s) => itemsOfSeries(s.id).length >= 6).slice(0, 6), [syncVer]);
  const cont = useMemo(
    () => history.map((hh) => itemById(hh.id)).filter(Boolean).slice(0, 2) as NonNullable<ReturnType<typeof itemById>>[],
    [history, syncVer]
  );
  const hours = useMemo(() => Math.round(allItems().reduce((a, b) => a + b.duration, 0) / 3600), [syncVer]);
  const featured = allSeries().find((s) => s.id === "sr-سلسلة-فضائل-الصحابة") ?? allSeries()[0] ?? null;
  const featEps = featured ? itemsOfSeries(featured.id) : [];
  const quote = dailyQuote();

  const browseTiles = useMemo(() => {
    const cats = mainCats().filter((c) => c.id !== "lugha").slice(0, 7);
    return [
      ...cats.map((c) => ({ id: c.id, label: c.name, icon: c.icon, route: { name: "cat", id: c.id } as Route })),
      { id: "series", label: lang === "ar" ? "سلاسل" : "Series", icon: "list", route: { name: "series" } as Route },
    ];
  }, [lang, syncVer]);

  const stat = (num: string, label: string) => (
    <div className="flex-1 surface bline border rounded-2xl py-3 text-center shadow-card hover:shadow-lg transition-shadow duration-200">
      <div className="font-black text-[1.05rem] c-gold" style={{ fontFamily: "Amiri" }}>{num}</div>
      <div className="ink-3 text-[0.66rem] font-bold mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.028} />
      <div className="relative px-4 pt-5 pb-[130px] max-w-lg mx-auto">
        {/* الترويسة */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-3">
          <Logo size={44} />
          <div className="flex-1">
            <h1 className="font-brand text-[1.15rem] ink leading-tight">دار الحديث <span className="c-gold">الصوتية</span></h1>
            <p className="ink-3 text-[0.66rem] font-bold mt-0.5">{t.tagline}</p>
          </div>
          <div className="w-11 h-11 rounded-full surface bline border flex items-center justify-center soft-gold relative overflow-hidden">
            <GirihBG opacity={0.12} />
            <span className="c-gold font-brand text-lg relative">م</span>
          </div>
        </motion.div>

        <motion.div {...fadeUp(1)} className="mt-4">
          <SearchEntry t={t} />
        </motion.div>

        {/* آية اليوم */}
        <motion.p {...fadeUp(2)} className="font-quran text-center ink-2 text-[0.95rem] leading-loose mt-5 px-2">
          {quote.text}
        </motion.p>
        <motion.p {...fadeUp(2)} className="text-center c-gold text-[0.62rem] font-bold mt-1">{quote.src}</motion.p>

        {/* السلسلة المختارة — تصميم محسّن */}
        {featured && featEps.length > 0 && (
          <motion.div {...fadeUp(3)} className="mt-5 relative rounded-3xl overflow-hidden shadow-pop border border-[#d9a13f33]">
          <img src="/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,25,16,0.7) 0%, rgba(11,25,16,0.5) 50%, rgba(11,25,16,0.65) 100%)" }} />
          <div className="absolute inset-0 girih opacity-[0.08]" style={{ color: "#d9a13f" }} />
          <div className="relative p-5">
            <span className="text-[0.6rem] font-black text-[#d9a13f] tracking-widest border border-[#d9a13f55] rounded-full px-2.5 py-1">{t.featured}</span>
            <h2 className="font-brand text-[1.3rem] text-[#f4ecd7] mt-3 leading-snug">{featured.title}</h2>
            <p className="text-[#c3cdbf] text-[0.72rem] font-bold mt-1.5">
              {scholarById(featured.scholarId).name} · {ar(featEps.length)} {t.eps}
            </p>
            <button
              onClick={() => featEps.length && play(featEps[0].id, featEps.map((x) => x.id))}
              className="mt-4 h-10 px-5 rounded-full bg-gold text-[#231a05] font-extrabold text-[0.8rem] flex items-center gap-2 shadow-pop active:scale-95 transition-all duration-200 hover:shadow-xl"
            >
              <Play size={15} fill="currentColor" /> {t.playAll}
            </button>
          </div>
        </motion.div>
        )}

        {/* إحصائيات */}
        <motion.div {...fadeUp(4)} className="flex gap-2.5 mt-4">
          {stat(ar(allItems().length), t.tapes)}
          {stat(ar(allScholars().length), t.scholarsT)}
          {stat(`+${ar(hours)}`, lang === "ar" ? "ساعة استماع" : "hours")}
        </motion.div>

        {/* تصفح سريع — تصميم محسّن */}
        <motion.div {...fadeUp(5)} className="mt-7">
          <SectionHead title={t.quickBrowse} action={t.seeAll} onAction={() => nav.tab({ name: "cats" })} />
          <div className="grid grid-cols-4 gap-2.5">
            {browseTiles.map((b) => (
              <motion.button
                key={b.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => nav.push(b.route)}
                className="surface bline border rounded-2xl py-3 flex flex-col items-center gap-2 shadow-card hover:shadow-lg transition-shadow duration-200"
              >
                <span className="w-10 h-10 rounded-xl soft-green c-green flex items-center justify-center relative overflow-hidden">
                  <GirihBG opacity={0.06} color="currentColor" />
                  <CatIcon icon={b.icon} size={18} />
                </span>
                <span className="text-[0.62rem] font-bold ink leading-tight text-center line-clamp-2 px-0.5">{b.label.split(" و")[0]}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* استمع الآن */}
        {cont.length > 0 && (
          <motion.div {...fadeUp(6)} className="mt-7">
            <SectionHead title={t.continueL} action={t.seeAll} onAction={() => nav.tab({ name: "library", tab: 3 })} />
            <div className="space-y-2">
              {cont.map((it) => {
                const pos = positions[it.id];
                const pct = pos && pos.dur ? Math.min(100, (pos.pos / pos.dur) * 100) : 0;
                return (
                  <div key={it.id} className="relative">
                    <AudioRow item={it} />
                    {pct > 0 && (
                      <div className="absolute bottom-0.5 inset-x-16 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* المضاف حديثاً */}
        <motion.div {...fadeUp(7)} className="mt-7">
          <SectionHead title={t.recentlyAdded} action={t.seeAll} onAction={() => nav.push({ name: "search" })} />
          <div className="flex gap-3.5 overflow-x-auto no-bar -mx-4 px-4 pb-1">
            {recent.map((it) => <AudioCardH key={it.id} item={it} />)}
          </div>
        </motion.div>

        {/* الأكثر استماعاً */}
        <motion.div {...fadeUp(8)} className="mt-7">
          <SectionHead title={t.mostPlayed} />
          <div className="space-y-2">
            {most.map((it, i) => <AudioRow key={it.id} item={it} rank={i + 1} />)}
          </div>
        </motion.div>

        {/* سلاسل مقترحة */}
        <motion.div {...fadeUp(9)} className="mt-7">
          <SectionHead title={t.suggested} />
          <div className="flex gap-3 overflow-x-auto no-bar -mx-4 px-4 pb-1">
            {seriesSugg.map((s) => <SeriesCard key={s.id} series={s} wide />)}
          </div>
        </motion.div>

        {/* مشايخ وقرّاء — تصميم محسّن */}
        <motion.div {...fadeUp(10)} className="mt-7">
          <SectionHead title={t.scholarsT} />
          <div className="flex gap-4 overflow-x-auto no-bar -mx-4 px-4 pb-1">
            {allScholars().slice(0, 14).map((s) => (
              <button key={s.id} onClick={() => nav.push({ name: "scholar", id: s.id })}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] active:scale-95 transition-all duration-200">
                <Avatar scholar={s} size={58} />
                <span className="text-[0.62rem] font-bold ink-2 text-center leading-tight line-clamp-2">{s.name.split(" ").slice(0, 2).join(" ")}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <Ornament className="mt-9" />
        <p className="text-center ink-3 text-[0.66rem] font-bold mt-3 leading-relaxed">
          «الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ»
        </p>
        <p className="text-center ink-3 text-[0.6rem] mt-1 flex items-center justify-center gap-1">
          <Clock3 size={10} /> {ar(allItems().length)} {t.tapes}
        </p>
      </div>
    </div>
  );
};
