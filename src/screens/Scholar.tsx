/* شاشة الشيخ / القارئ */
import { ListMusic } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { itemsOfScholar, scholarById, seriesOfScholar } from "../data/library";
import { PlayBig } from "../components/Player";
import { ar, fmtCount } from "../lib/utils";
import { useSettings } from "../store/core";
import { AudioRow, Avatar, BackBtn, GirihBG, SectionHead, SeriesCard } from "../components/ui";

export const ScholarScreen = ({ id }: { id: string }) => {
  const t = useSettings((s) => s.t);
  const sch = scholarById(id);
  const all = useMemo(() => [...itemsOfScholar(id)].sort((a, b) => b.listenCount - a.listenCount), [id]);
  const series = seriesOfScholar(id);
  const totalListens = all.reduce((a, b) => a + b.listenCount, 0);
  const queueIds = all.map((x) => x.id);

  const [shown, setShown] = useState(15);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShown(15);
    const el = sentinel.current;
    if (!el) return;
    const ob = new IntersectionObserver((es) => es[0].isIntersecting && setShown((s) => s + 15), { rootMargin: "300px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [id]);

  const visible = all.slice(0, shown);

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <div className="relative px-4 pt-4 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center"><BackBtn /></div>

        {/* البطاقة التعريفية */}
        <div className="mt-3 surface bline border rounded-3xl p-5 relative overflow-hidden shadow-card">
          <GirihBG opacity={0.05} />
          <div className="relative flex flex-col items-center text-center">
            <Avatar scholar={sch} size={92} ring />
            <h1 className="font-extrabold ink text-[1.2rem] mt-4">{sch.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="soft-gold c-gold text-[0.68rem] font-extrabold rounded-full px-3 py-1">{sch.title}</span>
              <span className="ink-3 text-[0.68rem] font-bold">{sch.era}</span>
            </div>
            <p className="ink-2 text-[0.82rem] leading-loose mt-3.5">{sch.bio}</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2 mt-5">
            {[
              [ar(all.length), t.tapes],
              [ar(series.length), t.suggested],
              [fmtCount(totalListens), t.listenCount],
            ].map(([n, l], i) => (
              <div key={i} className="surface-2 bline border rounded-2xl py-2.5 text-center">
                <div className="font-black c-gold text-[0.95rem]" style={{ fontFamily: "Amiri" }}>{n}</div>
                <div className="ink-3 text-[0.6rem] font-bold mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {all.length > 0 && (
          <div className="flex gap-2.5 mt-4">
            <PlayBig id={all[0].id} queue={queueIds} label={t.playAll} />
          </div>
        )}

        {series.length > 0 && (
          <div className="mt-7">
            <SectionHead title={t.suggested} />
            <div className="grid gap-2.5">
              {series.map((s) => <SeriesCard key={s.id} series={s} />)}
            </div>
          </div>
        )}

        <div className="mt-7">
          <SectionHead title={`${t.tapes} (${ar(all.length)})`} />
          {all.length === 0 ? (
            <div className="flex flex-col items-center py-10 ink-3 gap-2">
              <ListMusic size={26} className="c-gold" />
              <span className="text-[0.8rem] font-bold">لا توجد أشرطة مسجلة بعد</span>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((it) => <AudioRow key={it.id} item={it} queue={queueIds} />)}
            </div>
          )}
          <div ref={sentinel} className="h-8" />
          {shown < all.length && (
            <div className="text-center ink-3 text-[0.7rem] font-bold py-2">{ar(Math.min(shown, all.length))} / {ar(all.length)}</div>
          )}
        </div>
      </div>
    </div>
  );
};
