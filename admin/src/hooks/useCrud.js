import { useState } from "react";
import { api } from "../api";

/* آلة حالة CRUD الموحدة لصفحات الإدارة:
   editing/confirmDel + save (POST أو PUT حسب وجود id) + remove (DELETE).
   base: مسار المورد (مثال "/scholars"). reload: إعادة تحميل القائمة بعد الحفظ/الحذف. */
export function useCrud(base, { reload } = {}) {
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const save = async (payload) => {
    if (editing?.id) await api(base + "/" + editing.id, { method: "PUT", body: payload });
    else await api(base, { method: "POST", body: payload });
    setEditing(null);
    await reload?.();
  };

  const remove = async () => {
    await api(base + "/" + confirmDel.id, { method: "DELETE" });
    setConfirmDel(null);
    await reload?.();
  };

  return { editing, setEditing, confirmDel, setConfirmDel, save, remove };
}
