/* شاشة البداية — شعار + آية/حديث متغير يومياً */
import { motion } from "framer-motion";
import { dailyQuote } from "../data/library";
import { GirihBG, Logo } from "../components/ui";

export const Splash = ({ done }: { done: () => void }) => {
  const q = dailyQuote();
  return (
    <motion.div
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: "#0d1f14" }}
      onClick={done}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.5 }}
    >
      <img src="/medal.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.35]" />
      <div className="absolute inset-0" style={{ background: "rgba(13,31,20,0.55)" }} />
      <GirihBG color="#d9a13f" opacity={0.07} />
      <div className="absolute w-[560px] h-[560px] rounded-full border border-[#d9a13f22] spin-slow" />
      <div className="absolute w-[420px] h-[420px] rounded-full border border-[#d9a13f33] spin-slow" style={{ animationDirection: "reverse" }} />

      <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}>
        <Logo size={92} />
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.6 }}
        className="font-brand text-[2.1rem] text-[#f4ecd7] mt-5 leading-snug text-center px-6"
      >
        مكتبة دار الحديث
        <span className="block text-[1.15rem] text-[#d9a13f]">الصوتية</span>
      </motion.h1>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex items-center gap-3 mt-4">
        <span className="h-px w-10 bg-[#d9a13f66]" />
        <span className="w-1.5 h-1.5 rotate-45 bg-[#d9a13f]" />
        <span className="h-px w-10 bg-[#d9a13f66]" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.95, duration: 0.7 }}
        className="mt-8 px-10 text-center"
      >
        <p className={`font-quran text-[#e9d9a6] leading-loose ${q.type === "quran" ? "text-[1.25rem]" : "text-[1.05rem]"}`}>{q.text}</p>
        <p className="text-[0.72rem] text-[#d9a13f] font-bold mt-2.5">{q.src}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        onAnimationComplete={() => window.setTimeout(done, 300)}
        className="absolute bottom-8 flex flex-col items-center gap-1.5"
      >
        <span className="text-[0.66rem] text-[#8fa795] font-bold">صدقة جارية — مجاناً وبدون إعلانات</span>
        <span className="text-[0.6rem] text-[#5f7466]">المحتوى مستضاف على Internet Archive</span>
      </motion.div>
    </motion.div>
  );
};
