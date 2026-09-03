/* مكونات الواجهة المشتركة */
import { motion } from "framer-motion";
import { useState } from "react";
import {
  BookOpen, AudioLines, BookMarked, Waves, Shield, ScrollText, Swords, Star, List, LibraryBig,
  Scale, Moon, Coins, Heart, Landmark, Map, Users, Feather, Sparkles, HelpCircle, Mic, Sun,
  Play, Pause, Heart as HeartIcon, ArrowRight, ArrowLeft, Search, Check, type LucideIcon,
} from "lucide-react";
import type { AudioItem, Scholar, Series } from "../data/library";
import { catById, catColor, scholarById, scholarColor } from "../data/library";
import { ar, fmtAgo, fmtCount, fmtDur, type Strings } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { useNav } from "../store/core";

export const ICONS: Record<string, LucideIcon> = {
  book: BookOpen, waves: AudioLines, tafsir: BookMarked, tune: Waves, shield: Shield,
  scroll: ScrollText, swords: Swords, star: Star, list: List, library: LibraryBig,
  scale: Scale, moon: Moon, coins: Coins, heart: Heart, landmark: Landmark, map: Map,
  users: Users, feather: Feather, sparkle: Sparkles, question: HelpCircle, mic: Mic, sun: Sun,
};
export const CatIcon = ({ icon, size = 18, className = "" }: { icon: string; size?: number; className?: string }) => {
  const I = ICONS[icon] ?? BookOpen;
  return <I size={size} className={className} strokeWidth={1.8} />;
};

/* زخرفة هندسية خلفية */
export const GirihBG = ({ className = "", color = "var(--gold)", opacity = 0.05 }: { className?: string; color?: string; opacity?: number }) => (
  <div aria-hidden className={`absolute inset-0 pointer-events-none girih ${className}`} style={{ color, opacity }} />
);

