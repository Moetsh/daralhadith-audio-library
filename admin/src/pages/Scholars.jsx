import { useList, useCrud } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Input, Textarea, Badge, Table, ListCard, RowActions, Check } from "../components/ui";
import { EditModal } from "../components/EditModal";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Plus, Star } from "lucide-react";

const EMPTY = { name: "", name_en: "", bio: "", specialization: "", country: "", status: "active", is_featured: false };

const toForm = (s) => ({
  name: s.name || "",
  name_en: s.name_en || "",
  bio: s.bio || "",
  specialization: s.specialization || "",
  country: s.country || "",
  status: s.status || "active",
  is_featured: !!s.is_featured,
});

const toPayload = (f, editing) => ({
  id: editing?.id || undefined,
  name: f.name,
  name_en: f.name_en || null,
  bio: f.bio || null,
  specialization: f.specialization || null,
  country: f.country || null,
  status: f.status,
  is_featured: !!f.is_featured,
});

export default function Scholars() {
  const { rows, loading, error, reload } = useList(() => api("/scholars"));
  const { editing, setEditing, confirmDel, setConfirmDel, save, remove } = useCrud("/scholars", { reload });

  return (
    <div>
      <PageTitle
        title="العلماء"
        subtitle="المشايخ والقرّاء الذين تُنشر أشرطتهم"
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> شيخ جديد</Button>}
      />
      <ListCard loading={loading} error={error} empty={rows.length === 0}>
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
        title="تعديل شيخ"
        newTitle="شيخ جديد"
        width="max-w-2xl"
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {({ form, set }) => (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="المعرف (لاتيني بلا مسافات)" required dir="ltr" className="text-left" value={editing?.id || ""} disabled={!!editing?.id} placeholder="مثال: albani" />
              <Input label="الاسم (عربي)" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              <Input label="الاسم (إنجليزي)" dir="ltr" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
              <Input label="التخصص" value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
              <Input label="البلد" value={form.country} onChange={(e) => set("country", e.target.value)} />
              <Textarea label="نبذة" className="md:col-span-2" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </div>
            <div className="flex items-center gap-5">
              <Check label="شيخ مميز" checked={!!form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
              <Check label="نشط" checked={form.status === "active"} onChange={(e) => set("status", e.target.checked ? "active" : "inactive")} />
            </div>
          </>
        )}
      </EditModal>

      <ConfirmDelete
        item={confirmDel}
        message={`حذف الشيخ «${confirmDel?.name}»؟ لا يمكن الحذف إذا كان لديه أشرطة.`}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
