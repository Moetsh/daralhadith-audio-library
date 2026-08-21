import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { PageTitle, Card, Loading, Empty, ErrorBox } from "../components/ui";
import { History } from "lucide-react";

const ACTIONS = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  "bulk-import": "استيراد جماعي",
  backup: "نسخ احتياطي",
  "change-password": "تغيير كلمة مرور",
  ban: "حظر",
  login: "تسجيل دخول",
};

const ENTITIES = { audio: "شريط", category: "تصنيف", scholar: "شيخ", series: "سلسلة", user: "مستخدم", announcement: "تنبيه", settings: "إعدادات" };

export default function Activity() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api("/admin/activity"));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageTitle title="سجل النشاط" subtitle="آخر إجراءات المشرفين (200 إجراء)" />
      <Card>
        {error && <ErrorBox error={error} />}
        {loading ? <Loading /> : rows.length === 0 ? <Empty /> : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-green-soft text-green flex items-center justify-center shrink-0 mt-0.5">
                  <History size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-bold">{r.admin_name || "مشرف"}</span>
                    <span className="text-ink3">{ACTIONS[r.action] || r.action}</span>
                    {r.entity_type && <span className="text-ink3">— {ENTITIES[r.entity_type] || r.entity_type}</span>}
                  </div>
                  {r.details && <div className="text-sm text-ink2 mt-0.5">{r.details}</div>}
                </div>
                <span className="text-xs text-ink3 shrink-0">{r.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
