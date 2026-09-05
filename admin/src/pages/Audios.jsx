import { useEffect, useState } from "react";
import { api } from "../api";
import { useList } from "../hooks";
import { useCrud } from "../hooks";
import { useRefs } from "../hooks";
import {
  PageTitle, Button, Card, Input, Select, Badge, Table,
  Textarea, Check, ListCard, Pagination, RowActions,
} from "../components/ui";
import { EditModal } from "../components/EditModal";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { CoverPicker } from "../components/CoverPicker";
import { SeriesModal, applySeriesCover } from "../components/SeriesModal";
import { Search, Plus, Pencil, ImageIcon } from "lucide-react";

const EMPTY = {
  title: "", title_en: "", scholar_id: "", category_id: "", sub_category_id: "", series_id: "",
  episode_number: "", description: "", archive_url: "", file_url: "", cover_image_url: "",
  duration: 0, status: "published", is_featured: false, allow_download: true,
};

const toForm = (a) => ({
  ...EMPTY,
  ...a,
  sub_category_id: a.sub_category_id || "",
  episode_number: a.episode_number ?? "",
  duration: a.duration ?? 0,
});

const toPayload = (f) => ({
  title: f.title,
  title_en: f.title_en || null,
  scholar_id: f.scholar_id,
  category_id: f.category_id,
  sub_category_id: f.sub_category_id || null,
  series_id: f.series_id || null,
  episode_number: f.episode_number ? Number(f.episode_number) : null,
  description: f.description || null,
  archive_url: f.archive_url || null,
  file_url: f.file_url || null,
  duration: Number(f.duration) || 0,
  status: f.status,
  is_featured: !!f.is_featured,
  allow_download: !!f.allow_download,
  cover_image_url: f.cover_image_url || null,
});

