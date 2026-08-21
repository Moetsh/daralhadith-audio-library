/* محاكي Voice-Pro (Gradio) — للاختبار المحلي فقط
   ينفّذ بروتوكول gradio >= 4.44: /gradio_api/upload و/call/<fn> و/info
   التشغيل: node scripts/mock-voicepro.mjs  (المنفذ الافتراضي 7870) */
import http from "node:http";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 7870);
const jobs = new Map(); // event_id -> { api, events: [], done }
const files = new Map(); // path -> Buffer
export const mockFiles = files;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const sseMsg = (event_id, event_type, extra = {}) =>
  `data: ${JSON.stringify({ event_id, event_type, ...extra })}\n\n`;

function pushEvent(job, ev) {
  job.events.push(ev);
}

function writeEvent(job, res, ev) {
  const full = { event_id: job.eventId, ...ev };
  pushEvent(job, full);
  const msg = sseMsg(full.event_id, full.event_type, full);
  try { res.write(msg); } catch {}
  if (job.res && job.res !== res) {
    try {
      job.res.write(msg);
      if (full.event_type === "complete") job.res.end();
    } catch {}
  }
}

/* قراءة كامل الجسم كـ Buffer */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* تحليل multipart بسيط لاستخراج حقل files واحد */
function parseMultipart(body, contentType) {
  const m = /boundary=([^;]+)/.exec(contentType || "");
  if (!m) return null;
  const boundary = Buffer.from("--" + m[1].trim());
  const parts = [];
  let start = 0;
  while (true) {
    const idx = body.indexOf(boundary, start);
    if (idx === -1) break;
    const next = body.indexOf(boundary, idx + boundary.length);
    if (next === -1) break;
    parts.push(body.subarray(idx + boundary.length, next));
    start = next;
  }
  for (const part of parts) {
    const sep = part.indexOf("\r\n\r\n");
    if (sep === -1) continue;
    const head = part.subarray(0, sep).toString("latin1");
    const data = part.subarray(sep + 4, part.length - 2);
    const nameM = /name="([^"]+)"/.exec(head);
    const fileM = /filename="([^"]*)"/.exec(head);
    if (nameM && nameM[1] === "files") return { filename: fileM ? fileM[1] : "upload.bin", data };
  }
  return null;
}

const ARABIC_LINES = [
  "بسم الله الرحمن الرحيم",
  "الحمد لله رب العالمين والصلاة والسلام على رسول الله",
  "أما بعد فإن أصدق الحديث كتاب الله تعالى",
  "وخير الهدي هدي محمد صلى الله عليه وسلم",
  "وشر الأمور محدثاتها وكل محدثة بدعة",
  "وكل بدعة ضلالة وكل ضلالة في النار",
  "فإن الله جعل لهذا الدين أئمة وهداة يدعون إلى الخير",
  "ويهدون إلى الحق ويرشدون إلى سبيله المستقيم",
];

function makeSrt() {
  let t = 0;
  const blocks = ARABIC_LINES.map((line, i) => {
    const s = new Date(t * 1000).toISOString().slice(11, 23).replace(".", ",");
    t += 4500 + (i % 3) * 1000;
    const e = new Date(t * 1000).toISOString().slice(11, 23).replace(".", ",");
    return `${i + 1}\n${s} --> ${e}\n${line}\n`;
  });
  return blocks.join("\n");
}

function startUploadSourceJob(session, eventId, res) {
  const job = { eventId, api: "upload_source", events: [], done: false, timer: null };
  jobs.set(eventId, job);
  writeEvent(job, res, { event_type: "generating", data: null });
  job.timer = setTimeout(() => {
    writeEvent(job, res, {
      event_type: "progress",
      data: null,
      progress_data: [{ index: 0, length: 1, progress: 0.5, unit: "steps", desc: "Extracting audio..." }],
    });
  }, 150);
  job.timer2 = setTimeout(() => {
    writeEvent(job, res, {
      event_type: "complete",
      output: { data: [null, { path: "/gradio_api/file/source_audio.wav", orig_name: "source_audio.wav" }] },
    });
    job.done = true;
    try { res.end(); } catch {}
  }, 350);
  job.stop = () => { clearTimeout(job.timer); clearTimeout(job.timer2); };
}

