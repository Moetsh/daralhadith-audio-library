import { useState } from "react";
import { useList, useCrud } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Input, Select, Badge, Table, ListCard, RowActions, Check, cx } from "../components/ui";
import { EditModal } from "../components/EditModal";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Plus, ChevronLeft } from "lucide-react";

const EMPTY = { id: "", name: "", parent_id: "", icon: "book", sort_order: 0, is_active: true };

const toForm = (c) => ({
  id: c.id || "",
  name: c.name || "",
  parent_id: c.parent_id || "",
  icon: c.icon || "book",
  sort_order: c.sort_order || 0,
  is_active: !!c.is_active,
});

const toPayload = (f, editing) => ({
  id: f.id || editing?.id || undefined,
  name: f.name,
  parent_id: f.parent_id || null,
  icon: f.icon,
  sort_order: Number(f.sort_order) || 0,
  is_active: !!f.is_active,
});

export default function Categories() {
  const { rows, loading, error, reload } = useList(() => api("/categories"));
  const { editing, setEditing, confirmDel, setConfirmDel, save, remove } = useCrud("/categories", { reload });
  const [open, setOpen] = useState({});

  const parents = rows.filter((c) => !c.parent_id);

  return (
    <div>
      <PageTitle
        title="التصنيفات"
        subtitle="تنظيم الأشرطة ضمن أبواب وأقسام"
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> تصنيف جديد</Button>}
      />
      <ListCard loading={loading} error={error} empty={rows.length === 0}>
        <Table head={["التصنيف", "النوع", "الأشرطة", "السلاسل", "الحالة", ""]}>
          {parents.map((c) => (
            <CategoryRows key={c.id} c={c} rows={rows} depth={0}
              open={open} onToggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))}
              onEdit={setEditing} onDelete={setConfirmDel} />
          ))}
        </Table>
      </ListCard>

      <EditModal
        editing={editing}
        initial={EMPTY}
        toForm={toForm}
        toPayload={toPayload}
        title="تعديل تصنيف"
        newTitle="تصنيف جديد"
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {({ form, set }) => (
          <>
            <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={form.id} disabled={!!editing?.id} onChange={(e) => set("id", e.target.value)} placeholder="مثال: fadail" />
            <Input label="الاسم (عربي)" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            <Select label="التصنيف الأب (اتركه فارغاً ليصبح رئيسياً)" value={form.parent_id} onChange={(e) => set("parent_id", e.target.value)}>
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
              <Input label="الأيقونة" dir="ltr" value={form.icon} onChange={(e) => set("icon", e.target.value)} />
              <Input label="الترتيب" type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
            <Check label="مفعّل" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          </>
        )}
      </EditModal>

      <ConfirmDelete
        item={confirmDel}
        message={`حذف تصنيف «${confirmDel?.name}»؟ لا يمكن حذف تصنيف يحتوي على أشرطة أو تصنيفات فرعية.`}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />
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
          <RowActions compact onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
        </td>
      </tr>
      {accordion && subs.map((s) => (
        <CategoryRows key={s.id} c={s} rows={rows} depth={depth + 1}
          open={open} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}
