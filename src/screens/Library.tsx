/* شاشة مكتبتي: المفضلة، التحميلات، قوائم التشغيل، الأخيرة */
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown, ArrowUp, Check, Download, HardDrive, Heart, History, ListMusic, Play, Plus, Trash2, X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { catById, itemById, scholarById } from "../data/library";
import type { AudioItem } from "../data/library";
import { ar, fmtDur, fmtMB } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { Cover, EmptyState, Eq, GirihBG, BackBtn } from "../components/ui";
const TABS = [Heart, Download, ListMusic, History] as const;

export const LibraryScreen = ({ tab = 0 }: { tab?: number }) => {
  const t = useSettings((s) => s.t);
  const [idx, setIdx] = useState(tab);
  const labels = [t.favorites, t.downloads, t.playlists, t.history];

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <h1 className="font-brand text-[1.4rem] ink">{t.library}</h1>

        <div className="mt-4 surface bline border rounded-2xl p-1 flex gap-1 shadow-card">
          {labels.map((l, i) => {
            const Icon = TABS[i];
            return (
              <button key={l} onClick={() => setIdx(i)}
                className={`flex-1 h-9 rounded-xl text-[0.72rem] font-extrabold flex items-center justify-center gap-1.5 transition ${idx === i ? "bg-green text-[#f4ecd7]" : "ink-3"}`}>
                <Icon size={13} /> {l}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {idx === 0 && <FavTab />}
          {idx === 1 && <DlTab />}
          {idx === 2 && <PlTab />}
          {idx === 3 && <HistTab />}
        </div>
      </div>
    </div>
  );
};

/* صف مكتبة عام مع زر إجراء */
const LibRow = ({ item, trailing, extra }: { item: AudioItem; trailing?: React.ReactNode; extra?: React.ReactNode }) => {
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const cur = usePlayer((s) => s.currentId);
  const status = usePlayer((s) => s.status);
  const lang = useSettings((s) => s.lang);
  const isCur = cur === item.id;
  return (
    <motion.div layout whileTap={{ scale: 0.985 }}
      onClick={() => nav.push({ name: "detail", id: item.id })}
      className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer border transition ${isCur ? "soft-gold border border-[var(--gold)]/30 shadow-card" : "surface bline"}`}>
      <Cover catId={item.categoryId} icon={catById(item.categoryId)?.icon} size={50} src={item.cover} playing={isCur && status === "playing"} />
      <div className="min-w-0 flex-1">
        <div className={`font-bold text-[0.85rem] leading-snug truncate ${isCur ? "c-gold" : "ink"}`}>{item.title}</div>
        <div className="ink-3 text-[0.7rem] font-bold truncate mt-0.5">{scholarById(item.scholarId).name} · {fmtDur(item.duration, lang)}</div>
        {extra}
      </div>
      <button aria-label="play" onClick={(e) => { e.stopPropagation(); play(item.id); }}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition ${isCur && status === "playing" ? "bg-gold text-[#231a05]" : "soft-green c-green"}`}>
        {isCur && status === "playing" ? <Eq size={12} /> : <PlayIc />}
      </button>
      {trailing}
    </motion.div>
  );
};

const PlayIc = () => <Play size={14} fill="currentColor" className="translate-x-[1px]" />;

/* ── المفضلة ── */
const FavTab = () => {
  const t = useSettings((s) => s.t);
  const favs = useApp((s) => s.favs);
  const toggleFav = useApp((s) => s.toggleFav);
  const items = favs.map((id) => itemById(id)).filter(Boolean) as AudioItem[];
  if (!items.length) return <EmptyState icon={Heart} title={t.emptyFav} hint={t.emptyFavH} />;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <LibRow key={it.id} item={it}
          trailing={
            <button aria-label={t.favDel} onClick={(e) => { e.stopPropagation(); toggleFav(it.id); }}
              className="w-8 h-8 rounded-full soft-gold c-gold flex items-center justify-center active:scale-90 transition">
              <Heart size={13} fill="currentColor" />
            </button>
          } />
      ))}
    </div>
  );
};

