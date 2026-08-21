/* شاشة سلسلة المستخدم — تشغيل قائمة أو شريط منفرد */
import { useState } from "react";
import { ListMusic, Play, Trash2 } from "lucide-react";
import { catById, scholarById } from "../data/library";
import { ar } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { useUserContent, scholarIdOfSeries } from "../store/userContent";
import { AudioRow, Avatar, BackBtn, EmptyState, GirihBG } from "../components/ui";

export const UserSeriesScreen = ({ id }: { id: string }) => {
  const t = useSettings((s) => s.t);
  const nav = useNav();
  const showToast = useApp((s) => s.showToast);
  const play = usePlayer((s) => s.playItem);
  const series = useUserContent((s) => s.series.find((x) => x.id === id));
  const tracks = useUserContent((s) => s.tracks[id] ?? []);
  const removeSeries = useUserContent((s) => s.removeSeries);
  const [mode, setMode] = useState<"queue" | "single">("queue");

  if (!series) return null;
  const sch = scholarById(scholarIdOfSeries(id));
  const cat = catById(series.categoryId);
  const ids = tracks.map((x) => x.id);
  const queueIds = mode === "queue" ? ids : undefined;

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <BackBtn />
          <button aria-label={t.deleteSeries} onClick={() => { removeSeries(id); showToast(t.seriesDeleted); nav.pop(); }}
            className="w-10 h-10 rounded-full surface bline border c-danger flex items-center justify-center active:scale-90 transition shrink-0">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="surface bline border rounded-3xl p-4 mt-4 shadow-card relative overflow-hidden">
          <GirihBG opacity={0.04} />
          <div className="relative flex items-center gap-3.5">
            <Avatar scholar={sch} size={58} ring />
            <div className="min-w-0 flex-1">
              <div className="font-extrabold ink text-[1.02rem] leading-snug">{series.title}</div>
              <div className="ink-3 text-[0.75rem] font-bold mt-0.5">{sch.name} · {cat?.name ?? ""}</div>
              <div className="c-gold text-[0.68rem] font-bold mt-1">{ar(tracks.length)} {t.epsFound}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 surface bline border rounded-2xl p-1 flex gap-1 shadow-card">
          <button onClick={() => setMode("queue")}
            className={`flex-1 h-9 rounded-xl text-[0.72rem] font-extrabold transition ${mode === "queue" ? "bg-green text-[#f4ecd7]" : "ink-3"}`}>
            {t.playQueue}
          </button>
          <button onClick={() => setMode("single")}
            className={`flex-1 h-9 rounded-xl text-[0.72rem] font-extrabold transition ${mode === "single" ? "bg-green text-[#f4ecd7]" : "ink-3"}`}>
            {t.playSingle}
          </button>
        </div>

        {mode === "queue" && tracks.length > 0 && (
          <button onClick={() => play(ids[0], ids)}
            className="w-full h-11 rounded-2xl bg-gold text-[#231a05] font-extrabold text-[0.85rem] mt-3 flex items-center justify-center gap-2 shadow-pop active:scale-[0.98] transition">
            <Play size={16} fill="currentColor" /> {t.playAll}
          </button>
        )}

        {tracks.length === 0 ? (
          <EmptyState icon={ListMusic} title={t.emptySeries} hint={t.emptySeriesH} />
        ) : (
          <div className="space-y-2 mt-4">
            {tracks.map((it) => <AudioRow key={it.id} item={it} queue={queueIds} />)}
          </div>
        )}
      </div>
    </div>
  );
};
