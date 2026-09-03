import { useList, useCrud } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Input, Textarea, Select, Badge, ListCard, Check } from "../components/ui";
import { EditModal } from "../components/EditModal";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { Plus, Trash2, Megaphone } from "lucide-react";

const EMPTY = { title: "", content: "", type: "banner", target_audience: "all", is_active: true, starts_at: "", expires_at: "" };

const toForm = (a) => ({
  title: a.title || "",
  content: a.content || "",
  type: a.type || "banner",
  target_audience: a.target_audience || "all",
  is_active: !!a.is_active,
  starts_at: a.starts_at || "",
  expires_at: a.expires_at || "",
});

const toPayload = (f) => ({
  title: f.title,
  content: f.content,
  type: f.type,
  target_audience: f.target_audience,
  is_active: !!f.is_active,
  starts_at: f.starts_at || null,
  expires_at: f.expires_at || null,
});

export default function Announcements() {
  const { rows, loading, error, reload } = useList(() => api("/admin/announcements"));
  const { editing, setEditing, confirmDel, setConfirmDel, save, remove } = useCrud("/admin/announcements", { reload });

  return (
    <div>
      <PageTitle
        title="التنبيهات"
        subtitle="رسائل يراها مستخدمو التطبيق"
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> تنبيه جديد</Button>}
      />
      <ListCard loading={loading} error={error} empty={rows.length === 0} emptyText="لا توجد تنبيهات">
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
      </ListCard>

      <EditModal
        editing={editing}
        initial={EMPTY}
        toForm={toForm}
        toPayload={toPayload}
        title="تنبيه جديد"
        newTitle="تنبيه جديد"
        submitLabel="نشر"
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {({ form, set }) => (
          <>
            <Input label="العنوان" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            <Textarea label="المحتوى" required rows={3} value={form.content} onChange={(e) => set("content", e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="النوع" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="banner">شريط</option>
                <option value="popup">نافذة منبثقة</option>
                <option value="notification">إشعار</option>
              </Select>
              <Select label="الجمهور" value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)}>
                <option value="all">الجميع</option>
                <option value="users">المستخدمون فقط</option>
                <option value="guests">الزوار فقط</option>
              </Select>
              <Input label="يبدأ من" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              <Input label="ينتهي في" type="datetime-local" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
            </div>
            <Check label="مفعّل الآن" checked={!!form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          </>
        )}
      </EditModal>

      <ConfirmDelete
        item={confirmDel}
        message={`حذف تنبيه «${confirmDel?.title}»؟`}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
