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
  sync: (remoteVersion?: string) => Promise<{ ok: boolean; added?: number; message?: string }>;
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
      sync: async (remoteVersion) => {
        if (get().syncing) return { ok: true, added: 0 };
        set({ syncing: true, error: null });
        try {
          /* نعرف رقم المزامنة أولاً لاستخدامه ككاسرٍ لكاش الحزمة (وإلا قد نستلم حزمة قديمة ونحفظ الإصدار الجديد) */
          let remoteSync = String(remoteVersion || "");
          if (!remoteSync) {
            try {
              const vr = await fetch(`${VERSION_API}?_t=${Date.now()}`, { cache: "no-store" as RequestCache });
              if (vr.ok) { const vd = await vr.json(); remoteSync = String(vd.sync_version || ""); }
            } catch {}
          }
          const data = await fetchServerContent(remoteSync);
          const items = data.audios.map(toAudio);
          const now = Date.now();
          set({
            items,
            cats: data.cats.map(toCat),
            scholars: data.scholars.map(toScholar),
            series: data.series.map(toSeries),
            lastSync: now,
            lastOk: now,
            syncing: false,
            syncVersion: remoteSync || get().syncVersion || "1.16",
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

/* مزامنة خفيفة: يتحقق من sync_version ثم يزامن فقط عند تغيّره أو مرور ساعة */
let lastCheck = 0;
export async function syncIfNeeded(force = false): Promise<void> {
  const s = useServerContent.getState();
  if (!s.enabled || s.syncing) return;
  /* لا تُكرّر الطلب عند التنقل السريع */
  if (!force && Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  /* قراءة sync_version من الخادم المنشور (طلب صغير جداً) */
  let remoteSync = "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const vr = await fetch(`${VERSION_API}?_t=${Date.now()}`, { cache: "no-store" as RequestCache, signal: ctrl.signal });
    clearTimeout(timer);
    if (vr.ok) { const vd = await vr.json(); remoteSync = String(vd.sync_version || ""); }
  } catch {}
  /* إذا اختلف الإصدار → تحديث فوري */
  if (remoteSync && remoteSync !== s.syncVersion) {
    s.sync(remoteSync);
    return;
  }
  /* إذا مرّت ساعة منذ آخر مزامنة → حدّث */
  if (!s.lastSync || Date.now() - s.lastSync > 3600_000) {
    s.sync(remoteSync);
  }
}

/* تزامن تلقائي عند عودة التطبيق للمقدمة (visibilitychange/focus) */
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncIfNeeded();
  });
  window.addEventListener("focus", () => { syncIfNeeded(); });
}
