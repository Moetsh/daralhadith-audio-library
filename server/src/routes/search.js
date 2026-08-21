import { Router } from "express";
import { mapNode, pushNode, wrap, nowISO } from "../fb.js";

const r = Router();

/* بحث موحد عبر الأشرطة/العلماء/السلاسل/التصنيفات */
r.get("/", wrap(async (req, res) => {
  const qq = (req.query.q || "").trim();
  const type = req.query.type || "all";
  const category = req.query.category || null;
  const scholar = req.query.scholar || null;
  const limit = Math.min(50, parseInt(req.query.n, 10) || 20);

  const [audios, scholars, series, categories] = await Promise.all([
    mapNode("audios"), mapNode("scholars"), mapNode("series"), mapNode("categories"),
  ]);
  const like = (x) => (x || "").toLowerCase().includes(qq.toLowerCase());

  const out = {};
  if (type === "all" || type === "audios") {
    let rows = Object.values(audios).filter(
      (a) =>
        a.status === "published" &&
        (qq === "" || like(a.title) || like(a.description) || like(scholars[a.scholar_id]?.name)) &&
        (!category || a.category_id === category) &&
        (!scholar || a.scholar_id === scholar)
    );
    rows.sort((a, b) => (b.listen_count || 0) - (a.listen_count || 0));
    out.audios = rows.slice(0, limit).map((a) => ({ ...a, scholar_name: scholars[a.scholar_id]?.name ?? null }));
  }
  if (type === "all" || type === "scholars") {
    out.scholars = Object.values(scholars).filter((s) => qq === "" || like(s.name)).sort((a, b) => (a.name || "").localeCompare(b.name || "ar")).slice(0, limit);
  }
  if (type === "all" || type === "series") {
    out.series = Object.values(series)
      .filter((s) => qq === "" || like(s.title) || like(scholars[s.scholar_id]?.name))
      .sort((a, b) => (a.title || "").localeCompare(b.title || "ar"))
      .slice(0, limit);
  }
  if (type === "all" || type === "categories") {
    out.categories = Object.values(categories).filter((c) => qq === "" || like(c.name)).sort((a, b) => (a.name || "").localeCompare(b.name || "ar")).slice(0, limit);
  }
  if (qq) {
    const results_count = (out.audios?.length || 0) + (out.scholars?.length || 0) + (out.series?.length || 0) + (out.categories?.length || 0);
    await pushNode("admin/search_logs", { query: qq, results_count, user_id: null, searched_at: nowISO() });
  }
  res.json(out);
}));

export default r;
