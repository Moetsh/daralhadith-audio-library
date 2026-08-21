import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Select, Badge, Table, Modal, Loading, Empty, ErrorBox, cx } from "../components/ui";
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [open, setOpen] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/categories"));
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
    if (editing?.id) await api("/categories/" + editing.id, { method: "PUT", body: payload });
    else await api("/categories", { method: "POST", body: payload });
    setEditing(null);
    load();
  };

  const remove = async () => {
    await api("/categories/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    load();
  };

  const all = rows;
  const parents = rows.filter((c) => !c.parent_id);
  const childrenOf = (pid) => rows.filter((c) => c.parent_id === pid);
  const catById = (id) => rows.find((c) => c.id === id);
  const ancestorIds = (id) => {
    const out = [];
    let cur = catById(id);
    while (cur?.parent_id) { out.push(cur.parent_id); cur = catById(cur.parent_id); }
    return out;
  };

  return (
    <div>
      <PageTitle
        title="التصنيفات"
        subtitle="تنظيم الأشرطة ضمن أبواب وأقسام"
        actions={<Button onClick={() => setEditing({ name: "", parent_id: "", icon: "book", sort_order: 0 })}><Plus size={16} /> تصنيف جديد</Button>}
      />
      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
          <Table head={["التصنيف", "النوع", "الأشرطة", "السلاسل", "الحالة", ""]}>
            {parents.map((c) => (
              <CategoryRows key={c.id} c={c} rows={all} depth={0}
                open={open} onToggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))}
                onEdit={setEditing} onDelete={setConfirmDel} />
            ))}
          </Table>
        )}
      </Card>

      <CatModal editing={editing} parents={parents} rows={rows} onClose={() => setEditing(null)} onSave={save} />
      <Modal open={!!confirmDel} title="تأكيد الحذف" onClose={() => setConfirmDel(null)}
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          <Button variant="danger" onClick={remove}>حذف</Button>
        </>}>
        <p className="text-sm text-ink2">حذف تصنيف «{confirmDel?.name}»؟ لا يمكن حذف تصنيف يحتوي على أشرطة أو تصنيفات فرعية.</p>
      </Modal>
    </div>
  );
}

function CategoryRows({ c, rows, depth, open, onToggle, onEdit, onDelete }) {
  const subs = rows.filter((x) => x.parent_id === c.id);
  const accordion = open[c.id];
  return (
    <>
      <tr className="border-b border-line hover:bg-bg2/40 bg-card2/40">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 font-bold" style={{ paddingInlineStart: depth * 28 }}>
            <button onClick={() => onToggle(c.id)} className={cx("p-0.5 text-ink3 hover:text-green transition-transform", accordion && "-rotate-90", subs.length === 0 && "opacity-30 pointer-events-none")}>
              <ChevronLeft size={15} />
            </button>
            <span className={cx("inline-block w-2 h-2 rounded-full shrink-0", depth === 0 ? "bg-green" : "bg-gold")} />
            <span className="min-w-0">{c.name}</span>
            <span className="text-xs text-ink3 font-normal shrink-0" dir="ltr">({c.id})</span>
          </div>
        </td>
        <td className="px-4 py-3">{depth === 0 ? <Badge tone="green">رئيسي</Badge> : <Badge tone="gold">فرعي</Badge>}</td>
        <td className="px-4 py-3 text-ink2 tabular-nums">{Number(c.audio_count).toLocaleString("ar-EG")}</td>
        <td className="px-4 py-3 text-ink2 tabular-nums">{Number(c.series_count).toLocaleString("ar-EG")}</td>
        <td className="px-4 py-3">{c.is_active ? <Badge tone="green">مفعل</Badge> : <Badge tone="gray">معطل</Badge>}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(c)}><Pencil size={14} /></Button>
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => onDelete(c)}><Trash2 size={14} /></Button>
          </div>
        </td>
      </tr>
      {accordion && subs.map((s) => (
        <CategoryRows key={s.id} c={s} rows={rows} depth={depth + 1}
          open={open} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

function CatModal({ editing, parents, rows, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", parent_id: "", icon: "book", sort_order: 0, is_active: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name || "", parent_id: editing.parent_id || "", icon: editing.icon || "book", sort_order: editing.sort_order || 0, is_active: !!editing.is_active });
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
        parent_id: form.parent_id || null,
        icon: form.icon,
        sort_order: Number(form.sort_order) || 0,
        is_active: !!form.is_active,
      });
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal open title={editing?.id ? "تعديل تصنيف" : "تصنيف جديد"} onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose}>إلغاء</Button>
      <Button onClick={submit} disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
    </>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={editing?.id || ""} disabled={!!editing?.id} placeholder="مثال: fadail" />
        <Input label="الاسم (عربي)" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Select label="التصنيف الأب (اتركه فارغاً ليصبح رئيسياً)" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
          <option value="">— تصنيف رئيسي —</option>
          {parents.filter((p) => p.id !== editing?.id).map((p) =>
            <option key={p.id} value={p.id}>{p.name}</option>
          )}
          {parents.map((p) =>
            rows.filter((x) => x.parent_id === p.id && x.id !== editing?.id).map((ch) =>
              <option key={ch.id} value={ch.id}>↳ {ch.name}</option>
            )
          )}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="الأيقونة" dir="ltr" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
          <Input label="الترتيب" type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
          <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
          مفعّل
        </label>
      </form>
    </Modal>
  );
}
