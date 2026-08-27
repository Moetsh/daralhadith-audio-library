/* واجهة المشغل: المصغر + الشاشة الكاملة */
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  ChevronDown, Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward,
  Timer, Gauge, ListMusic, ListPlus, Check, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { itemById, scholarById, catById } from "../data/library";
import { ar, fmtDur, fmtCount } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { Cover, Eq, FavBtn, GirihBG, CatIcon } from "./ui";

/* شريط تقدم مخصص متوافق RTL */
export const SeekBar = ({ value, max, onSeek, gold = true }: { value: number; max: number; onSeek: (v: number) => void; gold?: boolean }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="relative h-6 flex items-center select-none" dir="ltr">
      <div className="absolute inset-x-0 h-[5px] rounded-full" style={{ background: "var(--line)" }} />
      <div
        className="absolute h-[5px] rounded-full"
        style={{ width: `${pct}%`, left: 0, background: gold ? "var(--gold)" : "var(--green)" }}
      />
      <div
        className="absolute w-[15px] h-[15px] rounded-full border-[3px] shadow"
        style={{
          left: `calc(${pct}% - 7px)`,
          background: gold ? "var(--gold)" : "var(--green)",
          borderColor: "var(--card)",
        }}
      />
      <input
        type="range" min={0} max={Math.max(1, Math.floor(max))} step={1} value={Math.floor(value)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        aria-label="seek"
      />
    </div>
  );
};

const SPEED_LABEL = (v: number) => (v === 1 ? "1×" : `${v}×`);

/* ── المشغل المصغر ── */
export const MiniPlayer = () => {
  const { currentId, status, position, duration, toggle, next, setSheet } = usePlayer();
  const t = useSettings((s) => s.t);
  if (!currentId) return null;
  const it = itemById(currentId);
  if (!it) return null;
  const sch = scholarById(it.scholarId);
  const playing = status === "playing";
  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="absolute bottom-[84px] inset-x-3 z-40"
    >
      <div
        className="rounded-2xl overflow-hidden shadow-pop border bline cursor-pointer"
        style={{ background: "var(--card)" }}
        onClick={() => setSheet(true)}
      >
        <div className="relative h-[3px]" style={{ background: "var(--line)" }}>
          <div className="absolute h-full bg-gold" style={{ width: `${pct}%`, insetInlineStart: 0 }} />
        </div>
        <div className="flex items-center gap-2.5 p-2.5">
          <Cover catId={it.categoryId} icon={catById(it.categoryId)?.icon} size={44} radius={12} playing={playing} src={it.cover} title={it.title} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[0.82rem] ink truncate">{it.title}</div>
            <div className="ink-3 text-[0.68rem] truncate flex items-center gap-1.5">
              {playing && <Eq size={10} />}
              <span>{sch.name}</span>
            </div>
          </div>
          <button
            aria-label={t.play}
            className="w-10 h-10 rounded-full bg-green text-[#f4ecd7] flex items-center justify-center active:scale-90 transition"
            onClick={(e) => { e.stopPropagation(); toggle(); }}
          >
            {status === "loading" ? (
              <span className="w-4 h-4 rounded-full border-2 border-[#f4ecd7]/40 border-t-[#f4ecd7] animate-spin" />
            ) : playing ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="translate-x-[1px]" />
            )}
          </button>
          <button
            aria-label="next"
            className="w-8 h-8 rounded-full soft-green c-green flex items-center justify-center active:scale-90 transition"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ── المشغل الكامل ── */
export const FullPlayer = () => {
  const open = usePlayer((s) => s.sheetOpen);
  return (
    <AnimatePresence>
      {open && <SheetContent />}
    </AnimatePresence>
  );
};

