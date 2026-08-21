/* مخازن الأساس: الإعدادات + التنقل */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STR, type Lang, type Strings } from "../lib/utils";

export type Theme = "light" | "dark" | "auto";
export type Quality = "high" | "med" | "low";

interface SettingsState {
  theme: Theme;
  lang: Lang;
  fsize: 0 | 1 | 2;
  wifiOnly: boolean;
  quality: Quality;
  defSpeed: number;
  defSleep: number; // دقائق، 0 = بلا
  notif: boolean;
  set: (p: Partial<SettingsState>) => void;
  t: Strings;
}
export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      lang: "ar",
      fsize: 1,
      wifiOnly: false,
      quality: "high",
      defSpeed: 1,
      defSleep: 0,
      notif: true,
      set: (p) => set(p),
      get t() {
        return STR[get().lang] as Strings;
      },
    }),
    {
      name: "dh-settings",
      partialize: (s) => ({
        theme: s.theme, lang: s.lang, fsize: s.fsize, wifiOnly: s.wifiOnly,
        quality: s.quality, defSpeed: s.defSpeed, defSleep: s.defSleep, notif: s.notif,
      }),
    }
  )
);

/* ── التنقل (مكدس شاشات على طريقة الموبايل) ── */
export type Route =
  | { name: "home" }
  | { name: "cats" }
  | { name: "cat"; id: string }
  | { name: "series" }
  | { name: "search" }
  | { name: "detail"; id: string }
  | { name: "scholar"; id: string }
  | { name: "library"; tab?: number }
  | { name: "playlist"; id: string }
  | { name: "add-series" }
  | { name: "user-series"; id: string }
  | { name: "settings" };

interface NavState {
  stack: Route[];
  act: "push" | "pop" | "tab";
  push: (r: Route) => void;
  pop: () => void;
  tab: (r: Route) => void;
  top: () => Route;
}
export const useNav = create<NavState>((set, get) => ({
  stack: [{ name: "home" }],
  act: "tab",
  push: (r) => set({ stack: [...get().stack, r], act: "push" }),
  pop: () => {
    const s = get().stack;
    if (s.length > 1) set({ stack: s.slice(0, -1), act: "pop" });
  },
  tab: (r) => set({ stack: [r], act: "tab" }),
  top: () => get().stack[get().stack.length - 1],
}));
