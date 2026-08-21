import { Router } from "express";
import { authUser, adminOnly } from "../auth.js";
import { getNode, setNode, mapNode, nowISO, findOne } from "../fb.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const r = Router();

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.terabox.com/",
};

function parseSurl(url) {
  const m = String(url || "").match(/(?:\/s\/|surl=)([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function epOfName(name) {
  const m = String(name || "").match(/^(\d{1,5})[_\-.]/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n > 0 && n < 10000 ? n : null;
}

r.post("/inspect", authUser, adminOnly, async (req, res) => {
  try {
    const { url, cookies } = req.body || {};
    if (!url) return res.status(400).json({ error: "Enter URL" });
    const surl = parseSurl(url);
    if (!surl) return res.status(400).json({ error: "Invalid TeraBox URL" });
    const cookieStr = String(cookies || "").trim();
    const hdrs = { ...HEADERS };
    if (cookieStr) hdrs["Cookie"] = cookieStr;

    const pageR = await fetch(`https://www.terabox.com/sharing/link?surl=${surl}`, { headers: hdrs, redirect: "follow" });
    const html = await pageR.text();
    const m = html.match(/fn%28%22([A-F0-9]+)%22/) || html.match(/fn\("([A-F0-9]+)"\)/);
    const jsToken = m ? m[1] : "";

    const infoR = await fetch(`https://www.terabox.com/api/shorturlinfo?shorturl=1${surl}&root=1&jsToken=${jsToken}`, { headers: hdrs });
    const info = await infoR.json();
    if (info.errno !== 0 || !info.list?.[0]) {
      return res.status(400).json({ error: "Cannot read link", detail: info });
    }
    const shareid = info.list[0].shareid || info.shareid;
    const uk = info.list[0].uk || info.uk;

    const allFiles = [];
    for (let page = 1; page <= 20; page++) {
      const params = new URLSearchParams({
        shareid: String(shareid), uk: String(uk),
        page: String(page), num: "100",
        dir: "/", root: "1", jsToken,
      });
      const listR = await fetch(`https://www.terabox.com/share/list?${params}`, { headers: hdrs });
      const data = await listR.json();
      if (data.errno !== 0 || !data.list?.length) break;
      for (const f of data.list) {
        if (f.isdir === 1) continue;
        allFiles.push({
          name: f.server_filename,
          fs_id: f.fs_id,
          size: f.size || 0,
          dlink: f.dlink || "",
        });
      }
      if (data.list.length < 100) break;
    }

    if (!allFiles.length) {
      return res.status(400).json({ error: "No audio files found" });
    }

    const files = allFiles.map((f) => ({
      ...f,
      episode_number: epOfName(f.name),
      has_dlink: !!f.dlink,
    }));

    res.json({
      ok: true, surl, shareid, uk, jsToken,
      title: info.list[0].server_filename || info.list[0].path || "TeraBox",
      total: files.length,
      with_dlinks: files.filter((f) => f.has_dlink).length,
      files,
    });
  } catch (e) {
    console.error("terabox inspect error:", e);
    res.status(500).json({ error: e.message });
  }
});

const slugOf = (s) =>
  "sr-" + String(s || "").trim().toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60) || "sr";

r.post("/bulk-import", authUser, adminOnly, async (req, res) => {
  try {
    const { surl, shareid, uk, jsToken, cookies, scholar_id, category_id, series_id, selected, new_series, start_episode } = req.body || {};
    if (!surl) return res.status(400).json({ error: "Missing surl" });
    if (!scholar_id || !category_id) return res.status(400).json({ error: "Select scholar and category" });

    const cookieStr = String(cookies || "").trim();
    const hdrs = { ...HEADERS };
    if (cookieStr) hdrs["Cookie"] = cookieStr;

    let allFiles = [];
    for (let page = 1; page <= 20; page++) {
      const params = new URLSearchParams({
        shareid: String(shareid), uk: String(uk),
        page: String(page), num: "100",
        dir: "/", root: "1", jsToken,
      });
      const listR = await fetch(`https://www.terabox.com/share/list?${params}`, { headers: hdrs });
      const data = await listR.json();
      if (data.errno !== 0 || !data.list?.length) break;
      for (const f of data.list) {
        if (f.isdir === 1) continue;
        allFiles.push({ name: f.server_filename, fs_id: f.fs_id, size: f.size || 0, dlink: f.dlink || "" });
      }
      if (data.list.length < 100) break;
    }

    if (Array.isArray(selected) && selected.length) {
      const sel = new Set(selected);
      allFiles = allFiles.filter((f) => sel.has(f.name));
    }
    if (!allFiles.length) return res.status(400).json({ error: "No files selected" });

    let mainId = series_id || null;
    if (new_series?.title) {
      const existing = await findOne("series", (s) => s.title === new_series.title);
      if (existing) {
        mainId = existing.id;
      } else {
        mainId = slugOf(new_series.title);
        await setNode("series/" + mainId, {
          id: mainId, title: new_series.title, scholar_id, category_id,
          total_episodes: new_series.total_episodes || allFiles.length,
          is_complete: 0, order_direction: "asc", parent_id: null,
        });
      }
    }

    const existingUrls = new Set();
    for (const a of Object.values(await mapNode("audios"))) {
      if (a.file_url) existingUrls.add(a.file_url);
    }

    const existingEps = new Map();
    if (mainId) {
      for (const a of Object.values(await mapNode("audios"))) {
        if (a.series_id === mainId && a.episode_number > 0) {
          existingEps.set(a.episode_number, a.id);
        }
      }
    }

    const nextEp = mainId ? Math.max(0, ...[...existingEps.keys()]) + (parseInt(start_episode, 10) || 1) : 1;
    let imported = 0, skipped = 0, idx = 0;

    for (const f of allFiles) {
      idx++;
      const ep = epOfName(f.name) || (nextEp + imported);
      if (existingEps.has(ep)) { skipped++; continue; }
      if (f.dlink && existingUrls.has(f.dlink)) { skipped++; continue; }
      if (!f.dlink) { skipped++; continue; }

      const id = `terabox-${surl.slice(0, 8)}-${ep}`;
      if (await getNode("audios/" + id)) { skipped++; continue; }

      await setNode("audios/" + id, {
        id, title: f.name.replace(/\.[^.]+$/, ""),
        scholar_id, category_id, series_id: mainId || null,
        episode_number: ep,
        description: null,
        archive_url: `https://1024terabox.com/s/${surl}`,
        file_url: f.dlink,
        terabox_surl: surl,
        terabox_fs_id: String(f.fs_id),
        duration: 0, file_size: f.size,
        bitrate: null, cover_image_url: null,
        tags: "[]", status: "published",
        is_featured: 0, allow_download: 1,
        listen_count: 0, download_count: 0, added_days: 0,
        created_at: nowISO(), updated_at: nowISO(), published_at: nowISO(),
      });
      existingEps.set(ep, id);
      imported++;
    }

    if (mainId) {
      const ser = await getNode("series/" + mainId);
      if (ser) {
        const maxEp = Math.max(0, ...[...existingEps.keys()]);
        if (maxEp > 0) await setNode("series/" + mainId, { ...ser, total_episodes: maxEp });
      }
    }

    res.json({ ok: true, imported, skipped, series_id: mainId });
  } catch (e) {
    console.error("terabox import error:", e);
    res.status(500).json({ error: e.message });
  }
});

function loadCookies() {
  try {
    const p = join(__dir, "..", "..", "terabox_cookies.json");
    const arr = JSON.parse(readFileSync(p, "utf-8"));
    return Object.fromEntries(arr.map((c) => [c.name, c.value]));
  } catch { return {}; }
}

async function getFreshDlink(surl, fs_id, cookieStr) {
  const hdrs = { ...HEADERS };
  if (cookieStr) hdrs["Cookie"] = cookieStr;
  const pageR = await fetch(`https://www.terabox.com/sharing/link?surl=${surl}`, { headers: hdrs, redirect: "follow" });
  const html = await pageR.text();
  const m = html.match(/fn%28%22([A-F0-9]+)%22/) || html.match(/fn\("([A-F0-9]+)"\)/);
  const jsToken = m ? m[1] : "";
  const infoR = await fetch(`https://www.terabox.com/api/shorturlinfo?shorturl=1${surl}&root=1&jsToken=${jsToken}`, { headers: hdrs });
  const info = await infoR.json();
  if (info.errno !== 0 || !info.list?.[0]) return null;
  const shareid = info.list[0].shareid || info.shareid;
  const uk = info.list[0].uk || info.uk;
  const params = new URLSearchParams({
    shareid: String(shareid), uk: String(uk),
    page: "1", num: "100", dir: "/", root: "1", jsToken,
  });
  const listR = await fetch(`https://www.terabox.com/share/list?${params}`, { headers: hdrs });
  const data = await listR.json();
  if (data.errno !== 0 || !data.list) return null;
  const file = data.list.find((f) => String(f.fs_id) === String(fs_id));
  return file?.dlink || null;
}

r.get("/stream/:audioId", async (req, res) => {
  try {
    const audio = await getNode("audios/" + req.params.audioId);
    if (!audio) return res.status(404).json({ error: "Not found" });
    const surl = audio.terabox_surl;
    const fs_id = audio.terabox_fs_id;
    if (!surl || !fs_id) return res.status(400).json({ error: "No TeraBox metadata" });
    const cookies = loadCookies();
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    const dlink = await getFreshDlink(surl, fs_id, cookieStr);
    if (!dlink) return res.status(502).json({ error: "Cannot get dlink" });
    const range = req.headers.range;
    const headers = { "User-Agent": HEADERS["User-Agent"], Accept: "audio/*,*/*" };
    if (range) headers["Range"] = range;
    const upstream = await fetch(dlink, { headers, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: "Upstream error" });
    }
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    const clen = upstream.headers.get("content-length");
    if (clen) res.setHeader("Content-Length", clen);
    const crange = upstream.headers.get("content-range");
    if (crange) res.setHeader("Content-Range", crange);
    const body = upstream.body;
    if (!body) return res.status(502).json({ error: "No body" });
    res.flushHeaders?.();
    if (body.pipeTo) {
      body.pipeTo(res.writableStream({ closeOnEnd: true })).catch(() => {});
    } else {
      const reader = body.getReader();
      res.on("close", () => reader.cancel().catch(() => {}));
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        if (!res.write(value)) await new Promise((r) => res.once("drain", r));
      }
    }
  } catch (e) {
    console.error("terabox stream error:", e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

export default r;
