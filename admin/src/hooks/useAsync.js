import { useCallback, useEffect, useState } from "react";

/* جلب غير متزامن عام: loading/error/data + إعادة التحميل.
   fetcher: دالة تُرجع Promise بالبيانات. deps: تبعيات إعادة الجلب. */
export function useAsync(fetcher, initial = null, deps = []) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcher());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, setError, reload: load };
}

/* نسخة القوائم: تفترض أن الجالب يُرجع مصفوفة (أو مغلف {items} مرقّم).
   تُرجع rows بدل data لتوافق التسمية المعتادة في الصفحات. */
export function useList(fetcher, deps = []) {
  const r = useAsync(async () => {
    const d = await fetcher();
    return Array.isArray(d) ? d : d.items ?? [];
  }, [], deps);
  return { rows: r.data, setRows: r.setData, loading: r.loading, error: r.error, setError: r.setError, reload: r.reload };
}
