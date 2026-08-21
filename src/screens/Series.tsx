/* شاشة السلاسل — جميع السلاسل من الخادم */
import { ListMusic } from "lucide-react";
import { useMemo } from "react";
import { allSeries, itemsOfSeries } from "../data/library";
import { ar } from "../lib/utils";
import { useSettings } from "../store/core";
import { BackBtn, EmptyState, GirihBG, SeriesCard } from "../components/ui";

export const SeriesScreen = () => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const series = useMemo(() => allSeries().filter((s) => itemsOfSeries(s.id).length > 0), []);
  const label = lang === "ar" ? "سلاسل" : "Series";

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <BackBtn />
          <div>
            <h1 className="font-extrabold ink text-[1.1rem]">{label}</h1>
            <p className="ink-3 text-[0.68rem] font-bold mt-0.5">{ar(series.length)} {t.seriesT}</p>
          </div>
        </div>
        {series.length === 0 ? (
          <EmptyState icon={ListMusic} title={t.suggested} hint={t.noResultsHint} />
        ) : (
          <div className="grid gap-2.5 mt-5">
            {series.map((s) => <SeriesCard key={s.id} series={s} />)}
          </div>
        )}
      </div>
    </div>
  );
};
