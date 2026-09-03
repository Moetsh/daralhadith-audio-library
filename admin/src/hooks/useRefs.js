import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

/* البيانات المرجعية المشتركة (العلماء/التصنيفات/السلاسل) مع تخزين مؤقت
   على مستوى الوحدة — تُجلب مرة واحدة وتُشارك بين الصفحات بدل ٣ طلبات
   مكررة في Audios وSeries وImport. reload() تُبطل الكاش وتُعيد الجلب. */
let cache = null;

export function useRefs() {
  const [refs, setRefs] = useState(cache || { scholars: [], categories: [], series: [] });
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (cache) {
      setRefs(cache);
      return cache;
    }
    setLoading(true);
    try {
      const [scholars, categories, series] = await Promise.all([
        api("/scholars"),
        api("/categories"),
        api("/series"),
      ]);
      cache = { scholars, categories, series };
      setRefs(cache);
      setError(null);
      return cache;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const reload = useCallback(async () => {
    cache = null;
    return load();
  }, [load]);

  return { ...refs, loading, error, reload };
}

export function bustRefsCache() {
  cache = null;
}
