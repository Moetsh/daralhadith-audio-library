import { Router } from "express";
import { authUser, adminOnly } from "../auth.js";
import { inspectArchive } from "../archive.js";

const r = Router();

/* فحص رابط أرشيف الإنترنت: يعيد معلومات العنصر والملفات */
r.post("/inspect", authUser, adminOnly, async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "أدخل الرابط" });
  const insp = await inspectArchive(url);
  res.json(insp);
});

/* تحويل رابط archive.org/download إلى عقدة CDN المباشرة (يتابع التوجيه 3xx) */
r.post("/resolve", authUser, adminOnly, async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string")
    return res.status(400).json({ error: "أدخل الرابط" });
  try {
    const r2 = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (daralhadith; +https://daralhadith.vercel.app)", "Range": "bytes=0-0", "Accept": "audio/*,*/*" },
      signal: AbortSignal.timeout(20000),
    });
    res.json({ original: url, resolved: r2.url, finalStatus: r2.status, type: r2.headers.get("content-type") });
  } catch (e) {
    res.status(502).json({ error: "تعذّر الوصول إلى الرابط" });
  }
});

/* وكيل بثّ الوسائط: ينقل الملف من المصدر مع دعم Range (للتجاوب مع حجب بعض الشبكات لـ archive.org) */
r.get("/stream", async (req, res) => {
  const { src } = req.query;
  if (!src || typeof src !== "string") return res.status(400).json({ error: "أدخل src" });
  const range = req.headers.range;
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (daralhadith; +https://daralhadith.vercel.app)",
      "Accept": "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.8",
    };
    if (range) headers["Range"] = range;
    const upstream = await fetch(src, { headers, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(upstream.status).send("تعذّر جلب الوسائط من المصدر");
    }
    const ctype = upstream.headers.get("content-type") || "application/octet-stream";
    const clen = upstream.headers.get("content-length");
    res.status(upstream.status);
    res.setHeader("Content-Type", ctype);
    res.setHeader("Accept-Ranges", "bytes");
    if (clen) res.setHeader("Content-Length", clen);
    if (upstream.headers.get("content-range"))
      res.setHeader("Content-Range", upstream.headers.get("content-range"));
    const body = await upstream.body;
    if (!body) return res.status(502).json({ error: "لا يوجد محتوى" });
    res.flushHeaders?.();
    body.pipeTo
      ? body.pipeTo(res.writableStream({ closeOnEnd: true }))
      : await streamTo(res, body);
  } catch (e) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(502).send("تعذّر الوصول إلى المصدر");
  }
});

async function streamTo(res, body) {
  const reader = body.getReader();
  res.on("close", () => reader.cancel().catch(() => {}));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) { res.end(); break; }
    if (!res.write(value)) await new Promise((r) => res.once("drain", r));
  }
}

export default r;
