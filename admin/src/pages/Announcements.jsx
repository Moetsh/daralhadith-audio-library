import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Textarea, Select, Badge, Modal, Loading, Empty, ErrorBox } from "../components/ui";
import { Plus, Trash2, Megaphone } from "lucide-react";

const EMPTY = { title: "", content: "", type: "banner", target_audience: "all", is_active: true, starts_at: "", expires_at: "" };

export default function Announcements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/admin/announcements"));
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
    await api("/admin/announcements", { method: "POST", body: payload });
    setEditing(null);
    load();
  };

  const remove = async () => {
    await api("/admin/announcements/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    load();
  };

  return (
    <div>
      <PageTitle
        title="التنبيهات"
        subtitle="رسائل يراها مستخدمو التطبيق"
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> تنبيه جديد</Button>}
      />
      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty text="لا توجد تنبيهات" /> : (
          <div className="divide-y divide-line">
            {rows.map((a) => (
              <div key={a.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-soft text-gold2 flex items-center justify-center shrink-0">
                  <Megaphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{a.title}</span>
                    <Badge tone={a.type === "banner" ? "gold" : "green"}>{a.type === "banner" ? "شريط" : "إشعار"}</Badge>
                    {a.is_active ? <Badge tone="green">مفعّل</Badge> : <Badge tone="gray">معطل</Badge>}
                  </div>
                  <p className="text-sm text-ink2 mt-1 line-clamp-2">{a.content}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmDel(a)}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AnnModal editing={editing} onClose={() => setEditing(null)} onSave={save} />
      <Modal open={!!confirmDel} title="تأكيد الحذف" onClose={() => setConfirmDel(null)}
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          <Button variant="danger" onClick={remove}>حذف</Button>
        </>}>
        <p className="text-sm text-ink2">حذف تنبيه «{confirmDel?.title}»؟</p>
      </Modal>
    </div>
  );
}

function AnnModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title || "", content: editing.content || "", type: editing.type || "banner",
        target_audience: editing.target_audience || "all", is_active: !!editing.is_active,
        starts_at: editing.starts_at || "", expires_at: editing.expires_at || "",
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
        title: form.title,
        content: form.content,
        type: form.type,
        target_audience: form.target_audience,
        is_active: !!form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
      });
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal open title="تنبيه جديد" onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose}>إلغاء</Button>
      <Button onClick={submit} disabled={busy}>{busy ? "جارٍ الحفظ…" : "نشر"}</Button>
    </>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <Input label="العنوان" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea label="المحتوى" required rows={3} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="النوع" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="banner">شريط</option>
            <option value="popup">نافذة منبثقة</option>
            <option value="notification">إشعار</option>
          </Select>
          <Select label="الجمهور" value={form.target_audience} onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}>
            <option value="all">الجميع</option>
            <option value="users">المستخدمون فقط</option>
            <option value="guests">الزوار فقط</option>
          </Select>
          <Input label="يبدأ من" type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
          <Input label="ينتهي في" type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
          <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          مفعّل الآن
        </label>
      </form>
    </Modal>
  );
}