/* فاصل زخرفي */
export const Ornament = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-3 justify-center ${className}`} aria-hidden>
    <div className="h-px w-16 bg-gold opacity-50" />
    <svg width="18" height="18" viewBox="0 0 24 24" className="c-gold" fill="currentColor">
      <path d="M12 1l2.6 6.2L21 5.2l-2 6.8 5 2.6-5 2.6 2 6.8-6.4-2L12 23l-2.6-6.2L3 18.8l2-6.8-5-2.6 5-2.6-2-6.8 6.4 2z" opacity="0.9" />
      <circle cx="12" cy="12" r="3.4" fill="var(--bg)" />
    </svg>
    <div className="h-px w-16 bg-gold opacity-50" />
  </div>
);

/* الشعار — تصميم محسّن */
export const Logo = ({ size = 56, radius = 16 }: { size?: number; radius?: number }) => (
  <img
    src="/logo.png"
    alt="دار الحديث"
    width={size}
    height={size}
    loading="lazy"
    className="shrink-0 object-cover"
    style={{ width: size, height: size, borderRadius: Math.round(size * (radius / 64)), boxShadow: "0 8px 24px -6px rgba(10,30,18,.5), 0 2px 8px -2px rgba(10,30,18,.3)" }}
  />
);

/* شارة غلاف الشريط — تصميم محسّن */
export const Cover = ({ catId, icon, size = 56, radius = 14, playing = false, src, title: _title, fluid = false }: { catId: string; icon?: string; size?: number; radius?: number; playing?: boolean; src?: string; title?: string; fluid?: boolean }) => {
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const showImg = src && !failed;
  const bg = catColor(catId);
  const lighterBg = bg + "30";
  const disp = fluid ? 340 : size;
  const aspect = ratio ? `${ratio} / 1` : undefined;
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${fluid ? "w-full" : "shrink-0"}`}
      style={{
        width: fluid ? undefined : size, height: fluid ? undefined : size, borderRadius: radius,
        aspectRatio: fluid ? (aspect ?? "1 / 1") : undefined,
        background: showImg ? "transparent" : `linear-gradient(145deg, ${bg} 0%, ${bg}dd 40%, ${bg}99 100%)`,
        boxShadow: "0 8px 24px -6px rgba(10,30,18,.5), 0 2px 8px -2px rgba(10,30,18,.3)",
      }}
    >
      {showImg ? (
        <img
          src={src} alt="" loading="lazy"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) setRatio(el.naturalWidth / el.naturalHeight);
          }}
          style={fluid ? { imageRendering: "-webkit-optimize-contrast", filter: "contrast(1.06) saturate(1.1) brightness(1.02)" } : undefined}
          className={`absolute inset-0 w-full h-full ${fluid ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <>
          <div className="absolute inset-0 girih opacity-[0.12]" style={{ color: "var(--cover-girih)" }} />
          <div className="absolute inset-0 opacity-20" style={{
            background: `radial-gradient(circle at 30% 25%, ${lighterBg} 0%, transparent 50%), radial-gradient(circle at 70% 75%, rgba(0,0,0,.15) 0%, transparent 50%)`,
          }} />
          <div className="absolute inset-[2px] rounded-[inherit] border border-white/15" style={{ borderRadius: radius - 2 }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            {playing ? (
              <Eq size={Math.max(16, disp * 0.28)} />
            ) : (
              <>
                <CatIcon icon={icon ?? "book"} size={Math.max(18, disp * 0.32)} className="text-white/90" />
                {disp >= 80 && (
                  <span className="text-white/60 font-black leading-none" style={{ fontSize: Math.max(9, disp * 0.14), fontFamily: "Amiri" }}>
                    دار الحديث
                  </span>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* موجات صوت */
export const Eq = ({ size = 16, paused = false }: { size?: number; paused?: boolean }) => (
  <span className={`eq inline-flex items-end gap-[2px] ${paused ? "paused" : ""}`} style={{ height: size }}>
    {[0.9, 0.6, 1, 0.7].map((k, i) => (
      <span key={i} style={{ height: size * k }} />
    ))}
  </span>
);

/* صورة الشيخ — تصميم محسّن */
export const Avatar = ({ scholar, size = 48, ring = false }: { scholar: Scholar; size?: number; ring?: boolean }) => (
  <div
    className="rounded-full shrink-0 flex items-center justify-center font-bold text-[#f4ecd7] relative overflow-hidden"
    style={{
      width: size, height: size, background: scholarColor(scholar.id), fontSize: size * 0.42,
      boxShadow: ring ? "0 0 0 2px var(--bg), 0 0 0 4px var(--gold), 0 8px 24px -6px rgba(10,30,18,.4)" : "0 8px 24px -6px rgba(10,30,18,.4), 0 2px 8px -2px rgba(10,30,18,.3)",
      fontFamily: "Aref Ruqaa, serif",
    }}
  >
    <div className="absolute inset-0 girih opacity-[0.12]" style={{ color: "#fff" }} />
    <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,.3) 0%, transparent 50%)" }} />
    <span className="relative">{scholar.name.split(" ").slice(-1)[0]?.[0] ?? "ع"}</span>
  </div>
);

/* عنوان قسم — تصميم محسّن */
export const SectionHead = ({ title, action, onAction, className = "" }: { title: string; action?: string; onAction?: () => void; className?: string }) => (
  <div className={`flex items-end justify-between mb-3 ${className}`}>
    <div className="flex items-center gap-2.5">
      <span className="w-1 h-5 rounded-full bg-gold shadow-card" />
      <h2 className="text-[1.06rem] font-extrabold ink">{title}</h2>
    </div>
    {action && (
      <button onClick={onAction} className="text-[0.78rem] font-bold c-green flex items-center gap-1 opacity-90 active:scale-95 transition-all duration-200 hover:opacity-100">
        {action}
        <ArrowLeft size={13} className="rtl-flip" />
      </button>
    )}
  </div>
);

/* صف شريط صوتي — تصميم محسّن */
export const AudioRow = ({ item, queue, rank, onOpen }: { item: AudioItem; queue?: string[]; rank?: number; onOpen?: (id: string) => void }) => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const currentId = usePlayer((s) => s.currentId);
  const status = usePlayer((s) => s.status);
  const extra = useApp((s) => s.counts[item.id] ?? 0);
  const isCur = currentId === item.id;
  const sch = scholarById(item.scholarId);

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all duration-200 ${
        isCur ? "soft-gold border border-[var(--gold)]/30 shadow-card" : "surface bline border shadow-card hover:shadow-lg"
      }`}
      onClick={() => (onOpen ? onOpen(item.id) : nav.push({ name: "detail", id: item.id }))}
    >
      {rank !== undefined && (
        <span className="w-6 text-center font-black text-sm c-gold" style={{ fontFamily: "Amiri" }}>{ar(rank)}</span>
      )}
      <Cover catId={item.categoryId} icon={catById(item.categoryId)?.icon} size={52} playing={isCur && status === "playing"} src={item.cover} title={item.title} />
      <div className="min-w-0 flex-1">
        <div className={`font-bold text-[0.88rem] leading-snug truncate ${isCur ? "c-gold" : "ink"}`}>{item.title}</div>
        <div className="ink-2 text-[0.72rem] truncate mt-0.5 flex items-center gap-1">
          <span className="truncate">{sch.name}</span>
          <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0" />
          <span className="shrink-0">{fmtDur(item.duration, lang)}</span>
          <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0" />
          <span className="shrink-0">{fmtCount(item.listenCount + extra, lang)} {t.listenCount}</span>
        </div>
      </div>
      <button
        aria-label={t.play}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ${
          isCur && status === "playing"
            ? "bg-gold text-[#231a05] shadow-pop"
            : "soft-green c-green hover:bg-[var(--green)] hover:text-white"
        }`}
        onClick={(e) => { e.stopPropagation(); play(item.id, queue ?? [item.id]); }}
      >
        {isCur && status === "playing" ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-[1px]" />}
      </button>
    </motion.div>
  );
};

/* بطاقة أفقية — تصميم محسّن */
export const AudioCardH = ({ item, onOpen }: { item: AudioItem; onOpen?: () => void }) => {
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const sch = scholarById(item.scholarId);
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="w-[152px] shrink-0 cursor-pointer group"
      onClick={() => (onOpen ? onOpen() : nav.push({ name: "detail", id: item.id }))}
    >
      <div className="relative rounded-[18px] overflow-hidden shadow-card group-hover:shadow-lg transition-shadow duration-200">
        <Cover catId={item.categoryId} icon={catById(item.categoryId)?.icon} size={152} radius={18} src={item.cover} title={item.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <button
          aria-label="play"
          className="absolute bottom-2 start-2 w-9 h-9 rounded-full bg-gold text-[#231a05] flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
          onClick={(e) => { e.stopPropagation(); play(item.id); }}
        >
          <Play size={15} fill="currentColor" className="translate-x-[1px]" />
        </button>
        <span className="absolute top-2 end-2 text-[0.6rem] font-bold px-2 py-0.5 rounded-full text-white bg-black/40 backdrop-blur-sm">
          {fmtDur(item.duration, lang)}
        </span>
      </div>
      <div className="mt-2 font-bold text-[0.82rem] leading-snug ink line-clamp-2">{item.title}</div>
      <div className="ink-3 text-[0.7rem] mt-0.5 truncate">{sch.name}</div>
    </motion.div>
  );
};

/* بطاقة سلسلة — تصميم محسّن */
export const SeriesCard = ({ series, wide = false }: { series: Series; wide?: boolean }) => {
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const t = useSettings((s) => s.t);
  const sch = scholarById(series.scholarId);
  const eps = useSeriesEps(series.id);
  const missing = missingEpisodesOfSeries(series.id);
  void lang;
  return (
    <motion.div whileTap={{ scale: 0.97 }} className={`${wide ? "w-[280px]" : "w-full"} shrink-0 surface bline border rounded-2xl p-3 cursor-pointer relative overflow-hidden shadow-card hover:shadow-lg transition-shadow duration-200`}
      onClick={() => eps.length && nav.push({ name: "detail", id: eps[0].id })}>
      <GirihBG opacity={0.03} />
      <div className="relative flex gap-3">
        <Cover catId={series.categoryId} size={66} radius={16} icon="library" title={series.title} />
        <div className="min-w-0 flex-1">
          <span className="text-[0.6rem] font-black c-gold tracking-wider uppercase">{t.seriesT}</span>
          <div className="font-extrabold text-[0.88rem] ink leading-snug line-clamp-2 mt-0.5">{series.title}</div>
          <div className="ink-3 text-[0.7rem] mt-1 truncate flex items-center gap-1.5">
            <span className="truncate">{sch.name}</span>
            <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0" />
            <span className="shrink-0">{ar(eps.length)} {t.eps}</span>
          </div>
          {missing.length > 0 && (
            <div className="c-danger text-[0.66rem] font-bold leading-snug mt-1 flex items-center gap-1">
              <span className="shrink-0">ناقص {ar(missing.length)}</span>
              {missing.length <= 8 && (
                <span className="truncate">{missing.map(ar).join("، ")}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        className="relative mt-2.5 w-full h-9 rounded-xl soft-green c-green text-[0.75rem] font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all duration-200 hover:bg-[var(--green)] hover:text-white"
        onClick={(e) => { e.stopPropagation(); if (eps.length) play(eps[0].id, eps.map((x) => x.id)); }}
      >
        <Play size={13} fill="currentColor" /> {t.playAll}
      </button>
    </motion.div>
  );
};

import { itemsOfSeries, missingEpisodesOfSeries } from "../data/library";
const useSeriesEps = (id: string) => itemsOfSeries(id);

/* رقاقة اختيار — تصميم محسّن */
export const Chip = ({ label, active, onClick, count }: { label: string; active?: boolean; onClick?: () => void; count?: number }) => (
  <button
    onClick={onClick}
    className={`shrink-0 h-9 px-3.5 rounded-full text-[0.78rem] font-bold border transition-all duration-200 active:scale-95 ${
      active ? "bg-green text-[#f4ecd7] border-transparent shadow-card" : "surface bline ink-2 hover:shadow-card"
    }`}
  >
    {label}
    {count !== undefined && <span className={`ms-1.5 text-[0.65rem] ${active ? "text-[#e9d9a6]" : "c-gold"}`}>{ar(count)}</span>}
  </button>
);

/* حالة فارغة — تصميم محسّن */
export const EmptyState = ({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
    <div className="w-22 h-22 rounded-3xl soft-gold flex items-center justify-center mb-4 relative overflow-hidden shadow-card">
      <GirihBG opacity={0.08} />
      <Icon size={32} className="c-gold" strokeWidth={1.6} />
    </div>
    <div className="font-extrabold ink text-[1rem]">{title}</div>
    {hint && <div className="ink-3 text-[0.8rem] mt-1.5 leading-relaxed">{hint}</div>}
  </div>
);

/* زر رجوع — تصميم محسّن */
export const BackBtn = () => {
  const nav = useNav();
  const lang = useSettings((s) => s.lang);
  const Icon = lang === "ar" ? ArrowRight : ArrowLeft;
  return (
    <button onClick={() => nav.pop()} aria-label="back"
      className="w-10 h-10 rounded-full surface bline border flex items-center justify-center ink active:scale-90 transition-all duration-200 shadow-card hover:shadow-lg">
      <Icon size={18} />
    </button>
  );
};

/* شريط البحث العلوي — تصميم محسّن */
export const SearchEntry = ({ t }: { t: Strings }) => {
  const nav = useNav();
  return (
    <button
      onClick={() => nav.push({ name: "search" })}
      className="w-full h-12 rounded-2xl surface bline border flex items-center gap-3 px-4 ink-3 text-[0.85rem] shadow-card hover:shadow-lg active:scale-[0.99] transition-all duration-200"
    >
      <Search size={17} className="c-gold" />
      <span className="flex-1 text-start">{t.searchPh}</span>
    </button>
  );
};

/* تنبيه عائم — تصميم محسّن */
export const Toast = () => {
  const toast = useApp((s) => s.toast);
  return (
    <motion.div
      initial={false}
      animate={{ y: toast ? 0 : 80, opacity: toast ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="absolute bottom-24 inset-x-0 flex justify-center z-[70] pointer-events-none px-6"
    >
      {toast && (
        <div className="bg-green text-[#f4ecd7] px-4 py-2.5 rounded-full text-[0.78rem] font-bold shadow-pop flex items-center gap-2 max-w-full">
          <Check size={14} className="text-[#e9d9a6]" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </motion.div>
  );
};

/* عمليات على شريط: مفضلة/تحميل/مشاركة — تصميم محسّن */
export const FavBtn = ({ id, size = 38 }: { id: string; size?: number }) => {
  const fav = useApp((s) => s.favs.includes(id));
  const toggleFav = useApp((s) => s.toggleFav);
  const showToast = useApp((s) => s.showToast);
  const t = useSettings((s) => s.t);
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      aria-label={t.fav}
      onClick={(e) => { e.stopPropagation(); toggleFav(id); showToast(fav ? t.favDel : t.favAdd); }}
      className={`rounded-full border bline flex items-center justify-center transition-all duration-200 ${
        fav ? "bg-gold border-transparent text-[#231a05] shadow-card" : "surface ink-2 hover:shadow-card"
      }`}
      style={{ width: size, height: size }}
    >
      <HeartIcon size={size * 0.42} fill={fav ? "currentColor" : "none"} />
    </motion.button>
  );
};

export const itemAgo = (item: AudioItem, lang: "ar" | "en") => fmtAgo(item.addedDays, lang);