/* ── التحميلات ── */
const DlTab = () => {
  const t = useSettings((s) => s.t);
  const downloads = useApp((s) => s.downloads);
  const rm = useApp((s) => s.removeDownload);
  const wifiOnly = useSettings((s) => s.wifiOnly);
  const entries = Object.entries(downloads);
  const items = entries.map(([id, rec]) => ({ it: itemById(id), rec })).filter((x) => x.it) as { it: AudioItem; rec: any }[];

  const usedMB = items.reduce((a, { it, rec }) => a + (it.duration / 60) * 0.96 * (rec.status === "done" ? 1 : rec.p), 0);
  const quota = 2048;

  return (
    <div>
      <div className="surface bline border rounded-2xl p-4 shadow-card relative overflow-hidden">
        <GirihBG opacity={0.05} />
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl soft-green c-green flex items-center justify-center"><HardDrive size={17} /></span>
          <div className="flex-1">
            <div className="flex justify-between text-[0.72rem] font-bold ink-2">
              <span>{t.storage}</span>
              <span><span className="c-gold">{fmtMB(usedMB)}</span> {t.storageOf} {fmtMB(quota)}</span>
            </div>
            <div className="h-[6px] rounded-full mt-2 overflow-hidden" style={{ background: "var(--line)" }}>
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${Math.min(100, (usedMB / quota) * 100)}%` }} />
            </div>
          </div>
        </div>
        {wifiOnly && <p className="relative text-[0.62rem] ink-3 font-bold mt-2.5">{t.wifiOnly} ✓</p>}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Download} title={t.emptyDl} hint={t.emptyDlH} />
      ) : (
        <div className="space-y-2 mt-4">
          {items.map(({ it, rec }) => (
            <LibRow key={it.id} item={it}
              extra={
                rec.status === "active" ? (
                  <div className="h-[4px] rounded-full mt-1.5 overflow-hidden w-3/4" style={{ background: "var(--line)" }}>
                    <div className="h-full bg-gold" style={{ width: `${rec.p * 100}%` }} />
                  </div>
                ) : rec.status === "queued" ? (
                  <div className="text-[0.62rem] c-gold font-bold mt-0.5">{t.queued}</div>
                ) : (
                  <div className="text-[0.62rem] c-green font-bold mt-0.5 flex items-center gap-1"><Check size={10} strokeWidth={3} /> {t.downloaded} · {fmtMB((it.duration / 60) * 0.96)}</div>
                )
              }
              trailing={
                <button aria-label={t.delete} onClick={(e) => { e.stopPropagation(); rm(it.id); }}
                  className="w-8 h-8 rounded-full surface-2 bline border c-danger flex items-center justify-center active:scale-90 transition">
                  <Trash2 size={13} />
                </button>
              } />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── قوائم التشغيل ── */
const PlTab = () => {
  const t = useSettings((s) => s.t);
  const playlists = useApp((s) => s.playlists);
  const addPlaylist = useApp((s) => s.addPlaylist);
  const delPlaylist = useApp((s) => s.delPlaylist);
  const nav = useNav();
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");

  return (
    <div>
      <div className="flex gap-2">
        <button onClick={() => setMaking(true)}
          className="flex-1 h-11 rounded-2xl border-2 border-dashed bline ink-3 text-[0.78rem] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition">
          <Plus size={15} className="c-gold" /> {t.newPlaylist}
        </button>
      </div>
      <AnimatePresence>
        {making && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex gap-2 mt-2.5">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.plName}
                className="flex-1 h-11 rounded-2xl surface bline border px-4 text-[0.82rem] ink outline-none focus:!border-[var(--gold)] min-w-0" />
              <button onClick={() => { if (name.trim()) { addPlaylist(name.trim()); setName(""); setMaking(false); } }}
                className="h-11 px-4 rounded-2xl bg-gold text-[#231a05] text-[0.78rem] font-extrabold active:scale-95 transition">{t.create}</button>
              <button onClick={() => setMaking(false)} className="h-11 px-3.5 rounded-2xl surface bline border ink-3 text-[0.78rem] font-bold">{t.cancel}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {playlists.length === 0 ? (
        <EmptyState icon={ListMusic} title={t.emptyPl} hint={t.emptyPlH} />
      ) : (
        <div className="space-y-2.5 mt-4">
          {playlists.map((pl) => (
            <motion.div key={pl.id} layout whileTap={{ scale: 0.98 }}
              onClick={() => nav.push({ name: "playlist", id: pl.id })}
              className="surface bline border rounded-2xl p-3.5 flex items-center gap-3.5 cursor-pointer shadow-card relative overflow-hidden">
              <GirihBG opacity={0.05} />
              <span className="w-12 h-12 rounded-2xl bg-green flex items-center justify-center relative shadow-card">
                <span className="absolute inset-0 girih opacity-20" style={{ color: "#e9d9a6" }} />
                <ListMusic size={20} className="text-[#e9d9a6] relative" />
              </span>
              <div className="flex-1 min-w-0 relative">
                <div className="font-extrabold ink text-[0.88rem] truncate">{pl.name}</div>
                <div className="ink-3 text-[0.7rem] font-bold mt-0.5">{ar(pl.ids.length)} {t.items}</div>
              </div>
              <button aria-label={t.delete} onClick={(e) => { e.stopPropagation(); delPlaylist(pl.id); }}
                className="w-8 h-8 rounded-full surface-2 bline border c-danger flex items-center justify-center active:scale-90 transition relative">
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── شاشة قائمة تشغيل واحدة ── */
export const PlaylistScreen = ({ id }: { id: string }) => {
  const t = useSettings((s) => s.t);
  const pl = useApp((s) => s.playlists.find((p) => p.id === id));
  const removeFromPlaylist = useApp((s) => s.removeFromPlaylist);
  const moveInPlaylist = useApp((s) => s.moveInPlaylist);
  const play = usePlayer((s) => s.playItem);
  const items = useMemo(() => (pl ? pl.ids.map((x) => itemById(x)).filter(Boolean) as AudioItem[] : []), [pl]);
  if (!pl) return null;

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <BackBtn />
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold ink text-[1.05rem] truncate">{pl.name}</h1>
            <p className="ink-3 text-[0.68rem] font-bold mt-0.5">{ar(items.length)} {t.items}</p>
          </div>
        </div>

        {items.length > 0 && (
          <button onClick={() => play(items[0].id, items.map((x) => x.id))}
            className="w-full h-11 rounded-2xl bg-gold text-[#231a05] font-extrabold text-[0.85rem] mt-4 flex items-center justify-center gap-2 shadow-pop active:scale-[0.98] transition">
            <Play size={16} fill="currentColor" /> {t.playAll}
          </button>
        )}

        {items.length === 0 ? (
          <EmptyState icon={ListMusic} title={t.emptyPl} hint={t.emptyPlH} />
        ) : (
          <div className="space-y-2 mt-4">
            {items.map((it, i) => (
              <LibRow key={it.id} item={it}
                trailing={
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {i > 0 && (
                      <button aria-label="up" onClick={() => moveInPlaylist(pl.id, i, i - 1)}
                        className="w-7 h-7 rounded-full surface-2 bline border ink-3 flex items-center justify-center active:scale-90">
                        <ArrowUp size={12} />
                      </button>
                    )}
                    {i < items.length - 1 && (
                      <button aria-label="down" onClick={() => moveInPlaylist(pl.id, i, i + 1)}
                        className="w-7 h-7 rounded-full surface-2 bline border ink-3 flex items-center justify-center active:scale-90">
                        <ArrowDown size={12} />
                      </button>
                    )}
                    <button aria-label={t.delete} onClick={() => removeFromPlaylist(pl.id, it.id)}
                      className="w-7 h-7 rounded-full surface-2 bline border c-danger flex items-center justify-center active:scale-90">
                      <X size={12} />
                    </button>
                  </div>
                } />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── الأخيرة ── */
const HistTab = () => {
  const t = useSettings((s) => s.t);
  const history = useApp((s) => s.history);
  const positions = useApp((s) => s.positions);
  const items = history.map((hh) => itemById(hh.id)).filter(Boolean) as AudioItem[];
  if (!items.length) return <EmptyState icon={History} title="لا يوجد سجل استماع" hint="ابدأ الاستماع وستظهر الأشرطة الأخيرة هنا" />;
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pos = positions[it.id];
        const pct = pos && pos.dur ? Math.min(100, (pos.pos / pos.dur) * 100) : 0;
        return (
          <LibRow key={it.id} item={it}
            extra={
              pos?.done ? (
                <span className="text-[0.62rem] c-green font-bold mt-0.5 flex items-center gap-1"><Check size={10} strokeWidth={3} /> {t.done}</span>
              ) : pct > 0 ? (
                <div className="h-[4px] rounded-full mt-1.5 overflow-hidden w-3/4" style={{ background: "var(--line)" }}>
                  <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
              ) : undefined
            } />
        );
      })}
    </div>
  );
};


