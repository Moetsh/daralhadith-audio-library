export default async function handler(req, res) {
  const { url } = req.query;
  if (!url || !url.includes("github.com")) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch" });
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="DarAlHadith.apk"');
    res.setHeader("Cache-Control", "no-cache");
    const reader = r.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    await pump();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
