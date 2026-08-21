/* محرك المشغل الصوتي — ExoPlayer (محاكاة ويب بعنصر Audio + MediaSession) */
import { create } from "zustand";
import { itemById, scholarById } from "../data/library";
import { useApp } from "./appStore";
import { useSettings } from "./core";

const audio = new Audio();
audio.preload = "auto";

type Status = "idle" | "loading" | "playing" | "paused" | "error";
export type SleepMode = "min" | "track" | null;

interface PlayerState {
  currentId: string | null;
  queue: string[];
  qIndex: number;
  status: Status;
  position: number;
  duration: number;
  speed: number;
  sleepMode: SleepMode;
  sleepAt: number | null;
  sheetOpen: boolean;
  usedAlt: boolean;

  playItem: (id: string, queueIds?: string[]) => void;
  toggle: () => void;
  seekTo: (s: number) => void;
  seekBy: (d: number) => void;
  setSpeed: (v: number) => void;
  next: () => void;
  prev: () => void;
  setSleep: (mode: SleepMode, minutes?: number) => void;
  setSheet: (v: boolean) => void;
}

let lastSave = 0;
let triedAlt = false;
let bumpId: string | null = null;

const setMediaSession = (id: string | null, playing: boolean) => {
  if (!("mediaSession" in navigator) || !id) return;
  const it = itemById(id);
  if (!it) return;
  try {
    navigator.mediaSession.metadata = new (window as any).MediaMetadata({
      title: it.title,
      artist: scholarById(it.scholarId).name,
      album: "مكتبة دار الحديث الصوتية",
      artwork: [
        { src: "/medal.jpg", sizes: "512x512", type: "image/jpeg" },
        { src: "/hero.jpg", sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  } catch { /* noop */ }
};

const savePosition = () => {
  const st = usePlayer.getState();
  if (!st.currentId || !st.duration) return;
  useApp.getState().setPosition(st.currentId, st.position, st.duration);
};

export const usePlayer = create<PlayerState>((set, get) => {
  /* ربط أحداث عنصر الصوت */
  audio.addEventListener("loadedmetadata", () => {
    const st = get();
    const dur = audio.duration || 0;
    set({ duration: dur });
    // استئناف من آخر موضع
    if (st.currentId) {
      const rec = useApp.getState().positions[st.currentId];
      if (rec && !rec.done && rec.pos > 8 && rec.pos < dur - 20) {
        audio.currentTime = rec.pos;
        set({ position: rec.pos });
      }
    }
  });
  audio.addEventListener("timeupdate", () => {
    set({ position: audio.currentTime });
    const now = Date.now();
    if (now - lastSave > 4000 && audio.currentTime > 1) {
      lastSave = now;
      savePosition();
    }
  });
  audio.addEventListener("playing", () => {
    set({ status: "playing" });
    setMediaSession(get().currentId, true);
  });
  audio.addEventListener("pause", () => {
    if (get().status !== "loading") set({ status: "paused" });
    savePosition();
    setMediaSession(get().currentId, false);
  });
  audio.addEventListener("ended", () => {
    const st = get();
    if (st.currentId) {
      useApp.getState().setPosition(st.currentId, st.duration, st.duration, true);
    }
    if (st.sleepMode === "track") {
      set({ sleepMode: null, sleepAt: null, status: "paused" });
      useApp.getState().showToast("توقف التشغيل بنهاية الشريط");
      return;
    }
    get().next();
  });
  audio.addEventListener("error", () => {
    const st = get();
    if (!st.currentId) return;
    const it = itemById(st.currentId);
    if (!it) return;
    if (!triedAlt && it.streamAlt) {
      triedAlt = true;
      audio.src = it.streamAlt;
      set({ usedAlt: true });
      audio.play().catch(() => set({ status: "error" }));
    } else {
      set({ status: "error" });
    }
  });
  audio.addEventListener("waiting", () => {
    if (get().status === "playing") set({ status: "loading" });
  });

  /* مؤقت النوم */
  window.setInterval(() => {
    const st = get();
    if (st.sleepMode === "min" && st.sleepAt && Date.now() >= st.sleepAt) {
      audio.pause();
      set({ sleepMode: null, sleepAt: null });
      useApp.getState().showToast("توقف التشغيل — مؤقت النوم");
    }
  }, 3000);

  return {
    currentId: null,
    queue: [],
    qIndex: 0,
    status: "idle",
    position: 0,
    duration: 0,
    speed: 1,
    sleepMode: null,
    sleepAt: null,
    sheetOpen: false,
    usedAlt: false,

    playItem: (id, queueIds) => {
      const st = get();
      if (id === st.currentId) return st.toggle();
      const it = itemById(id);
      if (!it) return;
      const queue = queueIds?.length ? queueIds : [id];
      const idx = Math.max(0, queue.indexOf(id));
      triedAlt = false;
      bumpId = id === bumpId ? bumpId : id; // عدّ استماع واحد لكل حمولة
      if (bumpId === id) useApp.getState().bumpCount(id);
      useApp.getState().pushHistory(id);
      audio.playbackRate = useSettings.getState().defSpeed || get().speed || 1;
      audio.src = it.streamUrl;
      set({
        currentId: id, queue, qIndex: idx, status: "loading",
        position: 0, duration: it.duration, usedAlt: false,
      });
      audio.play().catch(() => set({ status: "error" }));
      setMediaSession(id, true);
    },

    toggle: () => {
      const st = get();
      if (!st.currentId) return;
      if (st.status === "playing") audio.pause();
      else if (st.status === "paused" || st.status === "error") {
        audio.play().catch(() => set({ status: "error" }));
      }
    },

    seekTo: (s) => {
      if (!get().currentId) return;
      audio.currentTime = Math.max(0, Math.min(s, get().duration || s));
      set({ position: audio.currentTime });
      savePosition();
    },
    seekBy: (d) => get().seekTo(audio.currentTime + d),

    setSpeed: (v) => {
      audio.playbackRate = v;
      set({ speed: v });
    },

    next: () => {
      const st = get();
      if (st.qIndex < st.queue.length - 1) {
        get().playItem(st.queue[st.qIndex + 1], st.queue);
      } else if (st.queue.length) {
        // نهاية القائمة: أعد للبداية متوقفاً
        get().playItem(st.queue[0], st.queue);
        window.setTimeout(() => audio.pause(), 600);
      }
    },
    prev: () => {
      const st = get();
      if (audio.currentTime > 5) return get().seekTo(0);
      if (st.qIndex > 0) get().playItem(st.queue[st.qIndex - 1], st.queue);
      else get().seekTo(0);
    },

    setSleep: (mode, minutes) => {
      if (!mode) return set({ sleepMode: null, sleepAt: null });
      if (mode === "track") return set({ sleepMode: "track", sleepAt: null });
      set({ sleepMode: "min", sleepAt: Date.now() + (minutes ?? 30) * 60000 });
    },

    setSheet: (v) => set({ sheetOpen: v }),
  };
});

/* أزرار شاشة القفل */
if ("mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("play", () => usePlayer.getState().toggle());
    navigator.mediaSession.setActionHandler("pause", () => usePlayer.getState().toggle());
    navigator.mediaSession.setActionHandler("previoustrack", () => usePlayer.getState().prev());
    navigator.mediaSession.setActionHandler("nexttrack", () => usePlayer.getState().next());
    navigator.mediaSession.setActionHandler("seekbackward", () => usePlayer.getState().seekBy(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => usePlayer.getState().seekBy(15));
  } catch { /* noop */ }
}
