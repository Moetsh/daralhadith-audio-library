import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

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

// Custom native plugin already registered in MainActivity.java
const ApkInstaller = Capacitor.registerPlugin<{ install(options: { path: string }): Promise<{ ok: boolean }> }>("ApkInstaller");

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
    try {
      const r = await fetch(`${API_BASE}/api/version?t=${Date.now()}`, { cache: "no-store" as RequestCache });
      if (!r.ok) throw new Error("network");
      const data: VersionInfo = await r.json();
      setLatest(data);
      if (data.version && isNewer(data.version, currentVersion)) return data;
      return null;
    } catch {
      setError("تعذر التحقق من التحديث");
      return null;
    } finally {
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
      try { await Filesystem.deleteFile({ path: "update.apk", directory: Directory.Cache }); } catch {}

      // Simulate progress while native download runs
      const progInterval = setInterval(() => setProgress((p) => Math.min(0.9, p + 0.04)), 400);

      const result: any = await Filesystem.downloadFile({
        url: apkUrl,
        path: "update.apk",
        directory: Directory.Cache,
      });

      clearInterval(progInterval);
      setProgress(0.95);

      let filePath: string = result?.path || "";
      if (!filePath) {
        const uriResult = await Filesystem.getUri({ path: "update.apk", directory: Directory.Cache });
        filePath = uriResult.uri.replace("file://", "");
      } else if (filePath.startsWith("file://")) {
        filePath = filePath.replace("file://", "");
      }
      // Fallback hard-coded cache path
      if (!filePath || !filePath.includes("update.apk")) {
        filePath = "/data/user/0/com.daralhadith.audiolibrary/cache/update.apk";
      }

      setProgress(1);
      await (ApkInstaller as any).install({ path: filePath });
      setDone(true);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      // Fallback: open in browser so user still can update
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
