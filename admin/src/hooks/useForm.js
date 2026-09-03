import { useCallback, useState } from "react";

/* حالة نموذج موحدة: form + set(k,v) + setForm + reset. */
export function useForm(initial) {
  const [form, setForm] = useState(initial);
  const set = useCallback((k, v) => setForm((f) => ({ ...f, [k]: v })), []);
  const reset = useCallback((next) => setForm(next ?? initial), [initial]);
  return { form, setForm, set, reset };
}
