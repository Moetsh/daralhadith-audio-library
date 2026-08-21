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

async function downloadApk(url: string, onProgress: (p: number) => void): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const total = Number(resp.headers.get("content-length")) || 0;
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No reader");
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(loaded / total);
  }
  const blob = new Blob(chunks, { type: "application/vnd.android.package-archive" });
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    let s = "";
    for (let j = 0; j < slice.length; j++) s += String.fromCharCode(slice[j]);
    binary += s;
  }
  return btoa(binary);
}

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
      const r = await fetch(`${API_BASE}/api/version?t=${Date.now()}`);
      const data: VersionInfo = await r.json();
      setLatest(data);
      if (data.version && isNewer(data.version, currentVersion)) return data;
      return null;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  }, [isAndroid, currentVersion]);

  useEffect(() => {
    if (isAndroid) checkForUpdate();
  }, [isAndroid, checkForUpdate]);

  const downloadAndInstall = useCallback(async (apkUrl: string) => {
    setDownloading(true);
    setProgress(0);
    setError(null);
    setDone(false);
    try {
      const b64 = await downloadApk(apkUrl, setProgress);

      await Filesystem.writeFile({
        path: "update.apk",
        data: b64,
        directory: Directory.Cache,
      });

      const { uri } = await Filesystem.getUri({
        path: "update.apk",
        directory: Directory.Cache,
      });

      const { ApkInstaller } = await import("@capacitor/core").then((c) =>
        (c as any).Capacitor.Plugins.ApkInstaller
          ? { ApkInstaller: (c as any).Capacitor.Plugins.ApkInstaller }
          : Promise.reject(new Error("Plugin not available"))
      );

      await ApkInstaller.install({ path: uri });

      setProgress(1);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "خطأ في التحميل");
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
