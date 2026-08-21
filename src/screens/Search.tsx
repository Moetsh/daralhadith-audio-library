/* شاشة البحث الفوري */
import { Clock3, Search, SearchX, X } from "lucide-react";
import { useMemo, useState } from "react";
import { searchAll } from "../data/library";
import { ar } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings } from "../store/core";
import { AudioRow, Avatar, BackBtn, EmptyState, GirihBG, SectionHead, SeriesCard } from "../components/ui";

export const SearchScreen = () => {
  const t = useSettings((s) => s.t);
  const nav = useNav();
  const searches = useApp((s) => s.searches);
  const addSearch = useApp((s) => s.addSearch);
  const clearSearches = useApp((s) => s.clearSearches);
  const [q, setQ] = useState("");

  const res = useMemo(() => searchAll(q), [q]);
  const hasRes = res.items.length > 0 || res.scholars.length > 0 || res.series.length > 0;
  const total = res.items.length + res.scholars.length + res.series.length;

  const commit = (s?: string) => { const v = (s ?? q).trim(); if (v) addSearch(v); };

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[130px] max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <BackBtn />
          <div className="flex-1 h-12 rounded-2xl surface bline border flex items-center gap-2.5 px-4 shadow-card focus-within:!border-[var(--gold)]">
            <Search size={17} className="c-gold shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              placeholder={t.searchPh}
              className="flex-1 bg-transparent outline-none text-[0.88rem] ink placeholder:text-[var(--ink-3)] min-w-0"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="clear" className="w-7 h-7 rounded-full surface-2 flex items-center justify-center ink-3 active:scale-90">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {!q.trim() && (
          <>
            {searches.length > 0 && (
              <div className="mt-6">
                <SectionHead title={t.recentSearches} action={t.clear} onAction={clearSearches} />
                <div className="flex flex-wrap gap-2">
                  {searches.map((s) => (
                    <button key={s} onClick={() => setQ(s)}
                      className="h-9 px-3.5 rounded-full surface bline border text-[0.78rem] font-bold ink-2 flex items-center gap-2 active:scale-95 transition">
                      <Clock3 size={12} className="c-gold" /> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {q.trim() && !hasRes && <EmptyState icon={SearchX} title={t.noResults} hint={t.noResultsHint} />}

        {q.trim() && hasRes && (
          <>
            <p className="ink-3 text-[0.7rem] font-bold mt-5">{ar(total)} {t.results}</p>
            {res.scholars.length > 0 && (
              <div className="mt-4">
                <SectionHead title={t.scholarsT} />
                <div className="flex gap-4 overflow-x-auto no-bar -mx-4 px-4 pb-1">
                  {res.scholars.map((s) => (
                    <button key={s.id} onClick={() => { commit(); nav.push({ name: "scholar", id: s.id }); }}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-[70px] active:scale-95 transition">
                      <Avatar scholar={s} size={56} />
                      <span className="text-[0.62rem] font-bold ink-2 text-center leading-tight line-clamp-2">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {res.series.length > 0 && (
              <div className="mt-6">
                <SectionHead title={t.suggested} />
                <div className="space-y-2.5">
                  {res.series.slice(0, 4).map((s) => <SeriesCard key={s.id} series={s} />)}
                </div>
              </div>
            )}
            {res.items.length > 0 && (
              <div className="mt-6">
                <SectionHead title={t.tapes} />
                <div className="space-y-2">
                  {res.items.slice(0, 40).map((it) => (
                    <AudioRow key={it.id} item={it} queue={res.items.map((x) => x.id)} onOpen={() => { commit(); nav.push({ name: "detail", id: it.id }); }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
