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

const ApkInstaller = Capacitor.registerPlugin<{ downloadAndInstall(options: { url: string }): Promise<{ ok: boolean }> }>("ApkInstaller");

export function useUpdateChecker(currentVersion: string) {
  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const isAndroid = Capacitor.getPlatform() === "android";

  const checkForUpdate = useCallback(async () => {
    if (!isAndroid) return null;
    setChecking(true);
    setError(null);
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
    if (isAndroid) checkForUpdate();
  }, [isAndroid, checkForUpdate]);

  const downloadAndInstall = useCallback(async (apkUrl: string) => {
    if (!apkUrl) return;
    setDownloading(true);
    setProgress(0.05);
    setError(null);
    setDone(false);

    try {
      const listener = await (ApkInstaller as any).addListener("downloadProgress", (data: { percent: number }) => {
        setProgress(data.percent / 100);
      });

      try {
        await (ApkInstaller as any).downloadAndInstall({ url: apkUrl });
        setProgress(1);
        setDone(true);
      } finally {
        await listener.remove();
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: apkUrl });
        setDone(true);
      } catch {}
    } finally {
      setDownloading(false);
    }
  }, []);

  const hasUpdate = latest?.version ? isNewer(latest.version, currentVersion) : false;

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
    isAndroid,
    checkForUpdate,
    downloadAndInstall,
  };
}
