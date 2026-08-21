/* شاشة إضافة سلسلة من أرشيف الإنترنت */
import { useMemo, useState } from "react";
import { Check, Link2, Loader2, Save } from "lucide-react";
import { catById, mainCats, subCatsOf } from "../data/library";
import { fetchArchiveSeries, extractIdentifier, fileDownloadUrl, trackTitle } from "../lib/archive";
import type { ArchFile } from "../lib/archive";
import { ar, fmtDur } from "../lib/utils";
import { useApp } from "../store/appStore";
import { useNav, useSettings } from "../store/core";
import { useUserContent } from "../store/userContent";
import { BackBtn, Chip, Cover, GirihBG } from "../components/ui";

const inputCls = "w-full h-11 rounded-2xl surface bline border px-4 text-[0.82rem] ink outline-none focus:!border-[var(--gold)]";

export const AddSeriesScreen = () => {
  const t = useSettings((s) => s.t);
  const lang = useSettings((s) => s.lang);
  const nav = useNav();
  const showToast = useApp((s) => s.showToast);
  const addSeries = useUserContent((s) => s.addSeries);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [scholar, setScholar] = useState("");
  const [cat, setCat] = useState("aqeedah");
  const [sub, setSub] = useState<string | null>(null);
  const [count, setCount] = useState("");
  const [files, setFiles] = useState<ArchFile[] | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const subs = useMemo(() => subCatsOf(cat), [cat]);
  const catId = sub ?? cat;
  const selected = files?.filter((_, i) => sel.has(i)) ?? [];
  const c = catById(catId);

  const doFetch = async () => {
    const id = extractIdentifier(url);
    if (!id) return showToast(t.invalidUrl);
    setLoading(true);
    try {
      const res = await fetchArchiveSeries(id);
      if (!res.files.length) return showToast(t.fetchErr);
      setFiles(res.files);
      setSel(new Set(res.files.map((_, i) => i)));
      setCount(String(res.files.length));
      if (!name.trim() && res.title) setName(res.title);
      if (!scholar.trim() && res.creator && String(res.creator) !== res.title && String(res.creator).length <= 60)
        setScholar(String(res.creator).replace(/^الشيخ\s+/i, ""));
    } catch {
      showToast(t.fetchErr);
    } finally {
      setLoading(false);
    }
  };

  const toggleIdx = (i: number) => {
    const s = new Set(sel);
    if (s.has(i)) s.delete(i); else s.add(i);
    setSel(s);
    setCount(String(s.size));
  };

  const onCount = (v: string) => {
    if (!files) return setCount(v);
    const n = parseInt(v, 10);
    if (v.trim() === "" || isNaN(n) || n < 0) return setCount("");
    const m = Math.min(n, files.length);
    const s = new Set<number>();
    for (let i = 0; i < m; i++) s.add(i);
    setSel(s);
    setCount(String(m));
  };

  const save = () => {
    if (!files) return;
    const id = extractIdentifier(url);
    if (!id) return showToast(t.invalidUrl);
    if (!name.trim() || !scholar.trim() || !selected.length) return showToast(t.fetchErr);
    setSaving(true);
    const uid = addSeries(
      { title: name.trim(), scholarName: scholar.trim(), categoryId: catId, identifier: id, url: url.trim(), desc: `${t.addFromArch} — ${id}` },
      selected.map((f) => ({
        title: trackTitle(f, files.indexOf(f)),
        categoryId: catId,
        duration: f.length,
        description: f.name,
        archiveUrl: fileDownloadUrl(id, f.name),
        streamUrl: fileDownloadUrl(id, f.name),
        streamAlt: "",
        addedDays: 0,
        listenCount: 0,
      }))
    );
    setSaving(false);
    showToast(t.savedSeries);
    nav.push({ name: "user-series", id: uid });
  };

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[140px] max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <BackBtn />
          <h1 className="font-brand text-[1.2rem] ink">{t.addSeries}</h1>
        </div>

        <label className="block mt-5">
          <span className="block text-[0.72rem] font-bold ink-2 mb-1.5">{t.archUrl}</span>
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder={t.archUrlPh} className={inputCls} />
            <button onClick={doFetch} disabled={loading}
              className="shrink-0 h-11 px-4 rounded-2xl bg-gold text-[#231a05] text-[0.78rem] font-extrabold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-60">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
              {t.fetchTracks}
            </button>
          </div>
        </label>

        {files && (
          <>
            <label className="block mt-4">
              <span className="block text-[0.72rem] font-bold ink-2 mb-1.5">{t.seriesName}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="block mt-3">
              <span className="block text-[0.72rem] font-bold ink-2 mb-1.5">{t.scholarName}</span>
              <input value={scholar} onChange={(e) => setScholar(e.target.value)} className={inputCls} />
            </label>

            <div className="mt-4">
              <span className="block text-[0.72rem] font-bold ink-2 mb-1.5">{t.section}</span>
              <div className="flex flex-wrap gap-1.5">
                {mainCats().map((m) => (
                  <Chip key={m.id} label={m.name} active={cat === m.id} onClick={() => { setCat(m.id); setSub(null); }} />
                ))}
              </div>
              {subs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {subs.map((s) => (
                    <Chip key={s.id} label={s.name} active={sub === s.id} onClick={() => setSub(sub === s.id ? null : s.id)} />
                  ))}
                </div>
              )}
            </div>

            <label className="block mt-4">
              <span className="block text-[0.72rem] font-bold ink-2 mb-1.5">{t.trackCount}</span>
              <input inputMode="numeric" value={count} onChange={(e) => onCount(e.target.value)} className={inputCls} />
            </label>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-[0.8rem] font-extrabold ink">{t.selectTracks}</span>
              <span className="c-gold text-[0.72rem] font-bold">{ar(selected.length)} {t.epsFound}</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {files.map((f, i) => {
                const on = sel.has(i);
                return (
                  <button key={f.name + i} onClick={() => toggleIdx(i)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-start transition ${on ? "surface soft-gold border-transparent" : "surface bline"}`}>
                    <Cover catId={catId} icon={c?.icon} size={44} radius={12} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[0.8rem] ink truncate">{trackTitle(f, i)}</div>
                      <div className="ink-3 text-[0.66rem] font-bold mt-0.5">{fmtDur(f.length, lang)}</div>
                    </div>
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${on ? "bg-gold text-[#231a05]" : "surface-2 bline border ink-3"}`}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>

            <button onClick={save} disabled={saving || !selected.length}
              className="mt-5 w-full h-12 rounded-2xl bg-gold text-[#231a05] font-extrabold text-[0.9rem] flex items-center justify-center gap-2 shadow-pop active:scale-[0.98] transition disabled:opacity-60">
              <Save size={17} /> {t.saveSeries}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
