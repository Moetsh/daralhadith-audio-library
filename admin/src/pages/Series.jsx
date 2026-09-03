import { useList, useCrud, useRefs } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Input, Select, Textarea, Badge, Table, ListCard, RowActions, Check } from "../components/ui";
import { EditModal } from "../components/EditModal";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Plus } from "lucide-react";

const EMPTY = { title: "", title_en: "", scholar_id: "", category_id: "", description: "", total_episodes: 0, is_complete: false, order_direction: "asc" };

const toForm = (s) => ({
  title: s.title || "",
  title_en: s.title_en || "",
  scholar_id: s.scholar_id || "",
  category_id: s.category_id || "",
  description: s.description || "",
  total_episodes: s.total_episodes || 0,
  is_complete: !!s.is_complete,
  order_direction: s.order_direction || "asc",
});

const toPayload = (f, editing) => ({
  id: editing?.id || undefined,
  title: f.title,
  title_en: f.title_en || null,
  scholar_id: f.scholar_id || null,
  category_id: f.category_id || null,
  description: f.description || null,
  total_episodes: Number(f.total_episodes) || 0,
  is_complete: !!f.is_complete,
  order_direction: f.order_direction,
});

export default function Series() {
  const { scholars, categories } = useRefs();
  const { rows, loading, error, reload } = useList(() => api("/series"));
  const { editing, setEditing, confirmDel, setConfirmDel, save, remove } = useCrud("/series", { reload });

  const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "—";
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageTitle
        title="السلاسل"
        subtitle="دروس وحلقات متسلسلة"
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> سلسلة جديدة</Button>}
      />
      <ListCard loading={loading} error={error} empty={rows.length === 0}>
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
                <RowActions compact onEdit={() => setEditing(s)} onDelete={() => setConfirmDel(s)} />
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>

      <EditModal
        editing={editing}
        initial={EMPTY}
        toForm={toForm}
        toPayload={toPayload}
        title="تعديل سلسلة"
        newTitle="سلسلة جديدة"
        width="max-w-2xl"
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {({ form, set }) => (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={editing?.id || ""} disabled={!!editing?.id} placeholder="مثال: fiqh-course" />
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
              <Input label="عدد الحلقات" type="number" value={form.total_episodes} onChange={(e) => set("total_episodes", e.target.value)} />
              <Select label="اتجاه الترتيب" value={form.order_direction} onChange={(e) => set("order_direction", e.target.value)}>
                <option value="asc">من الأول للأخير</option>
                <option value="desc">من الأخير للأول</option>
              </Select>
              <Textarea label="الوصف" className="md:col-span-2" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <Check label="سلسلة مكتملة" checked={!!form.is_complete} onChange={(e) => set("is_complete", e.target.checked)} />
          </>
        )}
      </EditModal>

      <ConfirmDelete
        item={confirmDel}
        message={`حذف سلسلة «${confirmDel?.title}»؟ لا يمكن الحذف إذا كانت تحتوي على حلقات.`}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
