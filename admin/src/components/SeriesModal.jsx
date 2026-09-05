import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { api } from "../api";
import { Input, Select, Textarea, Check, Button, Badge, ErrorBox, Spinner } from "./ui";
import { EditModal } from "./EditModal";
import { CoverPicker } from "./CoverPicker";

export const SERIES_EMPTY = {
  id: "", title: "", title_en: "", scholar_id: "", category_id: "",
  description: "", cover_image_url: "",
  total_episodes: 0, is_complete: false, order_direction: "asc",
};

export const seriesToForm = (s) => ({
  id: s.id || "",
  title: s.title || "",
  title_en: s.title_en || "",
  scholar_id: s.scholar_id || "",
  category_id: s.category_id || "",
  description: s.description || "",
  cover_image_url: s.cover_image_url || "",
  total_episodes: s.total_episodes || 0,
  is_complete: !!s.is_complete,
  order_direction: s.order_direction || "asc",
});

export const seriesToPayload = (f, editing) => ({
  id: f.id || editing?.id || undefined,
  title: f.title,
  title_en: f.title_en || null,
  scholar_id: f.scholar_id || null,
  category_id: f.category_id || null,
  description: f.description || null,
  cover_image_url: f.cover_image_url || null,
  total_episodes: Number(f.total_episodes) || 0,
  is_complete: !!f.is_complete,
  order_direction: f.order_direction,
});

/* تطبيق غلاف سلسلة على حلقاتها من المتصفح مباشرة (حلقة → طلب PUT واحد).
   يتفادى مهلة الخادم في السلاسل الضخمة لأن كل طلب صغير وسريع.
   onProgress تستقبل { updated, total, done } لعرض التقدم. */
export async function applySeriesCover(seriesId, { mode = "empty", cover_image_url = null } = {}, onProgress) {
  if (!cover_image_url) throw new Error("لا يوجد غلاف");
  const eps = await api(`/series/${seriesId}/episode-ids`);
  const targets = mode === "all" ? eps : eps.filter((e) => !e.hasCover);
  let updated = 0;
  for (const ep of targets) {
    await api("/audios/" + ep.id, { method: "PUT", body: { cover_image_url } });
    updated++;
    onProgress?.({ updated, total: targets.length, done: updated >= targets.length });
  }
  return { updated, total: targets.length };
}

