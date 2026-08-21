/* محتوى المستخدم: سلاسل أضافها من Internet Archive (محفوظة على الجهاز) */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AudioItem } from "../data/library";

export interface UserSeries {
  id: string;
  title: string;
  scholarName: string;
  categoryId: string;
  identifier: string;
  url: string;
  desc: string;
  createdAt: number;
}

export const scholarIdOfSeries = (id: string) => "usrsch-" + id;

export type DraftTrack = Omit<AudioItem, "id" | "scholarId" | "seriesId" | "episode">;

interface UserContentState {
  series: UserSeries[];
  tracks: Record<string, AudioItem[]>;
  addSeries: (s: { title: string; scholarName: string; categoryId: string; identifier: string; url: string; desc: string }, draft: DraftTrack[]) => string;
  removeSeries: (id: string) => void;
  findTrack: (id: string) => AudioItem | undefined;
  tracksOf: (id: string) => AudioItem[];
  asSeries: (id: string) => (UserSeries & { scholarId: string }) | undefined;
}

const genId = () => "usr-" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);

export const useUserContent = create<UserContentState>()(
  persist(
    (set, get) => ({
      series: [],
      tracks: {},
      addSeries: (s, draft) => {
        const id = genId();
        const scholarId = scholarIdOfSeries(id);
        const tracks: AudioItem[] = draft.map((t, i) => ({
          ...t,
          id: `${id}::${i}`,
          scholarId,
          seriesId: id,
          episode: i + 1,
        }));
        set((st) => ({
          series: [...st.series, { ...s, id, createdAt: Date.now() }],
          tracks: { ...st.tracks, [id]: tracks },
        }));
        return id;
      },
      removeSeries: (id) =>
        set((st) => {
          const t = { ...st.tracks };
          delete t[id];
          return { series: st.series.filter((x) => x.id !== id), tracks: t };
        }),
      findTrack: (id) => {
        const sid = id.split("::")[0];
        return get().tracks[sid]?.find((t) => t.id === id);
      },
      tracksOf: (id) => get().tracks[id] ?? [],
      asSeries: (id) => {
        const s = get().series.find((x) => x.id === id);
        return s ? { ...s, scholarId: scholarIdOfSeries(id) } : undefined;
      },
    }),
    { name: "dh-user-content" }
  )
);
