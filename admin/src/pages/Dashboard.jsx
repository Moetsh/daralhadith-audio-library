import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Card, Loading, ErrorBox, PageTitle, cx } from "../components/ui";
import { AreaChart, HBarList } from "../components/charts";
import { Music2, GraduationCap, FolderTree, Headphones, PlaySquare, UserPlus, Download, Library } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [listens, setListens] = useState([]);
  const [catDist, setCatDist] = useState([]);
  const [topAudios, setTopAudios] = useState([]);
  const [topScholars, setTopScholars] = useState([]);
  const [terms, setTerms] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [error, setError] = useState(null);
  const [expBusy, setExpBusy] = useState(false);

  useEffect(() => {
    let on = true;
    const safe = async (p, fb) => {
      try {
        return await p;
      } catch {
        return fb;
      }
    };
    (async () => {
      try {
        const ov = await api("/admin/overview");
        if (!on) return;
        setData(ov);
        setError(null);
      } catch (e) {
        if (on) setError(e);
        return;
      }
      const [ls, cd, ta, ts, st, dl] = await Promise.all([
        safe(api("/admin/listens"), []),
        safe(api("/admin/categories"), []),
        safe(api("/admin/popular?n=6"), []),
        safe(api("/admin/top-scholars"), []),
        safe(api("/admin/search-terms"), []),
        safe(api("/admin/downloads"), []),
      ]);
      if (!on) return;
      setListens(ls);
      setCatDist(cd);
      setTopAudios(ta);
      setTopScholars(ts);
      setTerms(st);
      setDownloads(dl);
    })();
    return () => {
      on = false;
    };
  }, []);

  const exportCsv = async () => {
    setExpBusy(true);
    try {
      const csv = await api("/admin/export");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "audios.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e);
    } finally {
      setExpBusy(false);
    }
  };

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  const cards = [
    { label: "الأشرطة", value: data.audios, icon: Music2, tone: "bg-green-soft text-green" },
    { label: "العلماء", value: data.scholars, icon: GraduationCap, tone: "bg-gold-soft text-gold2" },
    { label: "التصنيفات", value: data.categories, icon: FolderTree, tone: "bg-green-soft text-green" },
    { label: "السلاسل", value: data.series, icon: Library, tone: "bg-gold-soft text-gold2" },
    { label: "المستخدمون", value: data.users, icon: UserPlus, tone: "bg-green-soft text-green" },
    { label: "إجمالي الاستماعات", value: data.listens, icon: Headphones, tone: "bg-gold-soft text-gold2" },
    { label: "التنزيلات", value: data.downloads, icon: Download, tone: "bg-green-soft text-green" },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="لوحة المعلومات"
        subtitle="نظرة عامة على مكتبة دار الحديث الصوتية"
        actions={
          <Button size="sm" variant="outline" disabled={expBusy} onClick={exportCsv}>
            <Download size={14} /> {expBusy ? "جارٍ التصدير…" : "تصدير CSV"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className={cx("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-card", tone)}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black tabular-nums truncate">{Number(value || 0).toLocaleString("ar-EG")}</div>
              <div className="text-xs text-ink3 font-bold">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-bold text-green mb-4">الاستماعات — آخر 30 يوماً</h2>
          <AreaChart data={listens} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-green mb-4">عمليات البحث الشائعة</h2>
          <HBarList data={terms.map((t) => ({ id: t.query, name: t.query, count: t.c }))} color="#b5842e" />
          {terms.length === 0 && <p className="text-sm text-ink3">لا توجد عمليات بحث بعد</p>}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-green mb-4">التحميلات — آخر 30 يوماً</h2>
        <AreaChart data={downloads} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-green mb-4">توزيع الأشرطة حسب التصنيف</h2>
          <HBarList data={catDist} color="#dc6a1c" limit={9} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-green mb-4">أكثر العلماء استماعاً</h2>
          <HBarList
            data={topScholars.map((s) => ({ id: s.id, name: s.name, count: s.listens }))}
            color="#b5842e"
          />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <PlaySquare size={18} className="text-green" />
          <h2 className="font-bold text-green">الأشرطة الأكثر استماعاً</h2>
        </div>
        <div className="divide-y divide-line">
          {topAudios.map((a, i) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <span className="w-7 h-7 rounded-lg bg-gold-soft text-gold2 text-xs font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{a.title}</div>
                <div className="text-xs text-ink3">{a.scholar_name}</div>
              </div>
              <span className="text-xs font-bold text-ink2 tabular-nums shrink-0">
                {Number(a.listen_count || 0).toLocaleString("ar-EG")} استماع
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
