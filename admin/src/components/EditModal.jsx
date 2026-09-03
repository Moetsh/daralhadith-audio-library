import { useEffect, useState } from "react";
import { Button, ErrorBox, Modal } from "./ui";

/* نافذة إنشاء/تعديل موحدة: تُزامن النموذج مع editing، وتُدير busy/err،
   وتُحوّل form إلى payload عبر toPayload قبل onSave.
   children: عناصر الحقول، أو دالة تُستدعى مع { form, set, setForm }. */
export function EditModal({
  editing,
  initial,
  toForm,
  toPayload,
  title,
  newTitle,
  submitLabel = "حفظ",
  width,
  onClose,
  onSave,
  children,
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm(toForm ? toForm(editing) : { ...initial, ...editing });
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onSave(toPayload ? toPayload(form, editing) : form);
    } catch (e2) {
      setErr(e2);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={editing?.id ? title : newTitle}
      onClose={onClose}
      width={width}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : submitLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={err} />
        {typeof children === "function" ? children({ form, set, setForm }) : children}
      </form>
    </Modal>
  );
}