function startTranscribeJob(session, eventId, res, payload) {
  const job = { eventId, api: "transcribe", events: [], done: false, timer: null };
  jobs.set(eventId, job);
  writeEvent(job, res, { event_type: "generating", data: null });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    job[`t${i}`] = setTimeout(() => {
      const progress = i / steps;
      writeEvent(job, res, {
        event_type: "progress",
        data: null,
        progress_data: [{ index: 0, length: 1, progress, unit: "steps", desc: `Transcribing... ${Math.round(progress * 100)}%` }],
      });
      if (i === steps) {
        const srt = makeSrt();
        writeEvent(job, res, {
          event_type: "complete",
          output: { data: [null, srt, [{ path: "/gradio_api/file/out.srt", orig_name: "out.srt" }]] },
        });
        job.done = true;
        try { res.end(); } catch {}
      }
    }, 300 * i);
  }
  job.stop = () => { for (let i = 1; i <= steps; i++) clearTimeout(job[`t${i}`]); };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  const headers = { ...CORS, "content-type": "application/json; charset=utf-8" };
  const url = new URL(req.url, "http://x");

  if (req.method === "GET" && url.pathname === "/gradio_api/info") {
    res.writeHead(200, headers);
    return res.end(JSON.stringify({
      named_endpoints: { upload_source: { fn_index: 0 }, transcribe: { fn_index: 1 } },
      api_name: "predict",
    }));
  }

  if (req.method === "GET" && url.pathname.startsWith("/gradio_api/file/")) {
    const buf = files.get(url.pathname);
    if (!buf) { res.writeHead(404, headers); return res.end("{}"); }
    res.writeHead(200, { ...CORS, "content-type": "application/octet-stream", "content-length": buf.length });
    return res.end(buf);
  }

  if (req.method === "POST" && url.pathname === "/gradio_api/upload") {
    const body = await readBody(req);
    const part = parseMultipart(body, req.headers["content-type"]);
    if (!part) { res.writeHead(400, headers); return res.end(JSON.stringify({ error: "no files" })); }
    const path = `/gradio_api/file/${randomBytes(8).toString("hex")}_${part.filename}`;
    files.set(path, part.data);
    console.log(`[mock-voicepro] uploaded ${path} (${(part.data.length / 1048576).toFixed(1)} MB)`);
    res.writeHead(200, headers);
    return res.end(JSON.stringify([{ name: part.filename, data: null, is_file: true, orig_name: part.filename, path, size: part.data.length, url: null }]));
  }

  const callMatch = /^\/gradio_api\/call\/([^/]+)\/?$/.exec(url.pathname);
  if (req.method === "POST" && callMatch) {
    const apiName = callMatch[1];
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const session = body.session_hash || "mock";
    const data = body.data || [];
    const eventId = randomBytes(8).toString("hex");
    res.writeHead(200, { ...CORS, "content-type": "text/event-stream", "cache-control": "no-cache" });
    if (apiName === "upload_source") startUploadSourceJob(session, eventId, res);
    else if (apiName === "transcribe") startTranscribeJob(session, eventId, res, data);
    else {
      res.write(sseMsg(eventId, "error", { output: { error: `unknown api: ${apiName}` } }));
      res.end();
    }
    return;
  }

  const pollMatch = /^\/gradio_api\/call\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
  if (req.method === "GET" && pollMatch) {
    const eventId = pollMatch[2];
    const job = jobs.get(eventId);
    if (!job) { res.writeHead(404, headers); return res.end("{}"); }
    res.writeHead(200, { ...CORS, "content-type": "text/event-stream", "cache-control": "no-cache" });
    for (const ev of job.events) res.write(sseMsg(ev.event_id, ev.event_type, ev));
    if (job.done) return res.end();
    job.res = res;
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(PORT, () => console.log(`[mock-voicepro] listening on http://127.0.0.1:${PORT}`));

process.on("SIGINT", () => { server.close(); process.exit(0); });
