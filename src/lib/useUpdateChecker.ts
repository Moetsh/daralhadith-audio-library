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
    setProgress(0);
    setError(null);
    setDone(false);
    try {
      // Clean old file if exists
      try { await Filesystem.deleteFile({ path: "update.apk", directory: Directory.Cache }); } catch {}

      // Native download with progress — bypasses CORS, no browser shown
      let lastPct = 0;
      const progListener = await Filesystem.addListener("progress", (ev: any) => {
        if (ev?.bytes != null && ev?.contentLength) {
          const pct = ev.contentLength > 0 ? ev.bytes / ev.contentLength : 0;
          if (Math.abs(pct - lastPct) > 0.02) { lastPct = pct; setProgress(pct); }
        }
      });

      const result = await Filesystem.downloadFile({
        url: apkUrl,
        path: "update.apk",
        directory: Directory.Cache,
        progress: true,
      } as any);

      progListener.remove();
      setProgress(1);

      // result.path is the file path, result.uri may not exist — get native path
      let filePath: string;
      try {
        const uriResult = await Filesystem.getUri({ path: "update.apk", directory: Directory.Cache });
        filePath = uriResult.uri;
        // Convert content URI to file path if needed — ApkInstaller expects file path
        // Filesystem.getUri returns file:///data/user/0/.../cache/update.apk on Android
        if (filePath.startsWith("file://")) filePath = filePath.replace("file://", "");
        // Also try result.path if available
        if ((result as any)?.path) {
          const p = (result as any).path as string;
          if (p && p.length > filePath.length) filePath = p;
        }
      } catch {
        filePath = (result as any)?.path || "/data/user/0/com.daralhadith.audiolibrary/cache/update.apk";
      }

      await (ApkInstaller as any).install({ path: filePath });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "فشل التنزيل");
      // Fallback: open in browser if native install fails
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: apkUrl });
        setDone(true);
        setError(null);
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
