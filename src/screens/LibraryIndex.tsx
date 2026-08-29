/* شاشة فهرس المكتبة — كشف شامل بالسلاسل والشيوخ والأعداد */
import { ListMusic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { allSeries, itemsOfSeries, scholarById } from "../data/library";
import { ar } from "../lib/utils";
import { useSettings } from "../store/core";
import { BackBtn, EmptyState, GirihBG } from "../components/ui";

export const LibraryIndexScreen = () => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const [search, setSearch] = useState("");
  const [filterScholar, setFilterScholar] = useState<string | null>(null);

  const series = useMemo(() => {
    let s = allSeries().filter((sr) => itemsOfSeries(sr.id).length > 0);
    if (search) {
      const q = search.trim().toLowerCase();
      s = s.filter((sr) =>
        sr.title.toLowerCase().includes(q) ||
        scholarById(sr.scholarId).name.toLowerCase().includes(q)
      );
    }
    if (filterScholar) {
      s = s.filter((sr) => sr.scholarId === filterScholar);
    }
    return s;
  }, [search, filterScholar]);

  const scholarsWithSeries = useMemo(() => {
    const schMap = new Map<string, { name: string; count: number; totalEps: number }>();
    allSeries().filter((sr) => itemsOfSeries(sr.id).length > 0).forEach((sr) => {
      const sid = sr.scholarId;
      const existing = schMap.get(sid) || { name: scholarById(sid).name, count: 0, totalEps: 0 };
      existing.count += 1;
      existing.totalEps += sr.totalEpisodes || itemsOfSeries(sr.id).length;
      schMap.set(sid, existing);
    });
    return Array.from(schMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.totalEps - a.totalEps);
  }, []);

  const totalSeries = allSeries().filter((sr) => itemsOfSeries(sr.id).length > 0).length;
  const totalEps = allSeries().reduce((sum, sr) => sum + (sr.totalEpisodes || itemsOfSeries(sr.id).length), 0);

  const label = lang === "ar" ? "فهرس المكتبة" : "Library Index";

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackBtn />
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold ink text-[1.1rem]">{label}</h1>
            <p className="ink-3 text-[0.68rem] font-bold mt-0.5">
              {ar(totalSeries)} {t.seriesT} • {ar(totalEps)} {t.tapes}
            </p>
          </div>
        </div>

        {/* بحث وفلترة */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[0.9rem] ink-3" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "ابحث في السلاسل أو الشيوخ..." : "Search series or scholars..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl surface bline border ink text-[0.85rem] focus:outline-none focus:border-gold"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          {scholarsWithSeries.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-bar -mx-4 px-4 pb-2">
              <button
                onClick={() => setFilterScholar(null)}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[0.78rem] font-bold border transition ${filterScholar === null ? "bg-green text-[#f4ecd7] border-transparent shadow-card" : "surface bline ink-2 hover:shadow-card"}`}
              >
                {lang === "ar" ? "الكل" : "All"}
              </button>
              {scholarsWithSeries.slice(0, 12).map((sch) => (
                <button
                  key={sch.id}
                  onClick={() => setFilterScholar(sch.id)}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-[0.78rem] font-bold border transition ${filterScholar === sch.id ? "bg-green text-[#f4ecd7] border-transparent shadow-card" : "surface bline ink-2 hover:shadow-card"}`}
                >
                  {sch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {series.length === 0 ? (
          <EmptyState icon={ListMusic} title={t.noResults} hint={t.noResultsHint} />
        ) : (
          <div className="space-y-3">
            {series.map((sr) => {
              const sch = scholarById(sr.scholarId);
              const epsCount = itemsOfSeries(sr.id).length;
              const totalEps = sr.totalEpisodes || epsCount;
              return (
                <button
                  key={sr.id}
                  className="surface bline border rounded-2xl p-3 text-start relative shadow-card active:scale-[0.98] transition"
                  onClick={() => {}}
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 shrink-0 rounded-xl relative overflow-hidden bg-gradient-to-br from-gold/20 to-gold/5">
                      <ListMusic size={24} className="absolute inset-0 flex items-center justify-center text-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[0.6rem] font-black c-gold tracking-wider uppercase">{t.seriesT}</span>
                      <div className="font-extrabold text-[0.9rem] ink leading-snug line-clamp-2 mt-0.5">{sr.title}</div>
                      <div className="ink-3 text-[0.7rem] mt-1.5 truncate flex items-center gap-1.5">
                        <span className="truncate">{sch.name}</span>
                        <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0" />
                        <span className="shrink-0">{ar(epsCount)} / {ar(totalEps)} {t.eps}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};