/* تجميع تطبيق Express في دالة قابلة لإعادة الاستخدام (محلياً أو Vercel serverless) */
import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import authRoutes from "./routes/auth.js";
import audioRoutes from "./routes/audios.js";
import catRoutes from "./routes/categories.js";
import scholarRoutes from "./routes/scholars.js";
import seriesRoutes from "./routes/series.js";
import statsRoutes from "./routes/stats.js";
import searchRoutes from "./routes/search.js";
import archiveRoutes from "./routes/archive.js";
import teraboxRoutes from "./routes/terabox.js";
import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/ai.js";
import versionRoutes from "./routes/version.js";

const __dir = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  const adminDist = join(__dir, "..", "..", "admin", "dist");

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  /* تخزين حافة 30 ثانية للكتالوج العام فقط (بدون توكن) — يخفف المسح الكامل المتكرر */
  app.use("/api", (req, res, next) => {
    if (
      req.method === "GET" &&
      !req.headers.authorization &&
      /^\/(audios|series|scholars|categories|search|version)(\/|$)/.test(req.path)
    ) {
      res.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    }
    next();
  });

  /* ترويسات منع التخزين للوحة التحكم — وإلا يقدّم CDN نسخاً قديمة */
  const noStore = (res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  };

  app.get("/", (_req, res) => {
    if (existsSync(join(adminDist, "index.html"))) {
      noStore(res);
      return res.sendFile(join(adminDist, "index.html"));
    }
    res.json({ name: "دار الحديث الصوتية API", version: "1.0.0" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/audios", audioRoutes);
  app.use("/api/categories", catRoutes);
  app.use("/api/scholars", scholarRoutes);
  app.use("/api/series", seriesRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/archive", archiveRoutes);
  app.use("/api/terabox", teraboxRoutes);
  app.use("/api/admin", statsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/version", versionRoutes);

  /* لوحة التحكم الموحّدة — تتصل بـ Firebase عبر الـ API */
  const legacyFile = join(__dir, "..", "..", "admin", "legacy.html");
  if (existsSync(legacyFile)) {
    app.get("/admin-legacy", (_req, res) => {
      noStore(res);
      res.sendFile(legacyFile);
    });
  }

  /* ربط لوحة التحكم المبنيّة (اختياري) */
  if (existsSync(adminDist)) {
    app.use(express.static(adminDist, {
      setHeaders(res) {
        noStore(res);
      }
    }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return res.status(404).json({ error: "غير موجود" });
      noStore(res);
      res.sendFile(join(adminDist, "index.html"));
    });
  }

  app.use((req, res) => res.status(404).json({ error: "غير موجود" }));
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "خطأ في الخادم" });
  });

  return app;
}
