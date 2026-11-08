/* الشاشة الرئيسية */
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  allItems, allScholars, allSeries, catById, dailyQuote, itemById, itemsOfSeries, mainCats, scholarById,
  type AudioItem,
} from "../data/library";
import { useApp } from "../store/appStore";
import { useNav, useSettings, type Route } from "../store/core";
import { useServerContent } from "../store/serverContent";
import { usePlayer } from "../store/player";
import { AudioRow, Avatar, CatIcon, GirihBG, Logo, Ornament, SearchEntry, SectionHead, SeriesCard } from "../components/ui";
import { ar, fmtDur } from "../lib/utils";

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 + i * 0.06, duration: 0.5 },
});

/* مفتاح تعاقب بطاقة «المضاف حديثاً»: السلسلة المرتبطة عبر معرفها،
   والأشرطة المستوردة بلا ربط سلسلة تُجمع عبر بادئة العنوان المشتركة بعد
   حذف أرقام الحلقات (الدرس/الجزء/المقطع/الحلقة/الشريط + الرقم) — فلن يحجز
   استيراد سلسلة كاملة القسم، ويظهر شريط واحد ممثِّلٍ لكل سلسلة. */
const recentsGroupKey = (it: { seriesId?: string; title: string }) => {
  if (it.seriesId) return "sr:" + it.seriesId;
  const t = (it.title || "")
    .replace(/\s*(?:الدرس|الجزء|المقطع|الحلقة|الشريط)\s*(?:[\d٠-٩]+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/g, " ")
    .replace(/[\d٠-٩]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return "t:" + t.slice(0, 50);
};

/* بطاقة عرض مشتركة (بانر عريض 168px) تُستخدم في «المُضاف حديثاً» و«الأكثر استماعاً» —
   صورة الغلاف + تظليل متراعٍ + العنوان والشيخ والمدة + زر تشغيل.
   fit: "cover" يملأ البطاقة (المُضاف حديثاً)، "contain" غلاف بوسترة يظهر كاملاً
   بارتفاع البطاقة وبعرض نسبة الصورة الأصلية (المُضاف: نظام عمود ثابت). */
const ShowcaseBanner = ({ it, lang, onPlay, onOpen, fit = "cover" }: {
  it: AudioItem;
  lang: string;
  onPlay: () => void;
  onOpen: () => void;
  fit?: "cover" | "contain";
}) => (
  <div
    className="relative w-full h-[168px] cursor-pointer select-none overflow-hidden"
    onClick={onOpen}
  >
    {it.cover && fit === "contain" ? (
      /* غلاف «بوسترة»: يظهر كاملاً بلا قصّ وبارتفاع البطاقة كاملاً —
         عرضه يتبع نسبة الصورة الأصلية (حتى 55% من البطاقة)، والنص على اليسار */
      <div className="absolute inset-0 flex" style={{ background: "var(--card-2)" }}>
        <img
          src={it.cover}
          alt=""
          loading="lazy"
          className="h-full w-auto max-w-[55%] object-contain shrink-0"
        />
      </div>
    ) : it.cover ? (
      <img src={it.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
    ) : (
      <div className="absolute inset-0" style={{ background: "var(--card-2)" }}>
        <div className="absolute inset-0 girih opacity-[0.12]" style={{ color: "#d9a13f" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <CatIcon icon={catById(it.categoryId)?.icon ?? "book"} size={30} className="c-gold" />
          <span className="ink-3 font-black text-[0.7rem]" style={{ fontFamily: "Amiri" }}>دار الحديث</span>
        </div>
      </div>
    )}
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(to top, rgba(9,20,14,0.9) 0%, rgba(9,20,14,0.4) 45%, rgba(9,20,14,0.12) 100%)" }}
    />
    <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3.5">
      <div className="flex-1 min-w-0" style={{ textAlign: fit === "contain" ? "end" : "start" }}>
        <div className="text-[#f4ecd7] font-extrabold text-[0.95rem] leading-snug line-clamp-1">
          {it.title}
        </div>
        <div className="text-[#c3cdbf] text-[0.7rem] font-bold mt-1 truncate">
          {scholarById(it.scholarId).name} · {fmtDur(it.duration, lang)}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className="rounded-full bg-gold text-[#231a05] flex items-center justify-center shadow-pop active:scale-90 transition-all duration-200 shrink-0 w-10 h-10"
        aria-label="تشغيل"
      >
        <Play size={16} fill="currentColor" className="translate-x-[1px]" />
      </button>
    </div>
  </div>
);

export const HomeScreen = () => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const history = useApp((s) => s.history);
  const positions = useApp((s) => s.positions);
  const counts = useApp((s) => s.counts);
  const syncVer = useServerContent((s) => s.lastSync);
  const featureds = useServerContent((s) => s.featured);

  /* المضاف حديثاً: شريط واحد فقط من كل سلسلة (فلما تستورد سلسلة كاملة دفعة واحدة
     لا تحجز قسم كله — تُجمع السلسلة المرتبطة بمعرّفها، والمبثوثة بلا ربط عبر بادئة العنوان) */
  const recent = useMemo(() => {
    const sorted = allItems().slice().sort((a, b) => a.addedDays - b.addedDays);
    const seen = new Set<string>();
    const picked: AudioItem[] = [];    for (const it of sorted) {
      const key = recentsGroupKey(it);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(it);
      if (picked.length >= 18) break;
    }
    return picked;
  }, [syncVer]);
  /* شريط «المضاف حديثاً»: بطاقة عريضة تمر فيها الأشرطة تلقائياً (كل 4.5 ثانية)
     وتَدور عند الوصول للنهاية، مع سهمين يدويين وعدّاد تقدّم */
  const [recIdx, setRecIdx] = useState(0);
  const [recDir, setRecDir] = useState(1);
  const recTotal = recent.length;
  useEffect(() => { setRecIdx(0); setRecDir(1); }, [recent]);
  const recGo = (d: number) => {
    setRecDir(d);
    setRecIdx((i) => (i + d + recTotal) % recTotal);
  };
  useEffect(() => {
    if (recTotal <= 1) return undefined;
    const iv = window.setInterval(() => {
      setRecDir(1);
      setRecIdx((i) => (i + 1) % recTotal);
    }, 8000);
    return () => window.clearInterval(iv);
  }, [recIdx, recTotal]);
  /* الأكثر استماعاً — سلايدر عمودي بشرائط: واحد ممثِّل لكل سلسلة (نفس منطق المضاف حديثاً) */
  const most10 = useMemo(() => {
    const sorted = allItems()
      .slice()
      .sort((a, b) => b.listenCount + (counts[b.id] ?? 0) - (a.listenCount + (counts[a.id] ?? 0)));
    const seen = new Set<string>();
    const picked: AudioItem[] = [];
    for (const it of sorted) {
      const key = recentsGroupKey(it);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(it);
      if (picked.length >= 10) break;
    }
    return picked;
  }, [counts, syncVer]);
  const [mostIdx, setMostIdx] = useState(0);
  const [mostDir, setMostDir] = useState(1);
  const mostTotal = most10.length;
  useEffect(() => { setMostIdx(0); setMostDir(1); }, [most10]);
  const mostGo = (d: number) => {
    setMostDir(d);
    setMostIdx((i) => (i + d + mostTotal) % mostTotal);
  };
  useEffect(() => {
    if (mostTotal <= 1) return undefined;
    const iv = window.setInterval(() => {
      setMostDir(1);
      setMostIdx((i) => (i + 1) % mostTotal);
    }, 8000);
    return () => window.clearInterval(iv);
  }, [mostIdx, mostTotal]);
  const seriesSugg = useMemo(() => allSeries().filter((s) => itemsOfSeries(s.id).length >= 6).slice(0, 6), [syncVer]);
  const cont = useMemo(
    () => history.map((hh) => itemById(hh.id)).filter(Boolean).slice(0, 2) as NonNullable<ReturnType<typeof itemById>>[],
    [history, syncVer]
  );
  const hours = useMemo(() => Math.round(allItems().reduce((a, b) => a + b.duration, 0) / 3600), [syncVer]);
  /* السلاسل المختارة: يقيّرها المشرف من لوحة التحكم — وتتدور كل يومين تلقائياً
     (الفهرس = نصف اليوم العالمي % عدد السلاسل). إن لم تُقيّر أي سلسلة نستخدم الافتراضية */
  const featuredList = featureds.filter((fid) => itemsOfSeries(fid).length > 0);
  const halfDay = Math.floor(Date.now() / 86400000 / 2);
  const rotatePick = featuredList.length ? featuredList[halfDay % featuredList.length] : null;
  const featured = (rotatePick && allSeries().find((s) => s.id === rotatePick))
    ?? allSeries().find((s) => s.scholarId === "albani" && s.title.includes("الهدى") && s.title.includes("النور"))
    ?? allSeries().find((s) => s.id === "sr-سلسلة-فضائل-الصحابة") ?? allSeries()[0] ?? null;
  const featEps = featured ? itemsOfSeries(featured.id) : [];
  /* غلاف حقيقي للسلسلة إن وُجد، ومدة إجمالية، ونقطة استكمال إن كانت هناك جلسة غير مكتملة */
  const featCover = featEps.find((x) => x.cover)?.cover || "";
  const featMins = Math.round(featEps.reduce((a, b) => a + b.duration, 0) / 60);
  const featDur = featMins >= 90
    ? `· ${ar(Math.round(featMins / 60))} ${lang === "ar" ? "ساعة" : "hrs"}`
    : featMins > 0 ? `· ${ar(featMins)} ${lang === "ar" ? "دقيقة" : "min"}` : "";
  const featResumeId = history
    .map((h) => h.id)
    .find((id) => {
      const e = featEps.find((x) => x.id === id);
      const p = positions[id];
      if (!e || !p || p.done) return false;
      return p.pos > 0 && p.pos < p.dur - 30;
    });
  const featResume = featResumeId ? featEps.find((x) => x.id === featResumeId) : null;
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
          <img src={featCover || "/hero.jpg"} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,25,16,0.7) 0%, rgba(11,25,16,0.5) 50%, rgba(11,25,16,0.65) 100%)" }} />
          <div className="absolute inset-0 girih opacity-[0.08]" style={{ color: "#d9a13f" }} />
          <div className="relative p-5">
            <span className="text-[0.6rem] font-black text-[#d9a13f] tracking-widest border border-[#d9a13f55] rounded-full px-2.5 py-1">{t.featured}</span>
            <h2 className="font-brand text-[1.3rem] text-[#f4ecd7] mt-3 leading-snug">{featured.title}</h2>
            <p className="text-[#c3cdbf] text-[0.72rem] font-bold mt-1.5">
              {scholarById(featured.scholarId).name} · {ar(featEps.length)} {t.eps} {featDur}
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                onClick={() => featResume
                  ? featEps.length && play(featResume.id, featEps.map((x) => x.id))
                  : featEps.length && play(featEps[0].id, featEps.map((x) => x.id))}
                className="h-10 px-5 rounded-full bg-gold text-[#231a05] font-extrabold text-[0.8rem] flex items-center gap-2 shadow-pop active:scale-95 transition-all duration-200 hover:shadow-xl"
              >
                <Play size={15} fill="currentColor" />
                {featResume ? (lang === "ar" ? `استكمال الحلقة ${featResume.episode ? ar(featResume.episode) : ""}` : "Resume") : t.playAll}
              </button>
              <button
                onClick={() => featEps.length && nav.push({ name: "detail", id: featEps[0].id })}
                className="h-10 px-4 rounded-full border border-[#d9a13f66] text-[#d9a13f] font-extrabold text-[0.78rem] flex items-center gap-2 active:scale-95 transition-all duration-200"
              >
                <Clock3 size={14} /> {lang === "ar" ? "السلسلة كاملة" : "Full series"}
              </button>
            </div>
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

        {/* المضاف حديثاً — شريط عرض أفقي تمر منه الأشرطة واحداً تلو الآخر ويَدور عند النهاية */}
        {recTotal > 0 && (
          <motion.div {...fadeUp(7)} className="mt-7">
            <SectionHead title={t.recentlyAdded} action={t.seeAll} onAction={() => nav.push({ name: "search" })} />
            <div className="relative mt-2 rounded-[20px] surface bline border shadow-card overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={recIdx}
                  initial={{ x: recDir > 0 ? "105%" : "-105%" }}
                  animate={{ x: 0 }}
                  exit={{ x: recDir > 0 ? "-105%" : "105%" }}
                  transition={{ type: "tween", duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ShowcaseBanner
                    it={recent[recIdx]}
                    lang={lang}
                    onPlay={() => { const it = recent[recIdx]; if (it) play(it.id); }}
                    onOpen={() => { const it = recent[recIdx]; if (it) nav.push({ name: "detail", id: it.id }); }}
                  />
                </motion.div>
              </AnimatePresence>
              {/* شريط تقدّم العرض أسفل البطاقة */}
              <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: "var(--line)" }}>
                <motion.div
                  className="h-full bg-gold"
                  animate={{ width: `${((recIdx + 1) / recTotal) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* سهم الرجوع (يمين) */}
              <button
                onClick={() => recGo(-1)}
                className="absolute top-1/2 -translate-y-1/2 start-1.5 w-8 h-8 rounded-full surface bline border shadow-pop flex items-center justify-center ink-2 active:scale-90 transition-all duration-150 z-[2]"
                style={{ opacity: 0.95 }}
                aria-label="السابق"
              >
                <ChevronRight size={17} />
              </button>
              {/* سهم التقدم (يسار) */}
              <button
                onClick={() => recGo(1)}
                className="absolute top-1/2 -translate-y-1/2 end-1.5 w-8 h-8 rounded-full surface bline border shadow-pop flex items-center justify-center ink-2 active:scale-90 transition-all duration-150 z-[2]"
                style={{ opacity: 0.95 }}
                aria-label="التالي"
              >
                <ChevronLeft size={17} />
              </button>
            </div>
            <p className="text-center ink-3 text-[0.6rem] font-bold mt-1.5">{ar(recIdx + 1)} / {ar(recTotal)}</p>
          </motion.div>
        )}

        {/* الأكثر استماعاً — سلايدر عمودي (من الأعلى للأسفل) بنفس حجم بطاقة المضاف حديثاً */}
        {mostTotal > 0 && (
          <motion.div {...fadeUp(8)} className="mt-7">
            <SectionHead title={t.mostPlayed} />
            <div className="relative mt-2 rounded-[20px] surface bline border shadow-card overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mostIdx}
                  initial={{ y: mostDir > 0 ? "-105%" : "105%" }}
                  animate={{ y: 0 }}
                  exit={{ y: mostDir > 0 ? "105%" : "-105%" }}
                  transition={{ type: "tween", duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ShowcaseBanner
                    it={most10[mostIdx]}
                    lang={lang}
                    fit="contain"
                    onPlay={() => { const it = most10[mostIdx]; if (it) play(it.id); }}
                    onOpen={() => { const it = most10[mostIdx]; if (it) nav.push({ name: "detail", id: it.id }); }}
                  />
                </motion.div>
              </AnimatePresence>
              {/* شريط تقدّم العرض أسفل البطاقة */}
              <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: "var(--line)" }}>
                <motion.div
                  className="h-full bg-gold"
                  animate={{ width: `${((mostIdx + 1) / mostTotal) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* سهم الرجوع (يمين) */}
              <button
                onClick={() => mostGo(-1)}
                className="absolute top-1/2 -translate-y-1/2 start-1.5 w-8 h-8 rounded-full surface bline border shadow-pop flex items-center justify-center ink-2 active:scale-90 transition-all duration-150 z-[2]"
                style={{ opacity: 0.95 }}
                aria-label="السابق"
              >
                <ChevronUp size={17} />
              </button>
              {/* سهم التقدم (يسار) */}
              <button
                onClick={() => mostGo(1)}
                className="absolute top-1/2 -translate-y-1/2 end-1.5 w-8 h-8 rounded-full surface bline border shadow-pop flex items-center justify-center ink-2 active:scale-90 transition-all duration-150 z-[2]"
                style={{ opacity: 0.95 }}
                aria-label="التالي"
              >
                <ChevronDown size={17} />
              </button>
            </div>
            <p className="text-center ink-3 text-[0.6rem] font-bold mt-1.5">{ar(mostIdx + 1)} / {ar(mostTotal)}</p>
          </motion.div>
        )}

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
