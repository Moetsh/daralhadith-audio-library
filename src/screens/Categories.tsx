/* شاشتا التصنيفات وقائمة الأشرطة */
import { ArrowDownWideNarrow, Grid2X2, List, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { catById, countOfCat, itemsOfCat, mainCats, childCatsOf, subCatsOf, allSeries } from "../data/library";
import { ar } from "../lib/utils";
import { useNav, useSettings } from "../store/core";
import { AudioRow, BackBtn, CatIcon, EmptyState, GirihBG, SectionHead, SeriesCard } from "../components/ui";
import { GridCard } from "./GridCard";

export const CatsScreen = () => {
  const t = useSettings((s) => s.t);
  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.028} />
      <div className="relative px-4 pt-5 pb-[130px] max-w-lg mx-auto">
        <h1 className="font-brand text-[1.4rem] ink">{t.cats}</h1>
        <p className="ink-3 text-[0.72rem] font-bold mt-1">{ar(mainCats().length)} {t.cats}</p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          {mainCats().map((c, i) => <MainCatTile key={c.id} id={c.id} i={i} />)}
          <SeriesTile i={mainCats().length} />
        </div>
      </div>
    </div>
  );
};

import { useSettings as _us } from "../store/core";

const MainCatTile = ({ id, i }: { id: string; i: number }) => {
  const nav = useNav();
  const t = _us((s) => s.t);
  const c = catById(id)!;
  const subs = childCatsOf(id);
  const n = countOfCat(id);
  return (
    <button
      onClick={() => nav.push({ name: "cat", id })}
      className="surface bline border rounded-3xl p-4 text-start relative overflow-hidden shadow-card active:scale-[0.97] transition"
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <GirihBG opacity={0.05} />
      <span className="w-11 h-11 rounded-2xl bg-green flex items-center justify-center relative shadow-card">
        <span className="absolute inset-0 girih opacity-20" style={{ color: "#e9d9a6" }} />
        <CatIcon icon={c.icon} size={20} className="text-[#e9d9a6] relative" />
      </span>
      <div className="font-extrabold ink text-[0.86rem] mt-3 leading-snug">{c.name}</div>
      <div className="c-gold text-[0.68rem] font-bold mt-1">{ar(n)} {t.tapes}</div>
      {subs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {subs.slice(0, 3).map((s) => (
            <span key={s.id} className="text-[0.58rem] font-bold ink-3 surface-2 bline border rounded-full px-1.5 py-0.5">{s.name}</span>
          ))}
          {subs.length > 3 && <span className="text-[0.58rem] font-bold c-gold">+{ar(subs.length - 3)}</span>}
        </div>
      )}
    </button>
  );
};

const SeriesTile = ({ i }: { i: number }) => {
  const nav = useNav();
  const t = _us((s) => s.t);
  const lang = _us((s) => s.lang);
  const n = allSeries().length;
  return (
    <button
      onClick={() => nav.push({ name: "series" })}
      className="surface bline border rounded-3xl p-4 text-start relative overflow-hidden shadow-card active:scale-[0.97] transition"
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <GirihBG opacity={0.05} />
      <span className="w-11 h-11 rounded-2xl bg-gold flex items-center justify-center relative shadow-card">
        <span className="absolute inset-0 girih opacity-20" style={{ color: "#231a05" }} />
        <CatIcon icon="list" size={20} className="text-[#231a05] relative" />
      </span>
      <div className="font-extrabold ink text-[0.86rem] mt-3 leading-snug">{lang === "ar" ? "سلاسل" : "Series"}</div>
      <div className="c-gold text-[0.68rem] font-bold mt-1">{ar(n)} {t.seriesT}</div>
    </button>
  );
};

/* شاشة قائمة أشرطة تصنيف ── */
type SortKey = "new" | "old" | "played" | "alpha" | "dur";
const PAGE = 12;

