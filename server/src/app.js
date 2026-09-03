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

  app.get("/", (_req, res) => {
    if (existsSync(join(adminDist, "index.html")))
      return res.sendFile(join(adminDist, "index.html"));
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
    app.get("/admin-legacy", (_req, res) => res.sendFile(legacyFile));
  }

  /* ربط لوحة التحكم المبنيّة (اختياري) */
  if (existsSync(adminDist)) {
    app.use(express.static(adminDist, {
      setHeaders(res) {
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
      }
    }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return res.status(404).json({ error: "غير موجود" });
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
