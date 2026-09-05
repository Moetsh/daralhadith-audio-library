import { useState } from "react";
import { api } from "../api";
import { useRefs, useForm } from "../hooks";
import { PageTitle, Button, Card, Input, Select, ErrorBox, cx, Spinner, Badge } from "../components/ui";
import { Search, DownloadCloud, CheckSquare, Square, Layers, Link } from "lucide-react";

export default function ImportPage() {
  const [tab, setTab] = useState("archive");
  const [url, setUrl] = useState("");
  const [insp, setInsp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { scholars, categories, series, error: refsError } = useRefs();
  const { form, set: setF, reset: resetF } = useForm({ scholar_id: "", category_id: "", series_id: "" });
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(null);

  const [wantSeries, setWantSeries] = useState(false);
  const [serName, setSerName] = useState("");
  const [serCount, setSerCount] = useState("");
  const [startEp, setStartEp] = useState("");

  const [teraCookies, setTeraCookies] = useState("");
  const [teraInsp, setTeraInsp] = useState(null);

  const inspect = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setDone(null);
    setInsp(null); setTeraInsp(null);
    try {
      const r = tab === "archive"
        ? await api("/archive/inspect", { method: "POST", body: { url } })
        : await api("/terabox/inspect", { method: "POST", body: { url, cookies: teraCookies } });
      if (!r.ok) { setError(new Error(r.error || "Failed")); return; }
      if (tab === "archive") setInsp(r);
      else setTeraInsp(r);
      setSelected(new Set(r.files.map((f) => f.name)));
      setSerName(r.title || "");
    } catch (e2) { setError(e2); }
    finally { setBusy(false); }
  };

  const toggle = (name) => setSelected((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleAll = () => {
    const files = tab === "archive" ? insp?.files : teraInsp?.files;
    if (!files) return;
    setSelected((s) => (s.size === files.length ? new Set() : new Set(files.map((f) => f.name))));
  };

  const runImport = async () => {
    setImporting(true); setError(null);
    try {
      let body;
      if (tab === "archive") {
        body = { url, scholar_id: form.scholar_id, category_id: form.category_id, selected: [...selected] };
        if (wantSeries && serName.trim()) {
          body.new_series = { title: serName.trim(), total_episodes: parseInt(serCount, 10) || selected.size };
        } else if (form.series_id) {
          body.series_id = form.series_id;
          const se = parseInt(startEp, 10);
          if (!Number.isNaN(se) && se > 0) body.start_episode = se;
        }
      } else {
        body = {
          surl: teraInsp.surl, shareid: teraInsp.shareid, uk: teraInsp.uk,
          jsToken: teraInsp.jsToken, cookies: teraCookies,
          scholar_id: form.scholar_id, category_id: form.category_id,
          selected: [...selected],
        };
        if (wantSeries && serName.trim()) {
          body.new_series = { title: serName.trim(), total_episodes: parseInt(serCount, 10) || selected.size };
        } else if (form.series_id) {
          body.series_id = form.series_id;
          const se = parseInt(startEp, 10);
          if (!Number.isNaN(se) && se > 0) body.start_episode = se;
        }
      }
      const endpoint = tab === "archive" ? "/audios/bulk-import" : "/terabox/bulk-import";
      const r = await api(endpoint, { method: "POST", body });
      setDone(r);
      if (tab === "archive") setInsp(null);
      else setTeraInsp(null);
      setUrl("");
      resetForm();
    } catch (e2) { setError(e2); }
    finally { setImporting(false); }
  };

  const resetForm = () => {
    resetF({ scholar_id: "", category_id: "", series_id: "" });
    setSerName(""); setSerCount(""); setStartEp(""); setWantSeries(false);
  };

  const currentInsp = tab === "archive" ? insp : teraInsp;
  const files = currentInsp?.files || [];
  const showError = error || refsError;

  return (
    <div>
      <PageTitle title="استيراد من الإنترنت" subtitle="ألصق رابط من archive.org أو TeraBox لاستيراد أشرطته" />

      <div className="flex gap-2 mb-4">
        <button onClick={() => { setTab("archive"); setInsp(null); setTeraInsp(null); setError(null); setDone(null); }}
          className={cx("px-4 py-2 rounded-xl text-sm font-bold transition-colors", tab === "archive" ? "bg-green text-white" : "bg-card border border-line text-ink2 hover:bg-bg2")}>
          archive.org
        </button>
        <button onClick={() => { setTab("terabox"); setInsp(null); setTeraInsp(null); setError(null); setDone(null); }}
          className={cx("px-4 py-2 rounded-xl text-sm font-bold transition-colors", tab === "terabox" ? "bg-green text-white" : "bg-card border border-line text-ink2 hover:bg-bg2")}>
          TeraBox
        </button>
      </div>

      <Card className="p-5 mb-4">
        <form onSubmit={inspect} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input dir="ltr" className="text-left" placeholder={tab === "archive" ? "https://archive.org/details/..." : "https://1024terabox.com/s/..."} value={url} onChange={(e) => setUrl(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy || !url.trim()}>
              {busy ? <><Spinner className="w-4 h-4 border-t-white" /> ...</> : <><Search size={16} /> فحص الرابط</>}
            </Button>
          </div>
          {tab === "terabox" && (
            <Input label="Kookies (from DevTools or CDP)" dir="ltr" className="text-left font-mono text-xs" placeholder="ndus=...; browserid=...; csrfToken=..." value={teraCookies} onChange={(e) => setTeraCookies(e.target.value)} />
          )}
        </form>
        {showError && <div className="mt-3"><ErrorBox error={showError} /></div>}
      </Card>

      {currentInsp && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-soft text-green flex items-center justify-center shrink-0">
                {tab === "archive" ? <DownloadCloud size={20} /> : <Link size={20} />}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-green">{currentInsp.title || currentInsp.identifier || currentInsp.surl}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge tone="green">{files.length} ملفاً</Badge>
                  {tab === "terabox" && currentInsp.with_dlinks !== undefined && <Badge tone="gold">{currentInsp.with_dlinks} برابط مباشر</Badge>}
                  {tab === "archive" && <Badge tone="gold" className="font-mono">{currentInsp.identifier}</Badge>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Select label="Scholar" value={form.scholar_id} onChange={(e) => setF("scholar_id", e.target.value)}>
                <option value="">-- select --</option>
                {scholars.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="Category" value={form.category_id} onChange={(e) => setF("category_id", e.target.value)}>
                <option value="">-- select --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "↳ " : ""}{c.name}</option>)}
              </Select>
              <Select label="Series" value={wantSeries ? "" : form.series_id} disabled={wantSeries} onChange={(e) => setF("series_id", e.target.value)}>
                <option value="">No series</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.parent_title ? "↳ " : ""}{s.title}</option>)}
              </Select>
            </div>

            {!wantSeries && form.series_id && (
              <div className="mt-3">
                <Input label="Start episode from" type="number" min={1} value={startEp} onChange={(e) => setStartEp(e.target.value)} placeholder="Auto-continue from last episode" />
              </div>
            )}

            <div className={cx("rounded-2xl border transition-colors mt-3", wantSeries ? "border-green/40 bg-green-soft/40" : "border-line")}>
              <button type="button" onClick={() => setWantSeries((w) => !w)} className="w-full flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-green"><Layers size={16} />{wantSeries ? "Cancel new series" : "Create new series"}</span>
                <Badge tone={wantSeries ? "green" : "outline"}>Name + episodes</Badge>
              </button>
              {wantSeries && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input label="Series name" value={serName} onChange={(e) => setSerName(e.target.value)} />
                    <Input label="Total episodes" type="number" min={1} value={serCount} onChange={(e) => setSerCount(e.target.value)} placeholder={String(selected.size)} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 mb-3">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-bold text-green">
                {selected.size === files.length ? <CheckSquare size={16} /> : <Square size={16} />}
                Select all
              </button>
              <span className="text-sm text-ink3 font-bold">{selected.size} / {files.length}</span>
            </div>

            <div className="max-h-[420px] overflow-y-auto thin-bar rounded-xl border border-line divide-y divide-line">
              {files.map((f, i) => (
                <label key={f.name} className={cx("flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-bg2/40", selected.has(f.name) && "bg-green-soft/50")}>
                  <input type="checkbox" className="accent-[#f58024] w-4 h-4 shrink-0" checked={selected.has(f.name)} onChange={() => toggle(f.name)} />
                  <span className="w-7 h-7 rounded-lg bg-card2 text-ink3 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{f.name}</span>
                    {f.episode_number && <span className="block text-[11px] text-ink3">Ep {f.episode_number}</span>}
                  </span>
                  <span className="text-xs text-ink3 tabular-nums shrink-0">{f.size ? `${(f.size / 1048576).toFixed(1)} MB` : ""}</span>
                  {tab === "terabox" && <span className={cx("text-xs font-bold shrink-0", f.has_dlink ? "text-green" : "text-red-500")}>{f.has_dlink ? "dlink" : "no dlink"}</span>}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-5">
              <Button variant="gold" size="lg" disabled={importing || !form.scholar_id || !form.category_id || selected.size === 0} onClick={runImport}>
                {importing ? <><Spinner className="w-4 h-4 border-t-white" /> ...</> : <><DownloadCloud size={18} /> Import {selected.size} tracks</>}
              </Button>
              {!form.scholar_id && <span className="text-xs text-ink3 font-bold">Select scholar and category first</span>}
            </div>
          </Card>
        </div>
      )}

      {done && (
        <Card className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green text-white flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
          <h2 className="font-bold text-green text-lg">Import complete</h2>
          <p className="text-sm text-ink2 mt-1">{done.imported} tracks imported{done.skipped ? ` (${done.skipped} skipped)` : ""}</p>
          <Button className="mt-4" variant="outline" onClick={() => setDone(null)}>Import another</Button>
        </Card>
      )}
    </div>
  );
}
