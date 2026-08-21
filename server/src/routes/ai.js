/* وحدة الذكاء الاصطناعي — التحويل إلى نص عبر Voice-Pro
   النموذج: admin/transcriptions/{id} (قواعد admin تسمح للخادم بالقراءة والكتابة)
   التصميم: مهمة خلفية تُستأنف عبر استطلاع الحالة (كل طلب GET ينفّذ الخطوة التالية) */
import { Router } from "express";
import { authUser, adminOnly, logAction } from "../auth.js";
import { getNode, updateNode, setNode, pushNode, removeNode, listNode, nowISO, wrap } from "../fb.js";
import { getVoiceProUrl, setVoiceProUrl, vpUpload, vpStartPredict, vpPollEvent, summarizeEvents, srtToText } from "../voicepro.js";

const r = Router();
const T = "admin/transcriptions";

/* حل عنوان Voice-Pro: إعداد Firebase ← متغير البيئة ← افتراضي */
async function resolveVpUrl() {
  let url = "";
  try {
    url = (await getNode("admin/config/voicepro_url")) || "";
  } catch {}
  setVoiceProUrl(url || process.env.VOICE_PRO_URL || "http://127.0.0.1:7870");
  return getVoiceProUrl();
}

const MODELS = [
  "large-v3-turbo",
  "large-v3",
  "large-v2",
  "large",
  "medium",
  "small",
  "base",
  "tiny",
];

const LANGS = ["arabic", "english"];

const slug = (v, def) => (typeof v === "string" && /^[a-zA-Z0-9._-]{1,40}$/.test(v) ? v : def);

/* ---------- استعلام حالة Voice-Pro ---------- */
r.get("/config", authUser, adminOnly, wrap(async (_req, res) => {
  const vpUrl = await resolveVpUrl();
  let reachable = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const p = await fetch(`${vpUrl}/gradio_api/info`, { signal: ctrl.signal });
    clearTimeout(timer);
    reachable = p.ok;
  } catch {}
  res.json({ voiceproUrl: vpUrl, reachable, models: MODELS, languages: LANGS });
}));

/* ---------- حفظ عنوان Voice-Pro (يُخزن في Firebase) ---------- */
r.put("/config", authUser, adminOnly, wrap(async (req, res) => {
  const { voiceproUrl } = req.body || {};
  const url = typeof voiceproUrl === "string" ? voiceproUrl.trim().replace(/\/+$/, "") : "";
  if (url && !/^https?:\/\//.test(url)) return res.status(400).json({ error: "أدخل رابطاً صالحاً يبدأ بـ http:// أو https://" });
  await setNode("admin/config/voicepro_url", url || null);
  await resolveVpUrl();
  logAction(req, "ai.config.save", "config", "voicepro_url", { voiceproUrl: url });
  res.json({ ok: true, voiceproUrl: url || null });
}));

/* ---------- إنشاء مهمة تحويل ---------- */
r.post("/transcribe", authUser, adminOnly, wrap(async (req, res) => {
  await resolveVpUrl();
  const { audioId, mediaPath, language = "arabic", model = "large-v3-turbo", engine = "faster-whisper" } = req.body || {};
  if (!audioId && !mediaPath) return res.status(400).json({ error: "حدد شريطاً من المكتبة أو ارفع ملفاً صوتياً" });
  const lang = LANGS.includes(language) ? language : "arabic";
  const mdl = MODELS.includes(model) ? model : "large-v3-turbo";
  const eng = slug(engine, "faster-whisper");

  /* تحديد مصدر الملف الصوتي: رفع مباشر من اللوحة أو تنزيل رابط الشريط */
  let media = null;
  let sourceUrl = null;
  try {
    if (mediaPath && typeof mediaPath === "object" && (mediaPath.path || mediaPath.url)) {
      media = { path: mediaPath.path || mediaPath.url, name: mediaPath.orig_name || mediaPath.name || "audio" };
    } else if (typeof mediaPath === "string" && mediaPath) {
      media = { path: mediaPath, name: "audio" };
    } else if (audioId) {
      const audio = await getNode(`audios/${audioId}`);
      if (!audio) return res.status(404).json({ error: "الشريط غير موجود" });
      const url = audio.file_url || audio.archive_url;
      if (!url) return res.status(400).json({ error: "الشريط لا يحتوي رابط ملف" });
      const dl = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 (daralhadith-admin)" },
        signal: AbortSignal.timeout(180000),
      });
      if (!dl.ok) throw new Error(`تعذر تنزيل ملف الشريط (HTTP ${dl.status})`);
      const buf = await dl.arrayBuffer();
      media = await vpUpload(buf, `audio_${audioId}.mp3`);
      sourceUrl = url;
    }
  } catch (e) {
    return res.status(502).json({ error: e?.message || "تعذر تجهيز الملف الصوتي" });
  }
  if (!media) return res.status(400).json({ error: "تعذر الحصول على ملف صوتي" });

  const id = `tr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const now = nowISO();
  const rec = {
    id,
    audio_id: audioId || null,
    language: lang,
    model: mdl,
    engine: eng,
    status: "queued",
    stage: null,
    progress: 0,
    message: "قيد التحضير",
    media_path: media,
    source_url: sourceUrl,
    session_hash: `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    upload_event_id: null,
    transcribe_event_id: null,
    text_content: "",
    srt_content: "",
    error: "",
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  await setNode(`${T}/${id}`, rec);
  logAction(req, "ai.transcribe.start", "transcription", id, { audio_id: audioId, model: mdl, language: lang });
  res.status(202).json(rec);
}));

