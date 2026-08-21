process.env.FIREBASE_API_KEY = "AIzaSyDJmlirEAsX6e7Ucq1W-_V_SGV3-OVM9RE";
process.env.FIREBASE_AUTH_EMAIL = "firebase-admin@daralhadith.app";
process.env.FIREBASE_AUTH_PASSWORD = "Dh_260ed374ead4c4fc9b4ecafe31707656";
process.env.PORT = "4999";

const { createApp } = await import("../src/app.js");
const server = createApp().listen(4999);

const base = "http://localhost:4999";
const j = async (res) => { try { return await res.json(); } catch { return {}; } };

const results = [];
const check = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond, extra });
  console.log((cond ? "PASS" : "FAIL") + " | " + name + (extra ? " | " + extra : ""));
};

try {
  // 1) بدون مصادقة
  let res = await fetch(base + "/api/ai/config");
  check("config بدون مصادقة → 401", res.status === 401, "status=" + res.status);

  // 2) تسجيل دخول المشرف
  res = await fetch(base + "/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@daralhadith.app", password: "admin123" }),
  });
  const login = await j(res);
  check("تسجيل الدخول", res.ok && login.accessToken, res.status);
  const auth = { "content-type": "application/json", authorization: "Bearer " + (login.accessToken || "") };

  // 3) الإعدادات مع المصادقة
  res = await fetch(base + "/api/ai/config", { headers: auth });
  const cfg = await j(res);
  check("config بمصادقة → 200", res.ok, "status=" + res.status);
  check("voiceproUrl معرف", !!cfg.voiceproUrl, "url=" + cfg.voiceproUrl);
  check("reachable=false (بدون Voice-Pro)", cfg.reachable === false, "reachable=" + cfg.reachable);

  // 4) إنشاء بلا مصدر → 400
  res = await fetch(base + "/api/ai/transcribe", { method: "POST", headers: auth, body: JSON.stringify({ language: "arabic" }) });
  check("transcribe بلا مصدر → 400", res.status === 400, "status=" + res.status);

  // 5) شريط غير موجود → 404
  res = await fetch(base + "/api/ai/transcribe", { method: "POST", headers: auth, body: JSON.stringify({ audioId: "no-such-id-xyz" }) });
  check("transcribe شريط غير موجود → 404", res.status === 404, "status=" + res.status);

  // 6) شريط موجود لكن Voice-Pro غير متاح → 502 برسالة واضحة
  const aud = await fetch(base + "/api/audios?per=5", { headers: auth }).then((r) => r.json());
  const someId = (aud.items && aud.items[0] && aud.items[0].id) || null;
  check("جلب أشرطة للاختبار", !!someId, "id=" + someId);
  if (someId) {
    const t0 = Date.now();
    res = await fetch(base + "/api/ai/transcribe", { method: "POST", headers: auth, body: JSON.stringify({ audioId: someId }) });
    const d = await j(res);
    check("transcribe صوت غير متاح → 502", res.status === 502, "status=" + res.status + " error=" + (d.error || "").slice(0, 80));
    console.log("   (استغرق التنزيل " + (Date.now() - t0) + "ms)");
  }

  // 7) قائمة التحويلات
  res = await fetch(base + "/api/ai/transcriptions", { headers: auth });
  const list = await j(res);
  check("قائمة التحويلات → 200", res.ok && Array.isArray(list), "count=" + (list.length ?? "?"));

  // 8) PATCH لسجل غير موجود → 404
  res = await fetch(base + "/api/ai/transcriptions/tr_nope", { method: "PATCH", headers: auth, body: JSON.stringify({ text_content: "x" }) });
  check("PATCH غير موجود → 404", res.status === 404, "status=" + res.status);

  // 9) ربط بلا audioId → 400
  res = await fetch(base + "/api/ai/transcriptions/tr_nope/link", { method: "POST", headers: auth, body: JSON.stringify({}) });
  check("link بلا audioId → 400", res.status === 400, "status=" + res.status);

  // 10) محاكاة كاملة: إنشاء سجل وسيط (بعد تجاوز الرفع) ثم حفظ وربط — ننشئ سجل يدوياً عبر transcribe مع mediaPath وهمي لكن سيمرر (لن يستدعي Voice-Pro حتى أول استطلاع)
  res = await fetch(base + "/api/ai/transcribe", { method: "POST", headers: auth, body: JSON.stringify({ mediaPath: { path: "/gradio_api/file/whatever", orig_name: "t.mp3" }, language: "arabic" }) });
  const rec = await j(res);
  check("إنشاء سجل مع mediaPath → 202", res.status === 202 && rec.id, "status=" + res.status + " id=" + (rec.id || ""));

  // 11) أول استطلاع سيفشل بسبب عدم توفر Voice-Pro لكن يجب أن يتحول السجل إلى failed
  if (rec.id) {
    await new Promise((r2) => setTimeout(r2, 500));
    res = await fetch(base + "/api/ai/transcriptions", { headers: auth });
    const after = await j(res);
    const mine = after.find((x) => x.id === rec.id);
    check("السجل تحول إلى failed بعد الاستطلاع", !!mine && mine.status === "failed", "status=" + (mine && mine.status) + " err=" + (mine && mine.error || "").slice(0, 80));

    // 12) PATCH حفظ النص
    res = await fetch(base + "/api/ai/transcriptions/" + rec.id, { method: "PATCH", headers: auth, body: JSON.stringify({ text_content: "نص تجريبي للاختبار" }) });
    const patched = await j(res);
    check("حفظ النص → 200", res.ok && patched.text_content === "نص تجريبي للاختبار", "text=" + (patched.text_content || ""));

    // 13) ربط بشريط
    if (someId) {
      res = await fetch(base + "/api/ai/transcriptions/" + rec.id + "/link", { method: "POST", headers: auth, body: JSON.stringify({ audioId: someId }) });
      const linked = await j(res);
      check("الربط بشريط → ok", res.ok && linked.ok, "status=" + res.status);
    }

    // 14) GET بالتصفية حسب الشريط
    if (someId) {
      res = await fetch(base + "/api/ai/transcriptions/" + encodeURIComponent(someId), { headers: auth });
      const filtered = await j(res);
      check("GET تصفية بالشريط", res.ok && Array.isArray(filtered), "count=" + (filtered.length ?? "?"));
    }

    // تنظيف: حذف سجل الاختبار
    await fetch(base + "/api/ai/transcriptions/" + rec.id, { method: "DELETE", headers: auth }).catch(() => {});
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log("\n==== " + (results.length - failed) + "/" + results.length + " ناجح ====");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("EXCEPTION:", e);
  process.exit(1);
} finally {
  setTimeout(() => server.close(), 500);
}
