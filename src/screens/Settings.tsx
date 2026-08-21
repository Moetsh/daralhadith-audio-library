/* شاشة الإعدادات */
import {
  ArrowDownToLine, Bell, Download, Gauge, Languages, Moon, Music2, RefreshCw, Sparkles, Sun, SunMoon, Timer, Type, Upload, Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ar } from "../lib/utils";
import { useUpdateChecker } from "../lib/useUpdateChecker";
import { useSettings, type Theme } from "../store/core";
import { useServerContent } from "../store/serverContent";
import { GirihBG, Logo } from "../components/ui";

/* صف إعداد */
const Row = ({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) => (
  <div className="flex items-center gap-3.5 px-4 py-3.5">
    <span className="w-10 h-10 rounded-2xl soft-green c-green flex items-center justify-center shrink-0"><Icon size={17} /></span>
    <div className="flex-1 min-w-0">
      <div className="font-extrabold ink text-[0.84rem]">{title}</div>
      {hint && <div className="ink-3 text-[0.68rem] font-bold mt-0.5 leading-relaxed">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Card = ({ children }: { children: ReactNode }) => (
  <div className="surface bline border rounded-3xl shadow-card divide-y overflow-hidden" style={{ borderColor: "var(--line)" }}>
    {children}
  </div>
);

const Seg = <T extends string | number>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) => (
  <div className="surface-2 bline border rounded-full p-0.5 flex max-w-[180px] overflow-x-auto no-bar">
    {opts.map(([v, l]) => (
      <button key={String(v)} onClick={() => onChange(v)}
        className={`h-7 px-3 rounded-full text-[0.68rem] font-extrabold whitespace-nowrap shrink-0 transition ${value === v ? "bg-green text-[#f4ecd7]" : "ink-3"}`}>
        {l}
      </button>
    ))}
  </div>
);

const Switch = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
    className={`w-11 h-[26px] rounded-full relative transition-colors ${on ? "bg-green" : "surface-2 bline border"}`}>
    <span
      className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all"
      style={{ insetInlineStart: on ? "calc(100% - 23px)" : "3px", background: on ? "#ffffff" : "var(--ink-3)" }}
    />
  </button>
);

const SyncCard = () => {
  const t = useSettings((s) => s.t);
  const sc = useServerContent();
  const [msg, setMsg] = useState<string | null>(null);

  const doSync = async () => {
    setMsg(null);
    const r = await sc.sync();
    setMsg(r.ok ? t.syncDone : r.message || t.syncFail);
  };

  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : t.syncNever;

  return (
    <Card>
      <Row icon={RefreshCw} title={t.serverSync} hint={t.serverSyncH}>
        <Switch on={sc.enabled} onChange={(v) => sc.setConfig({ enabled: v })} />
      </Row>
      <div className="px-4 pb-4 pt-1 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={doSync}
            disabled={sc.syncing}
            className="h-9 px-4 rounded-full bg-green text-[#f4ecd7] text-[0.72rem] font-extrabold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={sc.syncing ? "animate-spin" : ""} />
            {sc.syncing ? t.syncing : t.syncNow}
          </button>
          <span className="text-[0.62rem] font-bold ink-3">
            {t.lastSync}: {fmt(sc.lastSync)}
          </span>
        </div>
        <div className={`text-[0.66rem] font-bold ${sc.error ? "c-danger" : "c-green"}`}>
          {sc.error ? t.syncFail : msg || (sc.enabled ? t.syncOn : t.syncOff)}
        </div>
      </div>
    </Card>
  );
};

const CURRENT_VERSION = "1.21";

const UpdateCard = () => {
  const t = useSettings((s) => s.t);
  const u = useUpdateChecker(CURRENT_VERSION);

  if (!u.isAndroid) return null;

  return (
    <Card>
      <Row icon={Upload} title={u.hasUpdate ? `${t.updateAvailable} — ${u.latestVersion}` : t.updateH}
        hint={u.hasUpdate ? u.releaseNotes : undefined}>
        {u.hasUpdate ? (
          <span className="w-2 h-2 rounded-full bg-[#e07a22] animate-pulse" />
        ) : (
          <span className="text-[0.6rem] font-bold c-green">{t.ver} {CURRENT_VERSION}</span>
        )}
      </Row>
      <div className="px-4 pb-4 pt-1 space-y-2.5">
        {u.downloading && (
          <div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
            <div className="h-full bg-[#e07a22] rounded-full transition-all duration-300"
              style={{ width: `${Math.round(u.progress * 100)}%` }} />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {u.hasUpdate ? (
            <button
              onClick={() => u.apkUrl && u.downloadAndInstall(u.apkUrl)}
              disabled={u.downloading}
              className="h-9 px-4 rounded-full bg-[#e07a22] text-white text-[0.72rem] font-extrabold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50"
            >
              {u.downloading ? (
                <><RefreshCw size={13} className="animate-spin" /> {t.downloading} {Math.round(u.progress * 100)}٪</>
              ) : (
                <><ArrowDownToLine size={13} /> {t.updateNow}</>
              )}
            </button>
          ) : (
            <button
              onClick={u.checkForUpdate}
              disabled={u.checking}
              className="h-9 px-4 rounded-full surface bline border text-[0.72rem] font-extrabold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={u.checking ? "animate-spin" : ""} />
              {u.checking ? t.checking : t.checkUpdate}
            </button>
          )}
        </div>
        {u.done && <div className="text-[0.66rem] font-bold c-green">{t.installHint || "تم فتح صفحة التحميل. ثبّت الـ APK بعد الانتهاء."}</div>}
        {u.error && <div className="text-[0.66rem] font-bold c-danger">{u.error}</div>}
        {!u.hasUpdate && !u.checking && !u.error && (
          <div className="text-[0.66rem] font-bold ink-3">{t.latestVer}</div>
        )}
      </div>
    </Card>
  );
};

export const SettingsScreen = () => {
  const s = useSettings();
  const t = s.t;
  const set = s.set;

  return (
    <div className="h-full overflow-y-auto no-bar bg-app relative">
      <GirihBG opacity={0.025} />
      <div className="relative px-4 pt-5 pb-[130px] max-w-lg mx-auto">
        <h1 className="font-brand text-[1.4rem] ink">{t.settings}</h1>

        <div className="space-y-4 mt-5">
          <Card>
            <Row icon={SunMoon} title={t.appearance}>
              <Seg<Theme> value={s.theme} onChange={(v) => set({ theme: v })}
                opts={[["light", t.light], ["dark", t.dark], ["auto", t.auto]]} />
            </Row>
            <Row icon={Languages} title={t.language}>
              <Seg value={s.lang} onChange={(v) => set({ lang: v as any })} opts={[["ar", "العربية"], ["en", "English"]]} />
            </Row>
            <Row icon={Type} title={t.fontSize}>
              <Seg<number> value={s.fsize} onChange={(v) => set({ fsize: v as 0 | 1 | 2 })}
                opts={[[0, t.small], [1, t.medium], [2, t.large]]} />
            </Row>
          </Card>

          <div>
            <div className="ink-3 text-[0.68rem] font-black mb-2 px-1 flex items-center gap-1.5"><Music2 size={12} className="c-gold" /> {t.audioQ}</div>
            <Card>
              <Row icon={Music2} title={t.audioQ}>
                <Seg value={s.quality} onChange={(v) => set({ quality: v as any })} opts={[["high", t.high], ["med", t.med], ["low", t.low]]} />
              </Row>
              <Row icon={Gauge} title={t.defSpeed}>
                <Seg<number> value={s.defSpeed} onChange={(v) => set({ defSpeed: v })}
                  opts={[[0.75, "0.75×"], [1, "1×"], [1.25, "1.25×"], [1.5, "1.5×"], [2, "2×"]]} />
              </Row>
              <Row icon={Timer} title={t.defSleep}>
                <Seg<number> value={s.defSleep} onChange={(v) => set({ defSleep: v })}
                  opts={[[0, t.sleepOff], [15, `${ar(15)}${s.lang === "ar" ? "د" : "m"}`], [30, `${ar(30)}${s.lang === "ar" ? "د" : "m"}`], [60, `${ar(60)}${s.lang === "ar" ? "د" : "m"}`]]} />
              </Row>
            </Card>
          </div>

          <Card>
            <Row icon={Wifi} title={t.wifiOnly} hint={t.wifiNote}>
              <Switch on={s.wifiOnly} onChange={(v) => set({ wifiOnly: v })} />
            </Row>
            <Row icon={Bell} title={t.notif} hint={t.notifH}>
              <Switch on={s.notif} onChange={(v) => set({ notif: v })} />
            </Row>
          </Card>

          <SyncCard />

          <UpdateCard />

          {/* عن التطبيق */}
          <div className="rounded-3xl overflow-hidden relative border border-[#d9a13f44]" >
            <div className="absolute inset-0" style={{ background: "#e07a22" }} />
            <div className="absolute inset-0 girih opacity-[0.1]" style={{ color: "#e9d9a6" }} />
            <div className="relative p-5 flex flex-col items-center text-center">
              <Logo size={54} />
              <h2 className="font-brand text-[1.05rem] text-[#f4ecd7] mt-3">{t.appName}</h2>
              <p className="text-[#c3cdbf] text-[0.74rem] leading-loose mt-2.5">{t.aboutTxt}</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-[0.64rem] font-black text-[#e9d9a6] border border-[#d9a13f55] rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Sparkles size={11} /> {s.lang === "ar" ? "عمل خيري — بلا إعلانات" : "Charity — No ads"}
                </span>
                <span className="text-[0.64rem] font-black text-[#8fa795] border border-[#ffffff22] rounded-full px-3 py-1">
                  {t.ver} {CURRENT_VERSION} · Android 15
                </span>
              </div>
              <div className="flex items-center gap-3 mt-4 text-[#d9a13f]">
                <Moon size={13} /><Sun size={13} /><Download size={13} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
