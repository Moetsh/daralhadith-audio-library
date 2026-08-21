/* اختبار شامل محلي: شريط حقيقي ← محاكي Voice-Pro ← نص SRT ← حفظ وربط */
process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";
process.env.VOICE_PRO_URL = "http://127.0.0.1:7870";
process.env.PORT = "4999";

const mock = await import("./mock-voicepro.mjs");
const { createApp } = await import("../src/app.js");
const server = createApp().listen(4999);

const base = "http://localhost:4999";
const j = async (r) => { try { return await r.json(); } catch { return {}; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, c, x = "") => { results.push({ n, c }); console.log((c ? "PASS" : "FAIL") + " | " + n + (x ? " | " + x : "")); };

try {
  await sleep(300);

  // تسجيل دخول
  let res = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@daralhadith.app", password: "admin123" }),
  });
  const login = await j(res);
  check("تسجيل الدخول", res.ok && login.accessToken);
  const auth = { "content-type": "application/json", authorization: "Bearer " + (login.accessToken || "") };

  // الإعدادات — يجب أن يكون المحاكي متاحاً
  res = await fetch(base + "/api/ai/config", { headers: auth });
  const cfg = await j(res);
  check("Voice-Pro متاح", cfg.reachable === true, "url=" + (cfg.voiceproUrl || ""));

  // حفظ عنوان في إعداد Firebase
  res = await fetch(base + "/api/ai/config", { method: "PUT", headers: auth, body: JSON.stringify({ voiceproUrl: "http://127.0.0.1:7870" }) });
  check("حفظ إعداد الرابط", res.ok, "status=" + res.status);

  // شريط حقيقي
  const aud = await fetch(base + "/api/audios?per=5", { headers: auth }).then((r) => r.json());
  const someId = (aud.items && aud.items[0] && aud.items[0].id) || null;
  check("جلب شريط حقيقي", !!someId, "id=" + someId);
  if (!someId) throw new Error("لا توجد أشرطة");

  // إنشاء مهمة تحويل
  res = await fetch(base + "/api/ai/transcribe", {
    method: "POST", headers: auth,
    body: JSON.stringify({ audioId: someId, language: "arabic", model: "large-v3-turbo" }),
  });
  const rec = await j(res);
  check("إنشاء المهمة → 202", res.status === 202 && rec.id, "id=" + (rec.id || ""));

  // استطلاع حتى الاكتمال
  const progressLog = [];
  let final = null;
  for (let i = 0; i < 60; i++) {
    await sleep(1500);
    res = await fetch(base + "/api/ai/transcriptions", { headers: auth });
    const list = await j(res);
    const mine = list.find((x) => x.id === rec.id);
    if (mine) {
      progressLog.push(mine.status + ":" + (mine.progress || 0));
      if (["completed", "failed"].includes(mine.status)) { final = mine; break; }
    }
  }
  check("اكتمل التحويل", final && final.status === "completed", "status=" + (final && final.status) + " err=" + (final && final.error || "").slice(0, 60));
  if (final) {
    check("النص الناتج غير فارغ", final.text_content && final.text_content.length > 10, "len=" + (final.text_content || "").length);
    check("يحتوي SRT على توقيتات", (final.srt_content || "").includes("-->"), "srtLen=" + (final.srt_content || "").length);
    check("التقدم 100", final.progress === 100, "progress=" + final.progress);
  }
  console.log("   تقدم الاستطلاعات: " + progressLog.join(" → "));

  // حفظ النص يدوياً
  res = await fetch(base + "/api/ai/transcriptions/" + rec.id, { method: "PATCH", headers: auth, body: JSON.stringify({ text_content: "نص معدّل يدوياً بعد التحويل" }) });
  const patched = await j(res);
  check("حفظ النص المعدل", res.ok && patched.text_content === "نص معدّل يدوياً بعد التحويل");

  // ربط الشريط
  res = await fetch(base + "/api/ai/transcriptions/" + rec.id + "/link", { method: "POST", headers: auth, body: JSON.stringify({ audioId: someId }) });
  const linked = await j(res);
  check("الربط بالشريط", res.ok && linked.ok);

  // تصفية حسب الشريط
  res = await fetch(base + "/api/ai/transcriptions/" + encodeURIComponent(someId), { headers: auth });
  const filtered = await j(res);
  check("GET بتصفية الشريط", res.ok && filtered.length === 1);

  // التحقق من ربط الشريط في قاعدة البيانات
  const audioCheck = await fetch(base + "/api/audios/" + encodeURIComponent(someId), { headers: auth }).then((r) => r.json());
  check("الشريط يحمل transcription_id", (audioCheck.transcription_id || "") === rec.id, "val=" + (audioCheck.transcription_id || ""));

  // تنظيف كامل
  await fetch(base + "/api/ai/transcriptions/" + rec.id, { method: "DELETE", headers: auth });
  const { updateNode, removeNode, getNode } = await import("../src/fb.js");
  await updateNode("audios/" + someId, { transcription_id: null });
  const left = (await getNode("admin/transcriptions")) || {};
  check("نظافة السجلات", Object.keys(left).length === 0, "count=" + Object.keys(left).length);
  check("إزالة transcription_id", !(await getNode("audios/" + someId)).transcription_id);

  const failed = results.filter((r) => !r.c).length;
  console.log("\n==== " + (results.length - failed) + "/" + results.length + " ناجح ====");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("EXCEPTION:", e);
  process.exit(1);
} finally {
  setTimeout(() => server.close(), 300);
}
