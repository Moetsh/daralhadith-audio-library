import { useState } from "react";
import { useList } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Badge, ListCard, fmtTime } from "../components/ui";
import { RefreshCw, Bug } from "lucide-react";

export default function Crashes() {
  const { rows, loading, error, reload } = useList(() => api("/admin/client-errors"));
  const [open, setOpen] = useState(null);

  return (
    <div>
      <PageTitle
        title="تقارير الأعطال"
        subtitle="أخطاء التطبيق المرسلة تلقائياً من الأجهزة (آخر 50)"
        actions={
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
          </Button>
        }
      />
      <ListCard loading={loading} error={error} empty={rows.length === 0} emptyText="لا توجد تقارير أعطال">
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.id} className="p-4">
              <button onClick={() => r.stack && setOpen(open === r.id ? null : r.id)} className="w-full text-start" disabled={!r.stack}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-9 h-9 rounded-xl bg-red-50 text-danger flex items-center justify-center shrink-0">
                    <Bug size={16} />
                  </span>
                  <span className="font-bold text-sm flex-1 min-w-0 truncate" dir="ltr">{r.message || "؟"}</span>
                  <Badge tone="gold">{r.appVersion || "؟"}</Badge>
                  <Badge tone="gray">{r.route || "؟"}</Badge>
                  <span className="text-xs text-ink3 shrink-0">{fmtTime(r.created_at)}</span>
                </div>
              </button>
              {open === r.id && r.stack && (
                <pre dir="ltr" className="mt-3 text-[11px] leading-relaxed bg-bg2/60 border border-line rounded-xl p-3 overflow-x-auto text-left whitespace-pre-wrap">
                  {r.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ListCard>
    </div>
  );
}
