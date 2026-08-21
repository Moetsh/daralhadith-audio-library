import { useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Button, Card, Input, Loading, ErrorBox, Spinner, Badge } from "../components/ui";
import { Save, Download, CloudUpload, RefreshCw } from "lucide-react";

export default function Settings() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbMsg, setFbMsg] = useState(null);

  const fbSync = async () => {
    setFbBusy(true);
    setFbMsg(null);
    try {
      const r = await api("/admin/firebase-sync", { method: "POST" });
      setFbMsg({ ok: true, text: `تمت المزامنة: ${r.audios} شريطاً، ${r.scholars} شيخاً، ${r.categories} تصنيفاً، ${r.series} سلسلة` });
    } catch (e2) {
      setFbMsg({ ok: false, text: e2.message });
    } finally {
      setFbBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setForm(await api("/admin"));
      } catch (e) {
        setError(e);
      }
    })();
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!form) return <Loading />;

  const set = (k, v) => {
    setOk(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setOk(false);
    try {
      const r = await api("/admin", { method: "PUT", body: form });
      setForm(r);
      setOk(true);
    } catch (e2) {
      setError(e2);
    } finally {
      setBusy(false);
    }
  };

  const backup = async () => {
    const blob = await (await fetch("/api/admin/backup", { headers: { authorization: "Bearer " + localStorage.getItem("dh_admin_token") } })).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "daralhadith-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Toggle = ({ label, k }) => (
    <label className="flex items-center justify-between gap-3 p-4 rounded-xl border border-line bg-bg2/40 cursor-pointer">
      <span className="text-sm font-bold text-ink2">{label}</span>
      <input type="checkbox" className="accent-[#f58024] w-5 h-5" checked={String(form[k]) === "1"} onChange={(e) => set(k, e.target.checked ? "1" : "0")} />
    </label>
  );

  return (
    <div>
      <PageTitle title="الإعدادات" subtitle="إعدادات التطبيق العامة" actions={
        <Button variant="outline" onClick={backup}><Download size={16} /> نسخة احتياطية</Button>
      } />

      <Card className="p-5 mb-4 max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-soft text-green flex items-center justify-center shrink-0"><CloudUpload size={20} /></div>
            <div>
              <h2 className="font-bold text-green">مزامنة Firebase</h2>
              <p className="text-xs text-ink3 font-bold">انشر المحتوى الحالي (بعد أي استيراد أو تعديل) لتظهر التغييرات في تطبيق الهاتف فوراً</p>
            </div>
          </div>
          <Button variant="gold" disabled={fbBusy} onClick={fbSync}>
            {fbBusy ? <><Spinner className="w-4 h-4 border-t-white" /> جارٍ المزامنة…</> : <><RefreshCw size={16} /> مزامنة إلى Firebase</>}
          </Button>
        </div>
        {fbMsg && (
          <div className="mt-3">
            <Badge tone={fbMsg.ok ? "green" : "danger"}>{fbMsg.ok ? "✓ " + fbMsg.text : "✗ " + fbMsg.text}</Badge>
          </div>
        )}
      </Card>

      <form onSubmit={save} className="space-y-4 max-w-3xl">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-green">المعلومات العامة</h2>
          <Input label="اسم التطبيق" value={form.app_name} onChange={(e) => set("app_name", e.target.value)} />
          <Input label="وصف التطبيق" value={form.app_description} onChange={(e) => set("app_description", e.target.value)} />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="عنوان أرشيف الإنترنت" dir="ltr" value={form.arch_base_url} onChange={(e) => set("arch_base_url", e.target.value)} />
            <Input label="المجموعة الافتراضية على الأرشيف" dir="ltr" value={form.arch_collection} onChange={(e) => set("arch_collection", e.target.value)} />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-green">عرض التطبيق</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="عدد الأشرطة في الرئيسية" type="number" value={form.home_items} onChange={(e) => set("home_items", e.target.value)} />
            <Input label="عدد العناصر في القوائم" type="number" value={form.per_page} onChange={(e) => set("per_page", e.target.value)} />
            <Input label="جودة الصوت الافتراضية" value={form.default_quality} onChange={(e) => set("default_quality", e.target.value)} />
          </div>
          <Toggle label="السماح بالتحميل للمستخدمين" k="allow_download" />
          <Toggle label="إشعار عند إضافة شريط جديد" k="notif_new_audio" />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-green">روابط التواصل</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="فيسبوك" dir="ltr" value={form.facebook || ""} onChange={(e) => set("facebook", e.target.value)} />
            <Input label="تويتر / X" dir="ltr" value={form.twitter || ""} onChange={(e) => set("twitter", e.target.value)} />
            <Input label="تيليجرام" dir="ltr" value={form.telegram || ""} onChange={(e) => set("telegram", e.target.value)} />
            <Input label="البريد الإلكتروني" dir="ltr" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
        </Card>

        <ErrorBox error={error} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy} size="lg"><Save size={18} /> {busy ? "جارٍ الحفظ…" : "حفظ الإعدادات"}</Button>
          {ok && <span className="text-sm font-bold text-green">✓ تم الحفظ</span>}
        </div>
      </form>
    </div>
  );
}
