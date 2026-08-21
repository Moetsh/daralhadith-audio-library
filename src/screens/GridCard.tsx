/* بطاقة عرض الشبكة — تصميم محسّن */
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { AudioItem } from "../data/library";
import { catById, scholarById } from "../data/library";
import { fmtDur } from "../lib/utils";
import { useNav, useSettings } from "../store/core";
import { usePlayer } from "../store/player";
import { Cover, FavBtn } from "../components/ui";

export const GridCard = ({ item }: { item: AudioItem }) => {
  const nav = useNav();
  const play = usePlayer((s) => s.playItem);
  const lang = useSettings((s) => s.lang);
  const sch = scholarById(item.scholarId);
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="surface bline border rounded-2xl p-2.5 cursor-pointer shadow-card hover:shadow-lg transition-shadow duration-200 group"
      onClick={() => nav.push({ name: "detail", id: item.id })}
    >
      <div className="relative rounded-xl overflow-hidden">
        <Cover catId={item.categoryId} icon={catById(item.categoryId)?.icon} size={400} radius={14} src={item.cover} title={item.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <button
          aria-label="play"
          className="absolute bottom-2 start-2 w-9 h-9 rounded-full bg-gold text-[#231a05] flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
          onClick={(e) => { e.stopPropagation(); play(item.id); }}
        >
          <Play size={14} fill="currentColor" className="translate-x-[1px]" />
        </button>
        <span className="absolute top-2 start-2">
          <FavBtn id={item.id} size={28} />
        </span>
      </div>
      <div className="mt-2 font-bold text-[0.8rem] ink leading-snug line-clamp-2 min-h-[2.1em]">{item.title}</div>
      <div className="ink-3 text-[0.66rem] font-bold mt-0.5 truncate">{sch.name} · {fmtDur(item.duration, lang)}</div>
    </motion.div>
  );
};
