import { useEffect, useState } from "react";
import { Button, ErrorBox, Modal } from "./ui";

/* نافذة تأكيد الحذف الموحدة مع busy/err داخليين.
   onConfirm: دالة الحذف (تُغلق النافذة بنفسها عند النجاح). */
export function ConfirmDelete({
  item,
  message,
  title = "تأكيد الحذف",
  confirmLabel = "حذف",
  onClose,
  onConfirm,
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (item) {
      setErr(null);
      setBusy(false);
    }
  }, [item]);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(item);
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!item}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={run} disabled={busy}>
            {busy ? "جارٍ الحذف…" : confirmLabel}
          </Button>
        </>
      }
    >
      <ErrorBox error={err} />
      <p className="text-sm text-ink2">{message}</p>
    </Modal>
  );
}