/* حلقات السلسلة مع نبذة كل شريط (كما تظهر في التطبيق) — قابلة للتحرير. */
function SeriesEpisodes({ seriesId }) {
  const [eps, setEps] = useState(null);
  const [err, setErr] = useState(null);
  const [editId, setEditId] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEps(null);
    setErr(null);
    setEditId(null);
    api(`/series/${seriesId}/episodes`).then(setEps).catch(setErr);
  }, [seriesId]);

  const saveDesc = async (id) => {
    setBusy(true);
    try {
      await api("/audios/" + id, { method: "PUT", body: { description: text || null } });
      setEps((list) => list.map((e) => (e.id === id ? { ...e, description: text || null } : e)));
      setEditId(null);
    } catch (e2) {
      setErr(e2);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line p-4 space-y-3 bg-bg2/40">
      <h4 className="text-sm font-black text-ink">
        حلقات السلسلة ونبذتها {eps && <span className="text-ink3 font-bold">({eps.length})</span>}
      </h4>
      <ErrorBox error={err} />
      {eps === null ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : eps.length === 0 ? (
        <p className="text-xs text-ink3 font-bold">لا توجد حلقات بعد.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto thin-bar pl-1">
          {eps.map((ep) => (
            <div key={ep.id} className="rounded-xl bg-card border border-line p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">
                    {ep.episode_number ? <span className="text-ink3">({ep.episode_number}) </span> : null}
                    {ep.title}
                  </div>
                  {editId === ep.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea rows={2} placeholder="نبذة الشريط…" value={text} onChange={(e) => setText(e.target.value)} />
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled={busy} onClick={() => saveDesc(ep.id)}>
                          {busy ? "جارٍ الحفظ…" : "حفظ النبذة"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditId(null)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${ep.description ? "text-ink2" : "text-ink3"}`}>
                      {ep.description || "بلا نبذة"}
                    </p>
                  )}
                </div>
                {editId !== ep.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="تعديل النبذة"
                    onClick={() => { setEditId(ep.id); setText(ep.description || ""); setErr(null); }}
                  >
                    <Pencil size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* نافذة إنشاء/تعديل سلسلة — مشتركة بين صفحة السلاسل ونافذة الشريط.
   تتضمن رفع غلاف السلسلة وتطبيقه على كل حلقاتها.
   الحفظ موحّد: حفظ السلسلة + تطبيق الغلاف الجديد تلقائياً على الحلقات بلا غلاف. */
export function SeriesModal({ editing, scholars, categories, onClose, onSaved }) {
  const handleSave = async (payload) => {
    const coverChanged = (payload.cover_image_url || null) !== (editing?.cover_image_url || null);
    if (editing?.id) await api("/series/" + editing.id, { method: "PUT", body: payload });
    else await api("/series", { method: "POST", body: payload });
    const sid = editing?.id || payload.id;
    if (coverChanged && payload.cover_image_url && sid) {
      await applySeriesCover(sid, { mode: "empty", cover_image_url: payload.cover_image_url });
    }
    onClose();
    await onSaved?.();
  };

  const [apply, setApply] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);

  useEffect(() => {
    setApply(false);
    setOverwrite(false);
    setApplyMsg(null);
    setApplyBusy(false);
  }, [editing?.id]);

  return (
    <EditModal
      editing={editing}
      initial={SERIES_EMPTY}
      toForm={seriesToForm}
      toPayload={seriesToPayload}
      title="تعديل سلسلة"
      newTitle="سلسلة جديدة"
      width="max-w-2xl"
      onClose={onClose}
      onSave={handleSave}
    >
      {({ form, set }) => {
        const applyCover = async () => {
          setApplyBusy(true);
          setApplyMsg(null);
          try {
            const payload = seriesToPayload(form, editing);
            if (editing?.id) await api("/series/" + editing.id, { method: "PUT", body: payload });
            const { updated, total } = await applySeriesCover(
              editing.id,
              { mode: overwrite ? "all" : "empty" },
              ({ updated: u, total: t, done }) => {
                if (!done) setApplyMsg({ ok: true, text: `جارٍ التطبيق… ${u} من ${t} حلقة` });
              }
            );
            setApplyMsg({ ok: true, text: `تم تطبيق الغلاف على ${updated} من ${total} حلقة` });
            await onSaved?.();
          } catch (e) {
            setApplyMsg({ ok: false, text: e.message || "حدث خطأ" });
          } finally {
            setApplyBusy(false);
          }
        };

        return (
          <>
            <CoverPicker value={form.cover_image_url || ""} onChange={(v) => set("cover_image_url", v)} />
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={form.id} disabled={!!editing?.id} onChange={(e) => set("id", e.target.value)} placeholder="مثال: fiqh-course" />
              <Input label="العنوان" required value={form.title} onChange={(e) => set("title", e.target.value)} />
              <Input label="العنوان (إنجليزي)" dir="ltr" value={form.title_en} onChange={(e) => set("title_en", e.target.value)} />
              <Select label="الشيخ" value={form.scholar_id} onChange={(e) => set("scholar_id", e.target.value)}>
                <option value="">— بدون —</option>
                {scholars.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="التصنيف" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">— بدون —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "↳ " + c.name : c.name}</option>)}
              </Select>
              <Input label="رابط الغلاف" dir="ltr" value={form.cover_image_url || ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://…/cover.jpg" />
              <Input label="عدد الحلقات" type="number" value={form.total_episodes} onChange={(e) => set("total_episodes", e.target.value)} />
              <Select label="اتجاه الترتيب" value={form.order_direction} onChange={(e) => set("order_direction", e.target.value)}>
                <option value="asc">من الأول للأخير</option>
                <option value="desc">من الأخير للأول</option>
              </Select>
              <Textarea label="الوصف" className="md:col-span-2" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <Check label="سلسلة مكتملة" checked={!!form.is_complete} onChange={(e) => set("is_complete", e.target.checked)} />
            {editing?.id && <SeriesEpisodes seriesId={editing.id} />}
            {editing?.id && (
              <div className="rounded-2xl border border-line p-4 space-y-3 bg-bg2/40">
                <Check
                  label="تطبيق الغلاف على كل حلقات السلسلة"
                  checked={apply}
                  onChange={(e) => { setApply(e.target.checked); setApplyMsg(null); }}
                />
                {apply && (
                  <>
                    <Check
                      label="استبدال أغلفة الحلقات الموجودة أيضًا"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    <p className="text-[11px] text-ink3">
                      {overwrite
                        ? "سيُستبدل غلاف كل الحلقات بغلاف السلسلة."
                        : "سيُطبَّق الغلاف فقط على الحلقات التي بلا غلاف."}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="gold"
                        disabled={applyBusy || !form.cover_image_url}
                        onClick={applyCover}
                      >
                        {applyBusy ? "جارٍ التطبيق…" : "حفظ الغلاف وتطبيقه الآن"}
                      </Button>
                    </div>
                    {applyMsg && (
                      <div>
                        <Badge tone={applyMsg.ok ? "green" : "danger"}>{applyMsg.text}</Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        );
      }}
    </EditModal>
  );
}
