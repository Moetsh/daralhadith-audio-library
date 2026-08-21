import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Select, Textarea, Badge, Table, Modal, Loading, Empty, ErrorBox } from "../components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Series() {
  const [rows, setRows] = useState([]);
  const [scholars, setScholars] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, sc, ca] = await Promise.all([api("/series"), api("/scholars"), api("/categories")]);
      setRows(sr);
      setScholars(sc);
      setCategories(ca);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload) => {
    if (editing?.id) await api("/series/" + editing.id, { method: "PUT", body: payload });
    else await api("/series", { method: "POST", body: payload });
    setEditing(null);
    load();
  };

  const remove = async () => {
    await api("/series/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    load();
  };

  const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "—";
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageTitle
        title="السلاسل"
        subtitle="دروس وحلقات متسلسلة"
        actions={<Button onClick={() => setEditing({ title: "", total_episodes: 0, is_complete: false, order_direction: "asc" })}><Plus size={16} /> سلسلة جديدة</Button>}
      />
      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
          <Table head={["السلسلة", "الشيخ", "التصنيف", "الحلقات", "ناقص", "الحالة", ""]}>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-bg2/40">
                <td className="px-4 py-3">
                  <div className="font-bold">{s.title}</div>
                  {s.title_en && <div className="text-xs text-ink3" dir="ltr">{s.title_en}</div>}
                </td>
                <td className="px-4 py-3 text-ink2">{scholarName(s.scholar_id)}</td>
                <td className="px-4 py-3 text-ink2">{catName(s.category_id)}</td>
                <td className="px-4 py-3 text-ink2 tabular-nums">{Number(s.episodes).toLocaleString("ar-EG")}{s.total_episodes ? ` / ${Number(s.total_episodes).toLocaleString("ar-EG")}` : ""}</td>
                <td className="px-4 py-3">
                  {s.missing_count > 0 ? (
                    <span className="text-danger text-xs font-bold" title={s.missing_episodes.join("، ")}>
                      {s.missing_count.toLocaleString("ar-EG")} ({s.missing_episodes.slice(0, 5).join("، ")}{s.missing_episodes.length > 5 ? "…" : ""})
                    </span>
                  ) : (
                    <span className="text-green text-xs font-bold">لا شيء</span>
                  )}
                </td>
                <td className="px-4 py-3">{s.is_complete ? <Badge tone="gold">مكتملة</Badge> : <Badge tone="green">مستمرة</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmDel(s)}><Trash2 size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <SeriesModal editing={editing} scholars={scholars} categories={categories} onClose={() => setEditing(null)} onSave={save} />
      <Modal open={!!confirmDel} title="تأكيد الحذف" onClose={() => setConfirmDel(null)}
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          <Button variant="danger" onClick={remove}>حذف</Button>
        </>}>
        <p className="text-sm text-ink2">حذف سلسلة «{confirmDel?.title}»؟ لا يمكن الحذف إذا كانت تحتوي على حلقات.</p>
      </Modal>
    </div>
  );
}

function SeriesModal({ editing, scholars, categories, onClose, onSave }) {
  const [form, setForm] = useState({ title: "", title_en: "", scholar_id: "", category_id: "", description: "", total_episodes: 0, is_complete: false, order_direction: "asc" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title || "", title_en: editing.title_en || "", scholar_id: editing.scholar_id || "",
        category_id: editing.category_id || "", description: editing.description || "",
        total_episodes: editing.total_episodes || 0, is_complete: !!editing.is_complete,
        order_direction: editing.order_direction || "asc",
      });
      setErr(null);
    }
  }, [editing]);

  if (!editing) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onSave({
        id: editing?.id || undefined,
        title: form.title,
        title_en: form.title_en || null,
        scholar_id: form.scholar_id || null,
        category_id: form.category_id || null,
        description: form.description || null,
        total_episodes: Number(form.total_episodes) || 0,
        is_complete: !!form.is_complete,
        order_direction: form.order_direction,
      });
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal open title={editing?.id ? "تعديل سلسلة" : "سلسلة جديدة"} onClose={onClose} width="max-w-2xl" footer={<>
      <Button variant="outline" onClick={onClose}>إلغاء</Button>
      <Button onClick={submit} disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
    </>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={editing?.id || ""} disabled={!!editing?.id} placeholder="مثال: fiqh-course" />
          <Input label="العنوان" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="العنوان (إنجليزي)" dir="ltr" value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
          <Select label="الشيخ" value={form.scholar_id} onChange={(e) => setForm((f) => ({ ...f, scholar_id: e.target.value }))}>
            <option value="">— بدون —</option>
            {scholars.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="التصنيف" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
            <option value="">— بدون —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "↳ " + c.name : c.name}</option>)}
          </Select>
          <Input label="عدد الحلقات" type="number" value={form.total_episodes} onChange={(e) => setForm((f) => ({ ...f, total_episodes: e.target.value }))} />
          <Select label="اتجاه الترتيب" value={form.order_direction} onChange={(e) => setForm((f) => ({ ...f, order_direction: e.target.value }))}>
            <option value="asc">من الأول للأخير</option>
            <option value="desc">من الأخير للأول</option>
          </Select>
          <Textarea label="الوصف" className="md:col-span-2" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
          <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.is_complete} onChange={(e) => setForm((f) => ({ ...f, is_complete: e.target.checked }))} />
          سلسلة مكتملة
        </label>
      </form>
    </Modal>
  );
}
