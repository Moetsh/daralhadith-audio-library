/* شاشة تفاصيل الشريط الصوتي */
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Clock3, Download, ListPlus, Play } from "lucide-react";
import { useState } from "react";
import {
  catById, catColor, itemById, itemsOfSeries, missingEpisodesOfSeries, relatedOf, scholarById, seriesById, mainOf,
} from "../data/library";
import { ar, fmtAgo, fmtCount, fmtDur } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { AudioCardH, BackBtn, Cover, Eq, FavBtn, SectionHead } from "../components/ui";
import { PlayBig, XBtn } from "../components/Player";

export const DetailScreen = ({ id }: { id: string }) => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const [shown, setShown] = useState(30);
  const it = itemById(id);
  if (!it) return null;
  const sch = scholarById(it.scholarId);
  const main = mainOf(it.categoryId);
  const series = seriesById(it.seriesId);
  const eps = series ? itemsOfSeries(series.id) : [];
  const missing = series ? missingEpisodesOfSeries(series.id) : [];
  const related = relatedOf(it);
  const queueIds = eps.length ? eps.map((x) => x.id) : related.map((x) => x.id);
  const extra = useApp((s) => s.counts[it.id] ?? 0);

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      {/* الترويسة الزخرفية — تصميم محسّن */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: catColor(it.categoryId) }} />
        <div className="absolute inset-0 girih opacity-[0.1]" style={{ color: "#e9d9a6" }} />
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,.15) 0%, transparent 60%)" }} />
        <div className="relative max-w-lg mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <BackBtn />
            <div className="flex gap-2"><FavBtn id={it.id} size={40} /></div>
          </div>
          <div className="flex flex-col items-center mt-4">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="w-full">
              <Cover catId={it.categoryId} icon={catById(it.categoryId)?.icon} radius={26} src={it.cover} title={it.title} fluid />
            </motion.div>
            {it.episode && series && (
              <span className="mt-3 text-[0.62rem] font-black text-[#e9d9a6] bg-black/25 backdrop-blur-sm rounded-full px-3 py-1">
                {t.ep} {ar(it.episode)} {t.of} {ar(eps.length)} — {series.title}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-[160px] max-w-lg mx-auto -mt-1">
        <h1 className="font-extrabold text-[1.2rem] ink leading-relaxed mt-4 text-center">{it.title}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          <button onClick={() => nav.push({ name: "scholar", id: sch.id })} className="h-9 px-3.5 rounded-full soft-green c-green text-[0.78rem] font-extrabold active:scale-95 transition">
            {sch.name}
          </button>
          <button onClick={() => nav.push({ name: "cat", id: main.id })} className="h-9 px-3.5 rounded-full soft-gold c-gold text-[0.78rem] font-extrabold active:scale-95 transition">
            {main.name}
          </button>
        </div>

        {/* البيانات الوصفية */}
        <div className="flex items-center justify-center gap-4 mt-4 ink-3 text-[0.72rem] font-bold">
          <span className="flex items-center gap-1.5"><Clock3 size={13} className="c-gold" />{fmtDur(it.duration, lang)}</span>
          <span className="w-1 h-1 rounded-full bg-gold" />
          <span>{fmtCount(it.listenCount + extra, lang)} {t.listenCount}</span>
          <span className="w-1 h-1 rounded-full bg-gold" />
          <span>{fmtAgo(it.addedDays, lang)}</span>
        </div>

        <ResumeBar id={it.id} />

        {/* أزرار الإجراءات */}
        <div className="flex gap-2.5 mt-5">
          <PlayBig id={it.id} queue={queueIds} label={t.play} />
          <DlBtn id={it.id} />
          <PlBtn id={it.id} />
        </div>

        {/* النبذة */}
        <div className="mt-7">
          <SectionHead title={t.about} />
          <p className="ink-2 text-[0.85rem] leading-loose whitespace-pre-line surface bline border rounded-2xl p-4">{it.description}</p>
        </div>

        {/* حلقات السلسلة */}
        {eps.length > 1 && (
          <div className="mt-7">
            <SectionHead title={`${t.seriesEps} — ${series!.title}`} />
            {missing.length > 0 && (
              <div className="surface bline border rounded-2xl p-3 mb-3">
                <div className="c-danger text-[0.7rem] font-extrabold flex items-center gap-1.5 flex-wrap">
                  <span>شرائط ناقصة ({ar(missing.length)})</span>
                  <span className="ink-3 font-bold">— تُضاف عند صدورها</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missing.map((n) => (
                    <span key={n} className="text-[0.66rem] font-black px-2 py-0.5 rounded-full soft-gold c-gold" style={{ fontFamily: "Amiri" }}>{ar(n)}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {eps.slice(0, shown).map((ep) => <EpRow key={ep.id} epId={ep.id} queueIds={queueIds} />)}
            </div>
            {eps.length > shown && (
              <button onClick={() => setShown(shown + 40)}
                className="mt-3 w-full h-10 rounded-xl surface bline border c-gold text-[0.78rem] font-extrabold active:scale-[0.98] transition">
                عرض المزيد ({ar(eps.length - shown)})
              </button>
            )}
          </div>
        )}

        {/* ذات صلة */}
        <div className="mt-7">
          <SectionHead title={t.related} />
          <div className="flex gap-3.5 overflow-x-auto no-bar -mx-4 px-4 pb-1">
            {related.map((r) => <AudioCardH key={r.id} item={r} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResumeBar = ({ id }: { id: string }) => {
  const pos = useApp((s) => s.positions[id]);
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  if (!pos || pos.done || pos.pos < 10) return null;
  const pct = pos.dur ? Math.min(100, (pos.pos / pos.dur) * 100) : 0;
  return (
    <div className="mt-4 surface bline border rounded-2xl p-3 flex items-center gap-3">
      <CheckCircle2 size={16} className="c-gold shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-[0.68rem] font-bold ink-2 mb-1.5">
          <span>{t.resumeFrom} {fmtDur(pos.pos, lang)}</span>
          <span className="c-gold">{ar(Math.round(pct))}٪</span>
        </div>
        <div className="h-[5px] rounded-full" style={{ background: "var(--line)" }}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

const DlBtn = ({ id }: { id: string }) => {
  const rec = useApp((s) => s.downloads[id]);
  const start = useApp((s) => s.startDownload);
  const rm = useApp((s) => s.removeDownload);
  const showToast = useApp((s) => s.showToast);
  const wifiOnly = useSettings((s) => s.wifiOnly);
  const t = useSettings((s) => s.t);

  if (rec?.status === "done")
    return (
      <button onClick={() => { rm(id); showToast(t.delete); }}
        className="w-12 h-12 rounded-2xl soft-green c-green flex items-center justify-center active:scale-90 transition" aria-label={t.downloaded}>
        <Check size={18} strokeWidth={2.5} />
      </button>
    );
  if (rec?.status === "active")
    return (
      <button className="w-12 h-12 rounded-2xl soft-gold c-gold flex items-center justify-center" aria-label={t.downloading}>
        <span className="text-[0.6rem] font-black">{ar(Math.round(rec.p * 100))}٪</span>
      </button>
    );
  if (rec?.status === "queued")
    return (
      <button onClick={() => showToast(t.wifiNote)} className="w-12 h-12 rounded-2xl soft-gold c-gold flex items-center justify-center active:scale-90 transition" aria-label={t.queued}>
        <Clock3 size={16} />
      </button>
    );
  return (
    <button onClick={() => start(id, wifiOnly, t.wifiNote)}
      className="w-12 h-12 rounded-2xl surface bline border ink-2 flex items-center justify-center active:scale-90 transition" aria-label={t.download}>
      <Download size={16} />
    </button>
  );
};

const PlBtn = ({ id }: { id: string }) => {
  const [open, setOpen] = useState(false);
  const playlists = useApp((s) => s.playlists);
  const addToPlaylist = useApp((s) => s.addToPlaylist);
  const showToast = useApp((s) => s.showToast);
  const t = useSettings((s) => s.t);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-12 h-12 rounded-2xl surface bline border ink-2 flex items-center justify-center active:scale-90 transition" aria-label={t.addToPl}>
        <ListPlus size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="absolute top-14 end-0 z-40 surface border bline rounded-2xl shadow-pop p-2 w-52"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[0.7rem] font-extrabold ink">{t.addToPl}</span>
              <XBtn onClick={() => setOpen(false)} />
            </div>
            {playlists.map((pl) => (
              <button key={pl.id}
                onClick={() => { addToPlaylist(pl.id, id); showToast(pl.name); setOpen(false); }}
                className="w-full text-start px-3 py-2.5 rounded-xl text-[0.78rem] font-bold ink-2 active:bg-[var(--green-soft)] flex justify-between items-center">
                <span className="truncate">{pl.name}</span>
                <span className="ink-3 text-[0.65rem]">{ar(pl.ids.length)}</span>
              </button>
            ))}
            {playlists.length === 0 && <div className="px-3 py-2 text-[0.74rem] ink-3">{t.emptyPl}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EpRow = ({ epId, queueIds }: { epId: string; queueIds: string[] }) => {
  const ep = itemById(epId)!;
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const cur = usePlayer((s) => s.currentId);
  const status = usePlayer((s) => s.status);
  const done = useApp((s) => s.positions[epId]?.done);
  const isCur = cur === epId;
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={() => nav.push({ name: "detail", id: epId })}
      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-start transition-all duration-200 ${
        isCur ? "soft-gold border-[var(--gold)]/30 shadow-card" : "surface bline shadow-card hover:shadow-md"
      }`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-[0.78rem] font-black shrink-0 transition-all duration-200 ${
        isCur ? "bg-gold text-[#231a05] shadow-pop" : done ? "bg-green/10 c-green" : "soft-green c-green"
      }`}>
        {done && !isCur ? <Check size={16} strokeWidth={3} /> : ar(ep.episode ?? 0)}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-bold text-[0.82rem] leading-snug truncate ${isCur ? "c-gold" : "ink"}`}>{ep.title}</span>
        <span className="ink-3 text-[0.68rem] font-bold">{fmtDur(ep.duration, lang)}</span>
      </span>
      <span
        role="button" aria-label={t.play}
        onClick={(e) => { e.stopPropagation(); play(epId, queueIds); }}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ${
          isCur && status === "playing" ? "bg-gold text-[#231a05] shadow-pop" : "soft-green c-green hover:bg-[var(--green)] hover:text-white"
        }`}
      >
        {isCur && status === "playing" ? <Eq size={13} /> : <Play size={15} fill="currentColor" className="translate-x-[1px]" />}
      </span>
    </motion.button>
  );
};