export const CatScreen = ({ id }: { id: string }) => {
  const t = useSettings((s) => s.t);
  const nav = useNav();
  const [sort, setSort] = useState<SortKey>("new");
  const [grid, setGrid] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const cat = catById(id)!;
  const subs = childCatsOf(id);

  const list = useMemo(() => {
    let arr = itemsOfCat(id);
    switch (sort) {
      case "new": arr = [...arr].sort((a, b) => a.addedDays - b.addedDays); break;
      case "old": arr = [...arr].sort((a, b) => b.addedDays - a.addedDays); break;
      case "played": arr = [...arr].sort((a, b) => b.listenCount - a.listenCount); break;
      case "alpha": arr = [...arr].sort((a, b) => a.title.localeCompare(b.title, "ar")); break;
      case "dur": arr = [...arr].sort((a, b) => b.duration - a.duration); break;
    }
    return arr;
  }, [id, sort]);

  const seriesHere = useMemo(() => {
    const allSubIds = new Set([id, ...subCatsOf(id).map((s) => s.id)]);
    return allSeries().filter((s) => allSubIds.has(s.categoryId));
  }, [id]);

  useEffect(() => {
    setShown(PAGE);
    const el = sentinel.current;
    if (!el) return;
    const ob = new IntersectionObserver((es) => es[0].isIntersecting && setShown((s) => s + PAGE), { rootMargin: "300px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [id, sort, grid]);

  const visible = list.slice(0, shown);
  const queueIds = list.map((x) => x.id);

  const sortOpt: [SortKey, string][] = [["new", t.sortNew], ["old", t.sortOld], ["played", t.sortPlayed], ["alpha", t.sortAlpha], ["dur", t.sortDur]];

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <BackBtn />
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold ink text-[1.05rem] truncate">{cat.name}</h1>
            <p className="ink-3 text-[0.68rem] font-bold mt-0.5">{ar(list.length)} {t.tapes}</p>
          </div>
          <button onClick={() => setGrid(!grid)} aria-label="view"
            className="w-10 h-10 rounded-full surface bline border flex items-center justify-center ink active:scale-90 transition">
            {grid ? <List size={16} /> : <Grid2X2 size={16} />}
          </button>
          <div className="relative">
            <button onClick={() => setSortOpen(!sortOpen)} aria-label="sort"
              className="w-10 h-10 rounded-full surface bline border flex items-center justify-center ink active:scale-90 transition">
              <ArrowDownWideNarrow size={16} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                <div className="absolute end-0 top-11 z-40 surface border bline rounded-2xl shadow-pop p-1.5 w-40">
                  {sortOpt.map(([k, l]) => (
                    <button key={k} onClick={() => { setSort(k); setSortOpen(false); }}
                      className={`w-full text-start px-3 py-2 rounded-xl text-[0.78rem] font-bold transition ${sort === k ? "soft-gold c-gold" : "ink-2"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {subs.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4 pb-0.5">
            {subs.map((s) => (
              <button key={s.id} onClick={() => nav.push({ name: "cat", id: s.id })}
                className="surface bline border rounded-2xl px-3 py-2.5 text-start active:scale-[0.97] transition flex items-center justify-between">
                <span className="font-bold ink text-[0.8rem] leading-snug">{s.name}</span>
                <span className="shrink-0 text-[0.62rem] font-black c-gold">{ar(itemsOfCat(s.id).length)}</span>
              </button>
            ))}
          </div>
        )}

        {seriesHere.length > 0 && (
          <div className="mt-5">
            <SectionHead title={t.suggested} />
            <div className="flex gap-3 overflow-x-auto no-bar -mx-4 px-4 pb-1">
              {seriesHere.map((s) => <SeriesCard key={s.id} series={s} wide />)}
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title={t.noResults} hint={t.noResultsHint} />
        ) : grid ? (
          <div className="grid grid-cols-2 gap-3 mt-5">
            {visible.map((it) => <GridCard key={it.id} item={it} />)}
          </div>
        ) : (
          <div className="space-y-2 mt-5">
            {visible.map((it) => <AudioRow key={it.id} item={it} queue={queueIds} />)}
          </div>
        )}
        <div ref={sentinel} className="h-8" />
        {shown < list.length && (
          <div className="text-center ink-3 text-[0.7rem] font-bold py-2">{ar(Math.min(shown, list.length))} / {ar(list.length)}</div>
        )}
      </div>
    </div>
  );
};