export default function Audios() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", scholar: "", category: "", status: "", sort: "new" });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const { scholars, categories, series, error: refsError, reload: reloadRefs } = useRefs();
  const [editingSeries, setEditingSeries] = useState(null);
  const { rows, loading, error, reload } = useList(async () => {
    const params = { page, per: 25, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    const r = await api("/audios", { params });
    setTotal(r.total);
    setPages(r.pages);
    return r.items;
  }, [page, filters]);
  const { editing, setEditing, confirmDel, setConfirmDel, save, remove } = useCrud("/audios", { reload });

  const setFilter = (k, v) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const [cApply, setCApply] = useState(false);
  const [cOverwrite, setCOverwrite] = useState(false);
  const [cBusy, setCBusy] = useState(false);
  const [cMsg, setCMsg] = useState(null);

  useEffect(() => {
    setCApply(false);
    setCOverwrite(false);
    setCMsg(null);
    setCBusy(false);
  }, [editing?.id]);

  const toggleStatus = async (a) => {
    const next = a.status === "published" ? "hidden" : "published";
    await api("/audios/" + a.id, { method: "PUT", body: { status: next } });
    reload();
  };

  const statusBadge = (s) =>
    s === "published" ? <Badge tone="green">منشور</Badge>
    : s === "draft" ? <Badge tone="gold">مسودة</Badge>
    : <Badge tone="gray">مخفي</Badge>;

  return (
    <div>
      <PageTitle
        title="الأشرطة"
        subtitle={`${total.toLocaleString("ar-EG")} شريطاً في المكتبة`}
        actions={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={16} /> شريط جديد
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <Input className="pr-10" placeholder="ابحث بالعنوان أو الشيخ…" value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)} />
          </div>
          <Select value={filters.scholar} onChange={(e) => setFilter("scholar", e.target.value)}>
            <option value="">كل العلماء</option>
            {scholars.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
            <option value="">كل التصنيفات</option>
            {categories.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="hidden">مخفي</option>
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
            <option value="new">الأحدث</option>
            <option value="old">الأقدم</option>
            <option value="popular">الأكثر استماعاً</option>
            <option value="duration">الأطول</option>
          </Select>
        </div>
      </Card>

      <ListCard loading={loading} error={error || refsError} empty={rows.length === 0}>
        <Table head={["العنوان", "الشيخ", "التصنيف", "السلسلة", "الاستماعات", "الحالة", ""]}>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0 hover:bg-bg2/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: a.cover_image_url ? "transparent" : "#f4ecd7" }}>
                    {a.cover_image_url
                      ? <img src={a.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <ImageIcon size={16} className="text-[#b5842e]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold max-w-[260px] truncate">{a.title}</div>
                    {a.episode_number && <div className="text-xs text-ink3">الجزء {a.episode_number}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-ink2 whitespace-nowrap">{a.scholar_name || "—"}</td>
              <td className="px-4 py-3 text-ink2 whitespace-nowrap">
                {a.sub_category_name ? <span className="text-xs text-ink3">↳ {a.sub_category_name}</span> : a.category_name || "—"}
              </td>
              <td className="px-4 py-3 text-ink2 max-w-[180px] truncate">{a.series_title || "—"}</td>
              <td className="px-4 py-3 text-ink2 tabular-nums">{Number(a.listen_count).toLocaleString("ar-EG")}</td>
              <td className="px-4 py-3">
                <button onClick={() => toggleStatus(a)} className="cursor-pointer">{statusBadge(a.status)}</button>
              </td>
              <td className="px-4 py-3">
                <RowActions onEdit={() => setEditing(a)} onDelete={() => setConfirmDel(a)} />
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>
      <Pagination page={page} pages={pages} onPage={setPage} />

      <EditModal
        editing={editing}
        initial={EMPTY}
        toForm={toForm}
        toPayload={toPayload}
        title="تعديل شريط"
        newTitle="شريط جديد"
        width="max-w-2xl"
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {({ form, set }) => {
          const applyAudioCover = async () => {
            setCBusy(true);
            setCMsg(null);
            try {
              await api("/audios/" + editing.id, { method: "PUT", body: toPayload(form) });
              const { updated, total } = await applySeriesCover(
                form.series_id,
                { mode: cOverwrite ? "all" : "empty", cover_image_url: form.cover_image_url || null },
                ({ updated: u, total: t, done }) => {
                  if (!done) setCMsg({ ok: true, text: `جارٍ التطبيق… ${u} من ${t} حلقة` });
                }
              );
              setCMsg({ ok: true, text: `تم تطبيق الغلاف على ${updated} من ${total} حلقة` });
              reload();
            } catch (e) {
              setCMsg({ ok: false, text: e.message || "حدث خطأ" });
            } finally {
              setCBusy(false);
            }
          };

          return (
          <>
            <CoverPicker value={form.cover_image_url || ""} onChange={(v) => set("cover_image_url", v)} />
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="العنوان (عربي)" required value={form.title} onChange={(e) => set("title", e.target.value)} />
              <Input label="العنوان (إنجليزي)" dir="ltr" value={form.title_en || ""} onChange={(e) => set("title_en", e.target.value)} />
              <Select label="الشيخ" required value={form.scholar_id} onChange={(e) => set("scholar_id", e.target.value)}>
                <option value="">— اختر الشيخ —</option>
                {scholars.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="التصنيف" required value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">— اختر التصنيف —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.parent_id ? "↳ " + c.name : c.name}</option>
                ))}
              </Select>
              <Select label="التصنيف الفرعي (اختياري)" value={form.sub_category_id || ""} onChange={(e) => set("sub_category_id", e.target.value)}>
                <option value="">بدون تصنيف فرعي</option>
                {categories.filter((c) => c.parent_id === form.category_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Select label="السلسلة (اختياري)" value={form.series_id || ""} onChange={(e) => set("series_id", e.target.value)}>
                    <option value="">بدون سلسلة</option>
                    {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </Select>
                </div>
                {form.series_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    title="تعديل السلسلة"
                    onClick={() => setEditingSeries(series.find((s) => s.id === form.series_id) || null)}
                  >
                    <Pencil size={14} /> السلسلة
                  </Button>
                )}
              </div>
              <Input label="رقم الجزء" type="number" value={form.episode_number} onChange={(e) => set("episode_number", e.target.value)} />
              <Input label="المدة (ثانية)" type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
              <Input label="رابط الأرشيف" dir="ltr" value={form.archive_url || ""} onChange={(e) => set("archive_url", e.target.value)} />
              <Input label="رابط الغلاف" dir="ltr" value={form.cover_image_url || ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://…/cover.jpg" />
              <Input label="رابط الملف" dir="ltr" className="md:col-span-2" value={form.file_url || ""} onChange={(e) => set("file_url", e.target.value)} />
              <Textarea label="الوصف" className="md:col-span-2" rows={3} placeholder="الوصف…" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
              <Select label="الحالة" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
                <option value="hidden">مخفي</option>
              </Select>
              <div className="flex items-end gap-4 pb-2">
                <Check label="شريط مميز" checked={!!form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
                <Check label="يُسمح بالتحميل" checked={!!form.allow_download} onChange={(e) => set("allow_download", e.target.checked)} />
              </div>
            </div>
            {editing?.id && form.series_id && (
              <div className="rounded-2xl border border-line p-4 space-y-3 bg-bg2/40">
                <Check
                  label="تطبيق غلاف هذا الشريط على كل حلقات السلسلة"
                  checked={cApply}
                  onChange={(e) => { setCApply(e.target.checked); setCMsg(null); }}
                />
                {cApply && (
                  <>
                    <Check
                      label="استبدال أغلفة الحلقات الموجودة أيضًا"
                      checked={cOverwrite}
                      onChange={(e) => setCOverwrite(e.target.checked)}
                    />
                    <p className="text-[11px] text-ink3">
                      {cOverwrite
                        ? "سيُستبدل غلاف كل الحلقات (والسلسلة) بهذا الغلاف."
                        : "سيُطبَّق الغلاف فقط على الحلقات التي بلا غلاف."}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="gold"
                        disabled={cBusy || !form.cover_image_url}
                        onClick={applyAudioCover}
                      >
                        {cBusy ? "جارٍ التطبيق…" : "حفظ الغلاف وتطبيقه الآن"}
                      </Button>
                    </div>
                    {cMsg && (
                      <div>
                        <Badge tone={cMsg.ok ? "green" : "danger"}>{cMsg.text}</Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
          );
        }}
      </EditModal>

      <ConfirmDelete
        item={confirmDel}
        message={`هل أنت متأكد من حذف شريط «${confirmDel?.title}»؟ لا يمكن التراجع عن هذه العملية.`}
        confirmLabel="حذف نهائي"
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
      />

      <SeriesModal
        editing={editingSeries}
        scholars={scholars}
        categories={categories}
        onClose={() => setEditingSeries(null)}
        onSaved={reloadRefs}
      />
    </div>
  );
}
