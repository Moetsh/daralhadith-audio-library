import { useList } from "../hooks";
import { api } from "../api";
import { PageTitle, Button, Badge, Table, ListCard } from "../components/ui";
import { Ban, CheckCircle2 } from "lucide-react";

export default function Users() {
  const { rows, loading, error, reload } = useList(() => api("/admin/users"));

  const toggleBan = async (u) => {
    await api("/admin/users/" + u.id + "/ban", { method: "PUT", body: { ban: !u.is_banned } });
    reload();
  };

  return (
    <div>
      <PageTitle title="المستخدمون" subtitle="حسابات مستخدمي التطبيق" />
      <ListCard loading={loading} error={error} empty={rows.length === 0}>
        <Table head={["الاسم", "البريد", "الدور", "تاريخ التسجيل", "آخر دخول", "الحالة", ""]}>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-line last:border-0 hover:bg-bg2/40">
              <td className="px-4 py-3 font-bold">{u.name}</td>
              <td className="px-4 py-3 text-ink2" dir="ltr">{u.email}</td>
              <td className="px-4 py-3">{u.role === "admin" ? <Badge tone="gold">مشرف</Badge> : <Badge tone="green">مستخدم</Badge>}</td>
              <td className="px-4 py-3 text-ink2 text-xs">{u.created_at}</td>
              <td className="px-4 py-3 text-ink2 text-xs">{u.last_login_at || "—"}</td>
              <td className="px-4 py-3">{u.is_banned ? <Badge tone="danger">محظور</Badge> : <Badge tone="green">نشط</Badge>}</td>
              <td className="px-4 py-3">
                {u.role !== "admin" && (
                  <Button size="sm" variant={u.is_banned ? "outline" : "danger"} onClick={() => toggleBan(u)}>
                    {u.is_banned ? <><CheckCircle2 size={14} /> إلغاء الحظر</> : <><Ban size={14} /> حظر</>}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>
    </div>
  );
}
