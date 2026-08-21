/* اختبار التحويل على شريط حقيقي من Internet Archive عبر محاكي Voice-Pro
   الملف: فضائل بلال (24MB) — ينزَّل من archive.org ثم يرفع إلى Voice-Pro */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";
process.env.VOICE_PRO_URL = "http://127.0.0.1:7870";
process.env.PORT = "4997";

const mock = await import("./mock-voicepro.mjs");
const { createApp } = await import("../src/app.js");
const server = createApp().listen(4997);

const base = "http://localhost:4997";
const j = async (r) => { try { return await r.json(); } catch { return {}; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, c, x = "") => { results.push({ n, c }); console.log((c ? "PASS" : "FAIL") + " | " + n + (x ? " | " + x : "")); };
const AUDIO_ID = "arch-01_20230905_202309-10";

try {
  await sleep(300);
  const login = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@daralhadith.app", password: "admin123" }) }).then((r) => r.json());
  check("تسجيل الدخول", !!login.accessToken);
  const auth = { "content-type": "application/json", authorization: "Bearer " + login.accessToken };

  const audio = await fetch(base + "/api/audios/" + encodeURIComponent(AUDIO_ID), { headers: auth }).then((r) => r.json());
  check("الشريط موجود", audio.id === AUDIO_ID, "title=" + (audio.title || "").slice(0, 40));
  check("رابط الملف من archive.org", /archive\.org\/download/.test(audio.file_url || ""), audio.file_url || "");

  let r = await fetch(base + "/api/ai/transcribe", { method: "POST", headers: auth, body: JSON.stringify({ audioId: AUDIO_ID, language: "arabic", model: "large-v3-turbo" }) });
  const rec = await j(r);
  check("إنشاء المهمة → 202", r.status === 202 && rec.id, "id=" + (rec.id || ""));
  check("تنزيل + رفع الملف الحقيقي", !!(rec.media_path && rec.media_path.path), "path=" + (rec.media_path?.path || ""));
  const uploaded = [...mock.mockFiles.values()];
  const big = uploaded.find((b) => b.length > 10 * 1048576);
  check("استقبل المحاكي ملفاً كبيراً (>10MB)", !!big, "max=" + (Math.max(0, ...uploaded.map((b) => b.length)) / 1048576).toFixed(1) + "MB");

  let final = null;
  for (let i = 0; i < 80; i++) {
    await sleep(1500);
    const list = await fetch(base + "/api/ai/transcriptions", { headers: auth }).then((r2) => r2.json());
    const mine = list.find((x) => x.id === rec.id);
    if (mine && ["completed", "failed"].includes(mine.status)) { final = mine; break; }
  }
  check("اكتمل التحويل", final && final.status === "completed", "status=" + (final?.status) + " err=" + (final?.error || "").slice(0, 60));
  if (final) {
    check("نص عربي غير فارغ", final.text_content && final.text_content.length > 20, "len=" + (final.text_content || "").length);
    check("SRT بتوقيتات", (final.srt_content || "").includes("-->"), "srtLen=" + (final.srt_content || "").length);
    console.log("   نص العينة: " + (final.text_content || "").slice(0, 120).replace(/\n/g, " ⏎ "));
    check("التقدم 100", final.progress === 100);
  }

  r = await fetch(base + "/api/ai/transcriptions/" + rec.id, { method: "DELETE", headers: auth });
  check("حذف سجل التحويل", r.ok);
  const { getNode } = await import("../src/fb.js");
  check("نظافة السجلات", !(await getNode("admin/transcriptions/" + rec.id)));

  const failed = results.filter((x) => !x.c).length;
  console.log("\n==== " + (results.length - failed) + "/" + results.length + " ناجح ====");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("EXCEPTION:", e);
  process.exit(1);
} finally {
  setTimeout(() => server.close(), 300);
}
