/* عميل Voice-Pro (Gradio) — تنفيذ التحويل إلى نص عبر بروتوكول gradio >= 4.44
   العنوان يُحلّ بالترتيب: إعداد Firebase admin/config/voicepro_url ← VOICE_PRO_URL ← http://127.0.0.1:7870 */
let VP_BASE = (process.env.VOICE_PRO_URL || "http://127.0.0.1:7870").replace(/\/+$/, "");

export const setVoiceProUrl = (u) => {
  if (typeof u === "string" && u.trim()) VP_BASE = u.trim().replace(/\/+$/, "");
};
export const getVoiceProUrl = () => VP_BASE;

const ERR_VP = "تعذر الوصول إلى خادم Voice-Pro";

/* رفع ملف وسائط إلى مساحة الخادم — يعيد كائن المسار { path, name } */
export async function vpUpload(fileBuffer, filename) {
  const fd = new FormData();
  fd.append("files", new Blob([fileBuffer], { type: "application/octet-stream" }), filename);
  let res;
  try {
    res = await fetch(`${VP_BASE}/gradio_api/upload`, { method: "POST", body: fd, signal: AbortSignal.timeout(180000) });
  } catch {
    throw new Error(`${ERR_VP} (الرفع — تحقق من VOICE_PRO_URL)`);
  }
  if (!res.ok) throw new Error(`${ERR_VP} (upload HTTP ${res.status})`);
  const arr = await res.json();
  const f = Array.isArray(arr) ? arr[0] : arr;
  if (!f || !(f.path || f.url)) throw new Error(`${ERR_VP} (استجابة رفع غير صالحة)`);
  return { path: f.path || f.url, name: f.orig_name || filename };
}

/* تحليل دفق Server-Sent Events من Gradio */
function parseSSE(text) {
  const events = [];
  for (const block of String(text).split("\n\n")) {
    const line = block.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice(5).trim()));
    } catch {}
  }
  return events;
}

/* بدء نداء Gradio: يعيد event_id فور ظهور أول حدث (ثم يغلق الاتصال، ويستمر التنفيذ على الخادم) */
export async function vpStartPredict(sessionHash, apiName, data, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${VP_BASE}/gradio_api/call/${apiName}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, session_hash: sessionHash }),
      signal: ctrl.signal,
    });
  } catch {
    throw new Error(`${ERR_VP} (${apiName})`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`${ERR_VP} (${apiName} HTTP ${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let eventId = null;
  let lastErr = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    for (const ev of parseSSE(buf)) {
      if (ev.event_id && !eventId) eventId = ev.event_id;
      if (ev.event_type === "error") lastErr = String(ev.output?.error || ev.output || "خطأ").slice(0, 300);
    }
    if (eventId || lastErr) break;
  }
  try { await reader.cancel(); } catch {}
  if (lastErr) throw new Error(lastErr);
  if (!eventId) throw new Error(`${ERR_VP} (لا استجابة من ${apiName})`);
  return eventId;
}

/* جلب سجل أحداث نداء سابق */
export async function vpPollEvent(apiName, eventId, timeoutMs = 9000) {
  let text = "";
  try {
    const res = await fetch(`${VP_BASE}/gradio_api/call/${apiName}/${eventId}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") return []; /* لا أحداث بعد — استطلاع لاحق */
    throw new Error(`${ERR_VP} (استطلاع ${apiName})`);
  }
  return parseSSE(text);
}

/* استخراج التقدم/النتيجة/الخطأ من أحداث Gradio */
export function summarizeEvents(events) {
  let progress = null;
  let completeOutput = null;
  let errorMsg = null;
  for (const ev of events) {
    if (ev.event_type === "progress" && Array.isArray(ev.progress_data)) {
      const p = ev.progress_data[0];
      if (p && typeof p.progress === "number") progress = Math.round(p.progress * 100);
    }
    if (ev.event_type === "complete") completeOutput = ev.output?.data ?? ev.output ?? null;
    if (ev.event_type === "error") errorMsg = String(ev.output?.error || ev.output || "خطأ في Voice-Pro");
  }
  return { progress, completeOutput, errorMsg };
}

/* تحويل نص SRT إلى نص عادي */
export function srtToText(srt) {
  const out = [];
  for (const block of String(srt).split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 3 || !/^\d+$/.test(lines[0].trim())) continue;
    out.push(lines.slice(2).join(" "));
  }
  return out.join("\n");
}
