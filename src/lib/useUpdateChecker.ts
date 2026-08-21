import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

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
      await Browser.open({ url: apkUrl });
      setProgress(1);
      setDone(true);
    } catch (e: any) {
      window.open(apkUrl, "_system");
      setDone(true);
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
