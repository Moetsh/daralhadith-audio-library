import { Input, Select, Textarea, Check } from "./ui";
import { EditModal } from "./EditModal";

export const SERIES_EMPTY = {
  title: "", title_en: "", scholar_id: "", category_id: "",
  description: "", total_episodes: 0, is_complete: false, order_direction: "asc",
};

export const seriesToForm = (s) => ({
  title: s.title || "",
  title_en: s.title_en || "",
  scholar_id: s.scholar_id || "",
  category_id: s.category_id || "",
  description: s.description || "",
  total_episodes: s.total_episodes || 0,
  is_complete: !!s.is_complete,
  order_direction: s.order_direction || "asc",
});

export const seriesToPayload = (f, editing) => ({
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

/* نافذة إنشاء/تعديل سلسلة — مشتركة بين صفحة السلاسل ونافذة الشريط. */
export function SeriesModal({ editing, scholars, categories, onClose, onSave }) {
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
      onSave={onSave}
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
  );
}
