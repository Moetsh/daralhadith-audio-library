export function AreaChart({ data, height = 200, color = "#dc6a1c" }) {
  if (!data || data.length === 0)
    return <div className="py-10 text-center text-ink3 text-sm">لا توجد بيانات</div>;
  const w = 640;
  const h = height;
  const max = Math.max(...data.map((d) => d.count || 0), 1);
  const n = data.length;
  const step = w / (n - 1 || 1);
  const pts = data.map((d, i) => [i * step, h - ((d.count || 0) / max) * (h - 26) - 6]);
  const line = pts.map((p, i) => (i ? `L${p[0].toFixed(1)},${p[1].toFixed(1)}` : `M${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lbl, rbl] = [data[0].date, data[n - 1].date];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="rgba(217,105,31,0.08)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={n > 40 ? 0 : 3} fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      <text x="0" y={h - 2} fontSize="10" fill="#ab987f">{lbl}</text>
      <text x={w} y={h - 2} fontSize="10" fill="#ab987f" textAnchor="end">{rbl}</text>
    </svg>
  );
}

export function HBarList({ data, color = "#f58024", limit = 10 }) {
  if (!data || data.length === 0)
    return <div className="py-8 text-center text-ink3 text-sm">لا توجد بيانات</div>;
  const rows = data.slice(0, limit);
  const max = Math.max(...rows.map((r) => Number(r.count || r.audios || 0)), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const name = r.name || r.scholar_name || r.title || r.id;
        const val = Number(r.count ?? r.listens ?? r.audios ?? 0);
        const pct = Math.max((val / max) * 100, 2);
        return (
          <div key={r.id || name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-bold text-ink truncate">{name}</span>
              <span className="text-ink3 font-bold tabular-nums">{val.toLocaleString("ar-EG")}</span>
            </div>
            <div className="h-2 rounded-full bg-bg2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: pct + "%", background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
