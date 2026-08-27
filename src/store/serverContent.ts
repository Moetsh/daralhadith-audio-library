/* محتوى الخادم: أشرطة منشورة من لوحة التحكم (محفوظة على الجهاز بعد المزامنة) */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AudioItem, Category, Scholar, Series } from "../data/library";
import { fetchServerContent, toAudio, toCat, toScholar, toSeries } from "../lib/server";

interface ServerContentState {
  enabled: boolean;
  baseUrl: string;
  lastSync: number | null;
  syncing: boolean;
  error: string | null;
  lastOk: number | null;
  syncVersion: string;
  items: AudioItem[];
  cats: Category[];
  scholars: Scholar[];
  series: Series[];
  setConfig: (p: Partial<Pick<ServerContentState, "enabled" | "baseUrl">>) => void;
  sync: () => Promise<{ ok: boolean; added?: number; message?: string }>;
  clearError: () => void;
}

const VERSION_API = "https://daralhadith.vercel.app/api/version";

export const useServerContent = create<ServerContentState>()(
  persist(
    (set, get) => ({
      enabled: true,
      baseUrl: "",
      lastSync: null,
      syncing: false,
      error: null,
      lastOk: null,
      syncVersion: "",
      items: [],
      cats: [],
      scholars: [],
      series: [],
      setConfig: (p) => set(p),
      clearError: () => set({ error: null }),
      sync: async () => {
        if (get().syncing) return { ok: true, added: 0 };
        set({ syncing: true, error: null });
        try {
          const data = await fetchServerContent();
          const items = data.audios.map(toAudio);
          const now = Date.now();
          /* جلب sync_version من الخادم وتخزينه محلياً */
          let remoteSync = "";
          try {
            const vr = await fetch(`${VERSION_API}?_t=${Date.now()}`, { cache: "no-store" as RequestCache });
            if (vr.ok) { const vd = await vr.json(); remoteSync = String(vd.sync_version || ""); }
          } catch {}
          set({
            items,
            cats: data.cats.map(toCat),
            scholars: data.scholars.map(toScholar),
            series: data.series.map(toSeries),
            lastSync: now,
            lastOk: now,
            syncing: false,
            syncVersion: remoteSync || "1.16",
          });
          return { ok: true, added: items.length };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "تعذّر الاتصال بالخادم";
          set({ syncing: false, error: msg });
          return { ok: false, message: msg };
        }
      },
    }),
    {
      name: "dh-server-content",
      partialize: (s) => ({
        enabled: s.enabled,
        baseUrl: s.baseUrl,
        lastSync: s.lastSync,
        syncVersion: s.syncVersion,
        items: s.items,
        cats: s.cats,
        scholars: s.scholars,
        series: s.series,
      }),
    }
  )
);

/* تزامن تلقائي: يتحقق عند كل تغيير في الـ visibility + عند فتح الصفحة */
if (typeof window !== "undefined") {
  const trySync = async () => {
    const s = useServerContent.getState();
    if (!s.enabled || s.syncing) return;
    /* قراءة sync_version من الخادم المنشور */
    let remoteSync = "";
    try {
      const vr = await fetch(`${VERSION_API}?_t=${Date.now()}`, { cache: "no-store" as RequestCache });
      if (vr.ok) { const vd = await vr.json(); remoteSync = String(vd.sync_version || ""); }
    } catch {}
    /* إذا اختلف الإصدار → تحديث فوري */
    if (remoteSync && remoteSync !== s.syncVersion) {
      s.sync();
      return;
    }
    /* إذا مرّت ساعة منذ آخر مزامنة → حدّث */
    if (!s.lastSync || Date.now() - s.lastSync > 3600_000) {
      s.sync();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trySync();
  });
  window.addEventListener("focus", trySync);
  /* تشغيل فوري عند تحميل الصفحة */
  setTimeout(trySync, 1000);
}
