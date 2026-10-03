import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

const API_BASE = "https://daralhadith.vercel.app";

interface VersionInfo {
  version: string;
  apk_url: string;
  release_notes?: string;
}

function parseVersion(v: string) {
  return v.split(".").map(Number);
}

function isNewer(a: string, b: string) {
  const pa = parseVersion(a), pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

interface ApkInstallerPlugin {
  downloadAndInstall(options: { url: string }): Promise<{ ok: boolean }>;
  canInstallPackages(): Promise<{ can: boolean }>;
  openInstallSettings(): Promise<{ ok: boolean }>;
  addListener(eventName: "downloadProgress", cb: (data: { percent: number }) => void): Promise<{ remove: () => Promise<void> }>;
}

const ApkInstaller = Capacitor.registerPlugin<ApkInstallerPlugin>("ApkInstaller") as ApkInstallerPlugin;

export function useAppVersion(fallback = "1.40") {
  const [v, setV] = useState(fallback);
  useEffect(() => {
    let on = true;
    (async () => {
      /* الويب/PWA: نقرأ نسخة الحزمة المبنية — وإلا ظنّ التطبيق أن�� 항상 قديم */
      if (Capacitor.getPlatform() === "web") {
        try {
          const r = await fetch("/version.json", { cache: "no-store" as RequestCache });
          if (r.ok) {
            const j = (await r.json()) as { version?: string };
            if (on && j?.version) setV(j.version);
          }
        } catch {}
        return;
      }
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        if (on && info?.version) setV(info.version);
      } catch {}
    })();
    return () => {
      on = false;
    };
  }, []);
  return v;
}

export function useUpdateChecker(currentVersion: string) {
  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [downloadOpened, setDownloadOpened] = useState(false);
  const [needsInstallPermission, setNeedsInstallPermission] = useState(false);
  const isAndroid = Capacitor.getPlatform() === "android";

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setError(null);
    setDownloadOpened(false);
    setNeedsInstallPermission(false);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(`${API_BASE}/api/version?t=${Date.now()}`, {
        cache: "no-store" as RequestCache,
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error("network");
      const data: VersionInfo = await r.json();
      setLatest(data);
      if (data.version && isNewer(data.version, currentVersion)) return data;
      return null;
    } catch (e: any) {
      setError(e?.name === "AbortError" ? "انتهت مهلة التحقق — تحقق من الاتصال وحاول مجددًا" : "تعذر التحقق من التحديث");
      return null;
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  }, [isAndroid, currentVersion]);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const openInstallSettings = useCallback(async () => {
    if (!isAndroid) return false;
    try {
      await ApkInstaller.openInstallSettings();
      setNeedsInstallPermission(true);
      return true;
    } catch (e: any) {
      setError(e?.message || String(e));
      return false;
    }
  }, [isAndroid]);

  const ensureInstallPermission = useCallback(async () => {
    if (!isAndroid) return true;
    try {
      const res = await ApkInstaller.canInstallPackages();
      if (res?.can) {
        setNeedsInstallPermission(false);
        return true;
      }
    } catch {
      return true;
    }
    return openInstallSettings();
  }, [isAndroid, openInstallSettings]);

  const downloadAndInstall = useCallback(async (apkUrl: string) => {
    if (!apkUrl) return;
    setDownloading(true);
    setProgress(0.05);
    setError(null);
    setNeedsInstallPermission(false);
    setDownloadOpened(false);
    setDone(false);

    try {
      if (!(await ensureInstallPermission())) return;
      if (!isAndroid) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: apkUrl });
        setDownloadOpened(true);
        setDone(true);
        return;
      }
      const listener = await ApkInstaller.addListener("downloadProgress", (data: { percent: number }) => {
        setProgress(data.percent / 100);
      });

      try {
        await ApkInstaller.downloadAndInstall({ url: apkUrl });
        setProgress(1);
        setDone(true);
      } finally {
        await listener.remove();
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("INSTALL_PERMISSION_REQUIRED")) {
        setNeedsInstallPermission(true);
      } else {
        setError(msg);
      }
    } finally {
      setDownloading(false);
    }
  }, [isAndroid, ensureInstallPermission]);

  const hasUpdate = latest?.version && currentVersion ? isNewer(latest.version.trim(), currentVersion.trim()) : false;

  const downloadApk = useCallback(async (apkUrl: string) => {
    if (!apkUrl) return;
    setError(null);
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: apkUrl });
      setDownloadOpened(true);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, []);

  return {
    hasUpdate,
    latestVersion: latest?.version || null,
    releaseNotes: latest?.release_notes || null,
    apkUrl: latest?.apk_url || null,
    checking,
    downloading,
    progress,
    error,
    done,
    downloadOpened,
    needsInstallPermission,
    isAndroid,
    checkForUpdate,
    downloadAndInstall,
    openInstallSettings,
    downloadApk,
  };
}
