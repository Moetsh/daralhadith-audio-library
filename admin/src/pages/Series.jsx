import { useList, useCrud, useRefs } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Badge, Table, ListCard, RowActions } from "../components/ui";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { SeriesModal, SERIES_EMPTY } from "../components/SeriesModal";
import { Plus } from "lucide-react";

export default function Series() {
  const { scholars, categories } = useRefs();
  const { rows, loading, error, reload } = useList(() => api("/series"));
  const { editing, setEditing, confirmDel, setConfirmDel, remove } = useCrud("/series", { reload });

  const scholarName = (id) => scholars.find((s) => s.id === id)?.name || "—";
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageTitle
        title="السلاسل"
        subtitle="دروس وحلقات متسلسلة"
        actions={<Button onClick={() => setEditing({ ...SERIES_EMPTY })}><Plus size={16} /> سلسلة جديدة</Button>}
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

      <SeriesModal
        editing={editing}
        scholars={scholars}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />

      <ConfirmDelete
        item={confirmDel}
        message={`حذف سلسلة «${confirmDel?.title}»؟ لا يمكن الحذف إذا كانت تحتوي على حلقات.`}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />
    </div>
  );
}
