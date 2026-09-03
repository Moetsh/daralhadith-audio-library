import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Select, Badge, Table, Modal, Loading, Empty, ErrorBox, Pagination, cx } from "../components/ui";
import { Search, Plus, Pencil, Trash2, ImageIcon, Upload } from "lucide-react";

const EMPTY = {
  title: "", title_en: "", scholar_id: "", category_id: "", sub_category_id: "", series_id: "",
  episode_number: "", description: "", archive_url: "", file_url: "", cover_image_url: "",
  duration: 0, status: "published", is_featured: false, allow_download: true,
};

export default function Audios() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ q: "", scholar: "", category: "", status: "", sort: "new" });
  const [scholars, setScholars] = useState([]);
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const loadRefs = useCallback(async () => {
    const [s, c, sr] = await Promise.all([api("/scholars"), api("/categories"), api("/series")]);
    setScholars(s);
    setCategories(c);
    setSeries(sr);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per: 25, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const r = await api("/audios", { params });
      setRows(r.items);
      setTotal(r.total);
      setPages(r.pages);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadRefs().catch((e) => setError(e));
  }, [loadRefs]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (k, v) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const save = async (payload) => {
    if (editing?.id) await api("/audios/" + editing.id, { method: "PUT", body: payload });
    else await api("/audios", { method: "POST", body: payload });
    setEditing(null);
    load();
  };

  const remove = async () => {
    await api("/audios/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    load();
  };

  const toggleStatus = async (a) => {
    const next = a.status === "published" ? "hidden" : "published";
    await api("/audios/" + a.id, { method: "PUT", body: { status: next } });
    load();
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

      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
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
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                      <Pencil size={14} /> تعديل
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:text-danger" title="حذف" onClick={() => setConfirmDel(a)}><Trash2 size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Pagination page={page} pages={pages} onPage={setPage} />

      <AudioModal
        editing={editing}
        scholars={scholars}
        categories={categories}
        series={series}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Modal open={!!confirmDel} title="تأكيد الحذف" onClose={() => setConfirmDel(null)}
        footer={<>
          <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
          <Button variant="danger" onClick={remove}>حذف نهائي</Button>
        </>}>
        <p className="text-sm text-ink2">هل أنت متأكد من حذف شريط «{confirmDel?.title}»؟ لا يمكن التراجع عن هذه العملية.</p>
      </Modal>
    </div>
  );
}

function AudioModal({ editing, scholars, categories, series, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        ...EMPTY,
        ...editing,
        sub_category_id: editing.sub_category_id || "",
        episode_number: editing.episode_number ?? "",
        duration: editing.duration ?? 0,
      });
      setErr(null);
    }
  }, [editing]);

  if (!editing) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickCover = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      set("cover_image_url", cv.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onSave({
        title: form.title,
        title_en: form.title_en || null,
        scholar_id: form.scholar_id,
        category_id: form.category_id,
        sub_category_id: form.sub_category_id || null,
        series_id: form.series_id || null,
        episode_number: form.episode_number ? Number(form.episode_number) : null,
        description: form.description || null,
        archive_url: form.archive_url || null,
        file_url: form.file_url || null,
        duration: Number(form.duration) || 0,
        status: form.status,
        is_featured: !!form.is_featured,
        allow_download: !!form.allow_download,
        cover_image_url: form.cover_image_url || null,
      });
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal open title={editing?.id ? "تعديل شريط" : "شريط جديد"} onClose={onClose} width="max-w-2xl"
      footer={<>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
      </>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        <div className="md:col-span-2">
          <label className="block text-xs font-black text-ink3 mb-1.5">غلاف الشريط (اختياري)</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-line flex items-center justify-center"
              style={{ background: form.cover_image_url ? "transparent" : "#f4ecd7" }}>
              {form.cover_image_url
                ? <img src={form.cover_image_url} alt="غلاف الشريط" className="w-full h-full object-cover" />
                : <ImageIcon size={30} className="text-[#b5842e]" />}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 rounded-xl bg-green text-white text-sm font-bold px-3.5 py-2 cursor-pointer">
                <Upload size={15} /> اختيار صورة
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
              </label>
              {form.cover_image_url && (
                <div>
                  <button type="button" onClick={() => set("cover_image_url", "")} className="text-xs font-bold text-danger hover:underline">إزالة الغلاف</button>
                </div>
              )}
              <p className="text-[11px] text-ink3">تُقلَّص الصورة تلقائياً إلى 600px وتُخزّن مع الشريط.</p>
            </div>
          </div>
        </div>
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
          <Select label="السلسلة (اختياري)" value={form.series_id || ""} onChange={(e) => set("series_id", e.target.value)}>
            <option value="">بدون سلسلة</option>
            {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </Select>
          <Input label="رقم الجزء" type="number" value={form.episode_number} onChange={(e) => set("episode_number", e.target.value)} />
          <Input label="المدة (ثانية)" type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
          <Input label="رابط الأرشيف" dir="ltr" value={form.archive_url || ""} onChange={(e) => set("archive_url", e.target.value)} />
          <Input label="رابط الغلاف" dir="ltr" value={form.cover_image_url || ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://…/cover.jpg" />
          <Input label="رابط الملف" dir="ltr" className="md:col-span-2" value={form.file_url || ""} onChange={(e) => set("file_url", e.target.value)} />
          <textarea
            className="md:col-span-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-green2"
            rows={3} placeholder="الوصف…" value={form.description || ""} onChange={(e) => set("description", e.target.value)}
          />
          <Select label="الحالة" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="hidden">مخفي</option>
          </Select>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
              <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
              شريط مميز
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-ink2 cursor-pointer">
              <input type="checkbox" className="accent-[#f58024] w-4 h-4" checked={!!form.allow_download} onChange={(e) => set("allow_download", e.target.checked)} />
              يُسمح بالتحميل
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