/* ---------- حفظ النص يدوياً ---------- */
r.patch("/transcriptions/:id", authUser, adminOnly, wrap(async (req, res) => {
  const id = req.params.id;
  const cur = await getNode(`${T}/${id}`);
  if (!cur) return res.status(404).json({ error: "غير موجود" });
  const { text_content, srt_content, language } = req.body || {};
  const upd = { updated_at: nowISO() };
  if (typeof text_content === "string") upd.text_content = text_content;
  if (typeof srt_content === "string") upd.srt_content = srt_content;
  if (language && LANGS.includes(language)) upd.language = language;
  await updateNode(`${T}/${id}`, upd);
  res.json({ ...cur, ...upd });
}));

/* ---------- ربط النص بشريط ---------- */
r.post("/transcriptions/:id/link", authUser, adminOnly, wrap(async (req, res) => {
  const id = req.params.id;
  const { audioId } = req.body || {};
  if (!audioId) return res.status(400).json({ error: "حدد الشريط" });
  const [rec, audio] = await Promise.all([getNode(`${T}/${id}`), getNode(`audios/${audioId}`)]);
  if (!rec) return res.status(404).json({ error: "النص غير موجود" });
  if (!audio) return res.status(404).json({ error: "الشريط غير موجود" });
  await Promise.all([
    updateNode(`${T}/${id}`, { audio_id: audioId, updated_at: nowISO() }),
    updateNode(`audios/${audioId}`, { transcription_id: id }),
  ]);
  logAction(req, "ai.transcribe.link", "transcription", id, { audio_id: audioId });
  res.json({ ok: true });
}));

/* ---------- حذف سجل تحويل ---------- */
r.delete("/transcriptions/:id", authUser, adminOnly, wrap(async (req, res) => {
  const id = req.params.id;
  const rec = await getNode(`${T}/${id}`);
  if (!rec) return res.status(404).json({ error: "غير موجود" });
  await removeNode(`${T}/${id}`);
  logAction(req, "ai.transcribe.delete", "transcription", id, { audio_id: rec.audio_id || null });
  res.json({ ok: true });
}));

/* ---------- تنفيذ الخطوة التالية من مهمة تحويل ---------- */
async function processRecord(id, rec) {
  const now = nowISO();
  const stale = (t) => !t || Date.now() - new Date(t).getTime() > 30_000;

  /* (1) البدء: تجهيز الصوت (upload_source) */
  if (rec.status === "queued" || (rec.status === "prep" && !rec.upload_event_id && stale(rec.updated_at))) {
    await updateNode(`${T}/${id}`, { status: "prep", stage: "upload", message: "جاري تجهيز الصوت...", updated_at: now });
    const eventId = await vpStartPredict(rec.session_hash, "upload_source", [rec.media_path, null, "", "good", "flac"]);
    await updateNode(`${T}/${id}`, { upload_event_id: eventId, updated_at: now });
    return;
  }

  /* (2) متابعة تجهيز الصوت */
  if (rec.status === "prep" && rec.upload_event_id) {
    const s = summarizeEvents(await vpPollEvent("upload_source", rec.upload_event_id));
    if (s.errorMsg) throw new Error(s.errorMsg);
    if (s.completeOutput != null) {
      await updateNode(`${T}/${id}`, { status: "run", stage: "transcribe", progress: 5, message: "جاري التحويل إلى نص...", updated_at: now });
    }
    return;
  }

  /* (3) البدء: النطق (transcribe) */
  if (rec.status === "run" && rec.stage === "transcribe" && !rec.transcribe_event_id) {
    const eventId = await vpStartPredict(rec.session_hash, "transcribe", [rec.engine, rec.model, rec.language, "default", false, 0]);
    await updateNode(`${T}/${id}`, { transcribe_event_id: eventId, updated_at: now });
    return;
  }

  /* (4) متابعة النطق */
  if (rec.status === "run" && rec.transcribe_event_id) {
    const s = summarizeEvents(await vpPollEvent("transcribe", rec.transcribe_event_id));
    if (s.errorMsg) throw new Error(s.errorMsg);
    if (s.completeOutput != null) {
      const srt = String(Array.isArray(s.completeOutput) ? s.completeOutput[1] : s.completeOutput);
      await updateNode(`${T}/${id}`, {
        status: "completed",
        progress: 100,
        text_content: srtToText(srt),
        srt_content: srt,
        message: "اكتمل التحويل",
        completed_at: now,
        updated_at: now,
      });
      return;
    }
    if (s.progress != null) {
      await updateNode(`${T}/${id}`, {
        progress: Math.max(5, Math.min(99, s.progress)),
        message: `جاري التحويل إلى نص... ${Math.max(5, Math.min(99, s.progress))}%`,
        updated_at: now,
      });
    }
  }
}

async function runWorker(all) {
  for (const { id, value } of all) {
    if (!value || !["queued", "prep", "run"].includes(value.status)) continue;
    try {
      await processRecord(id, value);
    } catch (e) {
      await updateNode(`${T}/${id}`, {
        status: "failed",
        error: String(e?.message || e).slice(0, 400),
        message: "فشل التحويل",
        updated_at: nowISO(),
        completed_at: nowISO(),
      }).catch(() => {});
    }
  }
}

/* ---------- قائمة التحويلات (تعمل كمشغّل للمهام عند الاستطلاع) ---------- */
r.get("/transcriptions", authUser, adminOnly, wrap(async (_req, res) => {
  await resolveVpUrl();
  const all = await listNode(T);
  await runWorker(all);
  const items = (await listNode(T)).map((x) => x.value).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  res.json(items);
}));

r.get("/transcriptions/:audioId", authUser, adminOnly, wrap(async (req, res) => {
  await resolveVpUrl();
  const all = await listNode(T);
  await runWorker(all);
  const items = (await listNode(T))
    .filter((x) => x.value && x.value.audio_id === req.params.audioId)
    .map((x) => x.value)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  res.json(items);
}));

export default r;