const SheetContent = () => {
  const p = usePlayer();
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const showToast = useApp((s) => s.showToast);
  const playlists = useApp((s) => s.playlists);
  const addToPlaylist = useApp((s) => s.addToPlaylist);
  const [panel, setPanel] = useState<null | "speed" | "sleep" | "pl" | "queue">(null);
  const [, tick] = useState(0);
  const controls = useDragControls();

  useEffect(() => {
    const i = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => window.clearInterval(i);
  }, []);

  const it = p.currentId ? itemById(p.currentId) : undefined;
  if (!it) return null;
  const sch = scholarById(it.scholarId);
  const cat = catById(it.categoryId);
  const playing = p.status === "playing";
  const sleepLeft = p.sleepMode === "min" && p.sleepAt ? Math.max(0, p.sleepAt - Date.now()) : 0;

  const Btn = ({ children, onClick, big = false, label }: { children: React.ReactNode; onClick?: () => void; big?: boolean; label?: string }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-full flex items-center justify-center transition active:scale-85 ${
        big
          ? "w-[68px] h-[68px] bg-gold text-[#231a05] shadow-pop"
          : "w-12 h-12 ink-2"
      }`}
    >
      {children}
    </button>
  );

  const SubBtn = ({ icon: Icon, label, onClick, badge }: { icon: any; label: string; onClick: () => void; badge?: string }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition">
      <span className="w-11 h-11 rounded-2xl surface-2 bline border flex items-center justify-center ink-2 relative">
        <Icon size={17} />
        {badge && <span className="absolute -top-1.5 -end-1.5 bg-gold text-[#231a05] text-[0.58rem] font-black px-1.5 h-4 rounded-full flex items-center">{badge}</span>}
      </span>
      <span className="text-[0.62rem] ink-3 font-bold">{label}</span>
    </button>
  );

  const queueItems = p.queue.map((id) => itemById(id)).filter(Boolean);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 360, damping: 38 }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 110) p.setSheet(false); }}
    >
      <GirihBG opacity={0.03} />
      {/* مقبض السحب */}
      <div
        className="relative flex justify-center pt-2.5 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: "none" }}
      >
        <span className="w-12 h-1.5 rounded-full" style={{ background: "var(--line)" }} />
      </div>
      {/* الرأس */}
      <div className="relative flex items-center justify-between px-4 pt-1.5 pb-1">
        <button onClick={() => p.setSheet(false)} className="w-10 h-10 rounded-full surface bline border flex items-center justify-center ink active:scale-90 transition" aria-label="close">
          <ChevronDown size={20} />
        </button>
        <div className="text-center">
          <div className="text-[0.66rem] font-bold tracking-widest c-gold">{t.listeningNow}</div>
          <div className="text-[0.72rem] ink-3 font-bold mt-0.5">{cat?.name}</div>
        </div>
        <FavBtn id={it.id} size={40} />
      </div>

      <div className="relative flex-1 overflow-y-auto no-bar px-6 pb-6">
        {/* الغلاف — تصميم محسّن */}
        <div className="flex justify-center mt-4 mb-6">
          <motion.div
            animate={playing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={playing ? { duration: 2.4, repeat: Infinity } : {}}
            className="relative"
          >
            <Cover catId={it.categoryId} size={340} radius={40} icon={catById(it.categoryId)?.icon} src={it.cover} title={it.title} />
            {playing && (
              <div className="absolute -bottom-3 inset-x-0 flex justify-center">
                <span className="bg-gold text-[#231a05] rounded-full px-3 py-1 shadow-pop flex items-center gap-1.5">
                  <Eq size={12} />
                  <span className="text-[0.62rem] font-black">{ar(String(p.speed))}×</span>
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* العنوان */}
        <h1 className="text-center font-extrabold text-[1.15rem] ink leading-relaxed">{it.title}</h1>
        <div className="text-center ink-2 text-[0.82rem] mt-1 font-bold">{sch.name}</div>
        <div className="text-center ink-3 text-[0.68rem] mt-1">
          {fmtDur(it.duration, lang)} · {fmtCount(it.listenCount, lang)} {t.listenCount}
          {it.episode ? ` · ${t.ep} ${ar(it.episode)}` : ""}
        </div>

        {/* شريط التقدم */}
        <div className="mt-5">
          <SeekBar value={p.position} max={p.duration || it.duration} onSeek={(v) => p.seekTo(v)} />
          <div className="flex justify-between text-[0.7rem] font-bold ink-3 -mt-0.5" dir="ltr">
            <span>{fmtDur(p.position, lang)}</span>
            <span>-{fmtDur(Math.max(0, (p.duration || it.duration) - p.position), lang)}</span>
          </div>
        </div>

        {p.status === "error" && (
          <div className="mt-2 text-center text-[0.72rem] font-bold c-danger">تعذر تشغيل البث — تحقق من الاتصال بالإنترنت</div>
        )}

        {/* أزرار التحكم الرئيسية */}
        <div className="flex items-center justify-center gap-1 mt-3">
          <Btn onClick={() => p.prev()} label="prev"><SkipBack size={20} fill="currentColor" /></Btn>
          <Btn onClick={() => p.seekBy(-15)} label="-15">
            <span className="relative flex items-center justify-center">
              <RotateCcw size={22} />
              <span className="absolute text-[0.5rem] font-black mt-0.5">15</span>
            </span>
          </Btn>
          <Btn big onClick={() => p.toggle()} label={t.play}>
            {p.status === "loading" ? (
              <span className="w-6 h-6 rounded-full border-[3px] border-[#231a05]/30 border-t-[#231a05] animate-spin" />
            ) : playing ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="translate-x-[2px]" />
            )}
          </Btn>
          <Btn onClick={() => p.seekBy(15)} label="+15">
            <span className="relative flex items-center justify-center">
              <RotateCw size={22} />
              <span className="absolute text-[0.5rem] font-black mt-0.5">15</span>
            </span>
          </Btn>
          <Btn onClick={() => p.next()} label="next"><SkipForward size={20} fill="currentColor" /></Btn>
        </div>

        {/* أزرار ثانوية */}
        <div className="flex items-start justify-center gap-5 mt-6">
          <SubBtn icon={Gauge} label={t.speed} badge={SPEED_LABEL(p.speed)} onClick={() => setPanel(panel === "speed" ? null : "speed")} />
          <SubBtn
            icon={Timer} label={t.sleep}
            badge={p.sleepMode === "min" ? fmtDur(sleepLeft / 1000, lang) : p.sleepMode === "track" ? "♪" : undefined}
            onClick={() => setPanel(panel === "sleep" ? null : "sleep")}
          />
          <SubBtn icon={ListPlus} label={t.addToPl} onClick={() => setPanel(panel === "pl" ? null : "pl")} />
        </div>

        {/* اللوحات المنبثقة */}
        <AnimatePresence>
          {panel && (
            <motion.div
              key={panel}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-5 surface bline border rounded-2xl p-3 shadow-card"
            >
              {panel === "speed" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => (
                    <button
                      key={v}
                      onClick={() => { p.setSpeed(v); setPanel(null); }}
                      className={`h-9 px-3.5 rounded-full text-[0.8rem] font-extrabold border transition ${p.speed === v ? "bg-gold text-[#231a05] border-transparent" : "bline ink-2"}`}
                    >
                      {SPEED_LABEL(v)}
                    </button>
                  ))}
                </div>
              )}
              {panel === "sleep" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {[15, 30, 45, 60].map((m) => (
                    <button key={m} onClick={() => { p.setSleep("min", m); setPanel(null); showToast(`${t.sleep}: ${ar(m)} ${t.min}`); }}
                      className={`h-9 px-3.5 rounded-full text-[0.8rem] font-extrabold border transition ${p.sleepMode === "min" && p.sleepAt ? "bline ink-2" : "bline ink-2"}`}>
                      {ar(m)} {t.min}
                    </button>
                  ))}
                  <button onClick={() => { p.setSleep("track"); setPanel(null); showToast(t.sleepEnd); }}
                    className={`h-9 px-3.5 rounded-full text-[0.8rem] font-extrabold border transition ${p.sleepMode === "track" ? "bg-gold text-[#231a05] border-transparent" : "bline ink-2"}`}>
                    {t.sleepEnd}
                  </button>
                  <button onClick={() => { p.setSleep(null); setPanel(null); }}
                    className="h-9 px-3.5 rounded-full text-[0.8rem] font-extrabold border bline c-danger">
                    {t.sleepOff}
                  </button>
                </div>
              )}
              {panel === "pl" && (
                <div className="space-y-1.5">
                  {playlists.length === 0 && <div className="text-center ink-3 text-[0.78rem] py-2">{t.emptyPl}</div>}
                  {playlists.map((pl) => (
                    <button key={pl.id} onClick={() => { addToPlaylist(pl.id, it.id); showToast(`${t.addToPl}: ${pl.name}`); setPanel(null); }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl surface-2 bline border ink text-[0.82rem] font-bold active:scale-[0.98] transition">
                      <ListMusic size={16} className="c-gold" />
                      <span className="flex-1 text-start truncate">{pl.name}</span>
                      <span className="ink-3 text-[0.68rem]">{ar(pl.ids.length)}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* قائمة التشغيل */}
        {queueItems.length > 1 && (
          <div className="mt-6">
            <button onClick={() => setPanel(panel === "queue" ? null : "queue")}
              className="w-full flex items-center justify-between px-1 mb-2">
              <span className="font-extrabold ink text-[0.85rem] flex items-center gap-2">
                <ListMusic size={15} className="c-gold" /> {t.upNext}
              </span>
              <span className="ink-3 text-[0.7rem] font-bold">{ar(queueItems.length)} {t.items}</span>
            </button>
            <AnimatePresence initial={false}>
              {panel === "queue" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-bar pb-1">
                    {queueItems.map((q, i) => (
                      <button key={q!.id}
                        onClick={() => p.playItem(q!.id, p.queue)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-start transition active:scale-[0.99] ${q!.id === p.currentId ? "soft-gold border-transparent" : "surface bline"}`}>
                        <span className="w-5 text-center text-[0.68rem] font-black c-gold shrink-0">{ar(i + 1)}</span>
                        <span className={`flex-1 text-[0.78rem] font-bold truncate ${q!.id === p.currentId ? "c-gold" : "ink"}`}>{q!.title}</span>
                        {q!.id === p.currentId && playing ? <Eq size={11} /> : <span className="ink-3 text-[0.66rem]">{fmtDur(q!.duration, lang)}</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-6 text-center text-[0.64rem] ink-3 font-bold flex items-center justify-center gap-1.5">
          <CatIcon icon="waves" size={12} className="c-gold" />
          {p.usedAlt ? "بث تجريبي — مصدر احتياطي (Internet Archive)" : t.demoTag}
        </div>
      </div>
    </motion.div>
  );
};

/* زر تشغيل ذهبي كبير لصفحات التفاصيل */
export const PlayBig = ({ id, queue, label }: { id: string; queue?: string[]; label: string }) => {
  const play = usePlayer((s) => s.playItem);
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => play(id, queue ?? [id])}
      className="flex-1 h-12 rounded-2xl bg-gold text-[#231a05] font-extrabold text-[0.9rem] flex items-center justify-center gap-2 shadow-pop"
    >
      <Play size={18} fill="currentColor" />
      {label}
    </motion.button>
  );
};

export const XBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-8 h-8 rounded-full surface-2 bline border flex items-center justify-center ink-3 active:scale-90 transition" aria-label="close">
    <X size={14} />
  </button>
);

export { Check };
