/* مخزن المكتبة: مفضلة، تحميلات، قوائم تشغيل، سجل، مواضع الاستماع */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Playlist { id: string; name: string; ids: string[] }
export interface DownloadRec { p: number; status: "active" | "done" | "queued" }
export interface PosRec { pos: number; dur: number; done: boolean }

const timers: Record<string, number> = {};
let toastTimer: number | undefined;

interface AppState {
  favs: string[];
  playlists: Playlist[];
  downloads: Record<string, DownloadRec>;
  history: { id: string; at: number }[];
  positions: Record<string, PosRec>;
  searches: string[];
  counts: Record<string, number>;
  toast: string | null;
  showToast: (m: string) => void;

  isFav: (id: string) => boolean;
  toggleFav: (id: string) => void;

  addPlaylist: (name: string) => string;
  delPlaylist: (id: string) => void;
  addToPlaylist: (pid: string, audioId: string) => void;
  removeFromPlaylist: (pid: string, audioId: string) => void;
  moveInPlaylist: (pid: string, from: number, to: number) => void;

  startDownload: (id: string, wifiOnly: boolean, note: string) => void;
  removeDownload: (id: string) => void;
  resumeDownloads: (note: string) => void;

  pushHistory: (id: string) => void;
  setPosition: (id: string, pos: number, dur: number, done?: boolean) => void;
  bumpCount: (id: string) => void;

  addSearch: (q: string) => void;
  clearSearches: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      favs: [],
      playlists: [
        { id: "pl-default", name: "مجلس العلم الأسبوعي", ids: [] },
      ],
      downloads: {},
      history: [],
      positions: {},
      searches: [],
      counts: {},
      toast: null,

      showToast: (m) => {
        set({ toast: m });
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => set({ toast: null }), 2200);
      },

      isFav: (id) => get().favs.includes(id),
      toggleFav: (id) =>
        set((s) => ({
          favs: s.favs.includes(id) ? s.favs.filter((x) => x !== id) : [id, ...s.favs],
        })),

      addPlaylist: (name) => {
        const id = "pl-" + Date.now().toString(36);
        set((s) => ({ playlists: [...s.playlists, { id, name, ids: [] }] }));
        return id;
      },
      delPlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
      addToPlaylist: (pid, audioId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === pid && !p.ids.includes(audioId) ? { ...p, ids: [...p.ids, audioId] } : p
          ),
        })),
      removeFromPlaylist: (pid, audioId) =>
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === pid ? { ...p, ids: p.ids.filter((x) => x !== audioId) } : p)),
        })),
      moveInPlaylist: (pid, from, to) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== pid) return p;
            const ids = [...p.ids];
            const [x] = ids.splice(from, 1);
            ids.splice(to, 0, x);
            return { ...p, ids };
          }),
        })),

      startDownload: (id, wifiOnly, note) => {
        const rec = get().downloads[id];
        if (rec && rec.status !== "done") return;
        const run = () => {
          window.clearInterval(timers[id]);
          set((s) => ({ downloads: { ...s.downloads, [id]: { p: 0, status: "active" } } }));
          timers[id] = window.setInterval(() => {
            const cur = get().downloads[id];
            if (!cur || cur.status !== "active") return window.clearInterval(timers[id]);
            const np = cur.p + 0.03 + Math.random() * 0.05;
            if (np >= 1) {
              window.clearInterval(timers[id]);
              set((s) => ({ downloads: { ...s.downloads, [id]: { p: 1, status: "done" } } }));
              get().showToast("تم التحميل — يعمل دون اتصال");
            } else {
              set((s) => ({ downloads: { ...s.downloads, [id]: { p: np, status: "active" } } }));
            }
          }, 350);
        };
        if (wifiOnly) {
          set((s) => ({ downloads: { ...s.downloads, [id]: { p: 0, status: "queued" } } }));
          get().showToast(note);
          // محاكاة وصول WiFi بعد ثوانٍ
          window.setTimeout(() => {
            const cur = get().downloads[id];
            if (cur?.status === "queued") run();
          }, 6000);
        } else run();
      },
      removeDownload: (id) => {
        window.clearInterval(timers[id]);
        set((s) => {
          const d = { ...s.downloads };
          delete d[id];
          return { downloads: d };
        });
      },
      resumeDownloads: () => {
        for (const [id, rec] of Object.entries(get().downloads)) {
          if (rec.status === "active") {
            window.clearInterval(timers[id]);
            timers[id] = window.setInterval(() => {
              const cur = get().downloads[id];
              if (!cur || cur.status !== "active") return window.clearInterval(timers[id]);
              const np = cur.p + 0.03 + Math.random() * 0.05;
              set((s) => ({ downloads: { ...s.downloads, [id]: { p: np >= 1 ? 1 : np, status: np >= 1 ? "done" : "active" } } }));
              if (np >= 1) window.clearInterval(timers[id]);
            }, 350);
          }
        }
      },

      pushHistory: (id) =>
        set((s) => ({ history: [{ id, at: Date.now() }, ...s.history.filter((h) => h.id !== id)].slice(0, 60) })),
      setPosition: (id, pos, dur, done) =>
        set((s) => ({
          positions: { ...s.positions, [id]: { pos, dur, done: done ?? s.positions[id]?.done ?? false } },
        })),
      bumpCount: (id) => set((s) => ({ counts: { ...s.counts, [id]: (s.counts[id] ?? 0) + 1 } })),

      addSearch: (q) =>
        set((s) => ({ searches: [q, ...s.searches.filter((x) => x !== q)].slice(0, 10) })),
      clearSearches: () => set({ searches: [] }),
    }),
    {
      name: "dh-app",
      partialize: (s) => ({
        favs: s.favs, playlists: s.playlists, downloads: s.downloads,
        history: s.history, positions: s.positions, searches: s.searches, counts: s.counts,
      }),
    }
  )
);
