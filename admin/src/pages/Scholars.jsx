import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Textarea, Badge, Table, Modal, Loading, Empty, ErrorBox } from "../components/ui";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

export default function Scholars() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/scholars"));
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
    if (editing?.id) await api("/scholars/" + editing.id, { method: "PUT", body: payload });
    else await api("/scholars", { method: "POST", body: payload });
    setEditing(null);
    load();
  };

  const remove = async () => {
    await api("/scholars/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    load();
  };

  return (
    <div>
      <PageTitle
        title="العلماء"
        subtitle="المشايخ والقرّاء الذين تُنشر أشرطتهم"
        actions={<Button onClick={() => setEditing({ name: "", status: "active", is_featured: false })}><Plus size={16} /> شيخ جديد</Button>}
      />
      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
          <Table head={["الشيخ", "التخصص", "البلد", "الأشرطة", "الحالة", ""]}>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-bg2/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-bold">
                    {s.name}
                    {!!s.is_featured && <Star size={14} className="text-gold fill-gold" />}
                  </div>
                  {s.name_en && <div className="text-xs text-ink3" dir="ltr">{s.name_en}</div>}
                </td>
                <td className="px-4 py-3 text-ink2">{s.specialization || "—"}</td>
                <td className="px-4 py-3 text-ink2">{s.country || "—"}</td>
                <td className="px-4 py-3 text-ink2 tabular-nums">{Number(s.audio_count).toLocaleString("ar-EG")}</td>
                <td className="px-4 py-3">{s.status === "active" ? <Badge tone="green">نشط</Badge> : <Badge tone="gray">موقوف</Badge>}</td>
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

      <ScholarModal editing={editing} onClose={() => setEditing(null)} onSave={save} />
      <Modal open={!!confirmDel} title="تأكيد الحذف" onClose={() => setConfirmDel(null)}
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          <Button variant="danger" onClick={remove}>حذف</Button>
        </>}>
        <p className="text-sm text-ink2">حذف الشيخ «{confirmDel?.name}»؟ لا يمكن الحذف إذا كان لديه أشرطة.</p>
      </Modal>
    </div>
  );
}

function ScholarModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", name_en: "", bio: "", specialization: "", country: "", status: "active", is_featured: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "", name_en: editing.name_en || "", bio: editing.bio || "",
        specialization: editing.specialization || "", country: editing.country || "",
        status: editing.status || "active", is_featured: !!editing.is_featured,
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
        name: form.name,
        name_en: form.name_en || null,
        bio: form.bio || null,
        specialization: form.specialization || null,
        country: form.country || null,
        status: form.status,
        is_featured: !!form.is_featured,
      });
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal open title={editing?.id ? "تعديل شيخ" : "شيخ جديد"} onClose={onClose} width="max-w-2xl" footer={<>
      <Button variant="outline" onClick={onClose}>إلغاء</Button>
      <Button onClick={submit} disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
    </>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={editing?.id || ""} disabled={!!editing?.id} placeholder="مثال: albani" />
          <Input label="الاسم (عربي)" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="الاسم (إنجليزي)" dir="ltr" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} />
          <Input label="التخصص" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
          <Input label="البلد" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <Textarea label="نبذة" className="md:col-span-2" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
            <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
            شيخ مميز
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
            <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={form.status === "active"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "active" : "inactive" }))} />
            نشط
          </label>
        </div>
      </form>
    </Modal>
  );
}
