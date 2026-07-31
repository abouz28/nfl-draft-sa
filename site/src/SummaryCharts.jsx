import { fmt, pfmt, useTip } from "./ui.jsx";

export function Funnel({ stages }) {
  const tip = useTip();
  const W = 560, rowH = 52, H = stages.length * rowH + 6;
  const max = Math.max(...stages.map((s) => s.n));
  const ramp = ["var(--r1)", "var(--r2)", "var(--r3)", "var(--r4)"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Pipeline funnel">
      {stages.map((s, i) => {
        const bw = Math.max(4, (s.n / max) * (W - 130));
        const y = i * rowH + 4;
        return (
          <g key={s.stage}>
            <text className="lab-t" x={0} y={y + 12}>{s.stage}</text>
            <rect
              x={0} y={y + 20} width={bw} height={16} rx={4}
              fill={ramp[i] || ramp[3]}
              onPointerMove={(e) => tip.show(e, s.stage, [s.n.toLocaleString() + " items"])}
              onPointerLeave={tip.hide}
            />
            <text className="val-t" x={bw + 8} y={y + 33}>{s.n.toLocaleString()}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Histogram({ bins, posShare }) {
  const tip = useTip();
  const W = 420, H = 190, padL = 6, padB = 26, padT = 24;
  const max = Math.max(...bins.map((b) => b.n), 1);
  const bw = (W - padL * 2) / bins.length;
  const x0 = bins[0].x0, x1 = bins[bins.length - 1].x1;
  const xz = padL + ((0 - x0) / (x1 - x0)) * (W - padL * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Distribution of per-pick mean sentiment">
      <line x1={padL} y1={H - padB} x2={W - padL} y2={H - padB}
        stroke="var(--baseline)" strokeWidth={1} />
      {bins.map((b, i) => {
        const bh = (b.n / max) * (H - padB - padT);
        const x = padL + i * bw;
        return (
          <rect key={i} x={x + 1} y={H - padB - bh}
            width={Math.max(1, bw - 2)} height={bh} rx={bh > 6 ? 3 : 0}
            fill="var(--fans)"
            onPointerMove={(e) => tip.show(e, `${b.x0} to ${b.x1}`,
              [b.n + (b.n === 1 ? " pick" : " picks")])}
            onPointerLeave={tip.hide}
          />
        );
      })}
      <line x1={xz} y1={padT - 10} x2={xz} y2={H - padB}
        stroke="var(--baseline)" strokeWidth={1} />
      <text className="axis-t" x={xz - 4} y={H - padB + 15} textAnchor="end">0</text>
      <text className="axis-t" x={padL} y={H - padB + 15}>{x0}</text>
      <text className="axis-t" x={W - padL} y={H - padB + 15} textAnchor="end">+{x1}</text>
      <text className="val-t" x={Math.min(xz + 10, W - 160)} y={padT}>
        {posShare}% land positive
      </text>
    </svg>
  );
}

export function CoefChart({ models }) {
  const tip = useTip();
  const rows = [];
  models.forEach((m) => {
    if (m.sent) rows.push({ model: m.model, who: "fans", label: "Fan sentiment", ...m.sent });
    if (m.grade) rows.push({ model: m.model, who: "expert", label: "Expert grade", ...m.grade });
  });
  const groups = [...new Set(rows.map((r) => r.model))];
  const W = 940, rowH = 46, padL = 140, padR = 90, padT = 8, padB = 34;
  const H = groups.length * rowH + padT + padB;
  const lo = Math.min(...rows.map((r) => r.lo), -0.02);
  const hi = Math.max(...rows.map((r) => r.hi), 0.02);
  const span = Math.max(Math.abs(lo), Math.abs(hi)) * 1.08;
  const X = (v) => padL + ((v + span) / (2 * span)) * (W - padL - padR);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Coefficients with 95% intervals">
      {[-span, -span / 2, 0, span / 2, span].map((v) => (
        <g key={v}>
          <line x1={X(v)} y1={padT} x2={X(v)} y2={H - padB}
            stroke={v === 0 ? "var(--baseline)" : "var(--grid)"} strokeWidth={1} />
          <text className="axis-t" x={X(v)} y={H - padB + 16} textAnchor="middle">
            {v === 0 ? "0" : fmt(v, 2)}
          </text>
        </g>
      ))}
      <text className="axis-t" x={X(0)} y={H - 4} textAnchor="middle">
        effect on above-slot outcome (class percentile) per +1σ
      </text>
      {groups.map((g, gi) => {
        const members = rows.filter((r) => r.model === g);
        const cy = padT + gi * rowH + rowH / 2;
        return (
          <g key={g}>
            <text className="lab-t" x={0} y={cy + 4}>{g}</text>
            {members.map((r, mi) => {
              const y = cy + (members.length === 1 ? 0 : mi === 0 ? -8 : 8);
              const col = r.who === "fans" ? "var(--fans)" : "var(--expert)";
              return (
                <g key={r.who}>
                  <line x1={X(r.lo)} y1={y} x2={X(r.hi)} y2={y}
                    stroke={col} strokeWidth={2} strokeLinecap="round" />
                  <circle cx={X(r.coef)} cy={y} r={5.5} fill={col}
                    stroke="var(--surface)" strokeWidth={2}
                    onPointerMove={(e) => tip.show(e, `${r.label} — ${r.model}`, [
                      `coefficient ${fmt(r.coef, 4)}`,
                      `95% CI ${fmt(r.lo, 3)} to ${fmt(r.hi, 3)}`,
                      pfmt(r.p),
                    ])}
                    onPointerLeave={tip.hide}
                  />
                  <text className="val-t" x={X(r.hi) + 8} y={y + 4}>{fmt(r.coef, 3)}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function RobustTable({ rows }) {
  return (
    <div className="tbl-scroll">
      <table>
        <thead>
          <tr>
            <th>Variant</th><th className="num">n</th>
            <th className="num">Fans coef</th><th className="num">p</th>
            <th className="num">Expert coef</th><th className="num">p</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variant}>
              <td>{r.variant}</td>
              <td className="num">{r.n}</td>
              <td className={`num ${r.sent && r.sent.p < 0.05 ? "sig" : ""}`}>{fmt(r.sent?.coef, 3)}</td>
              <td className="num pcell">{r.sent ? r.sent.p.toFixed(3) : "—"}</td>
              <td className={`num ${r.grade && r.grade.p < 0.05 ? "sig" : ""}`}>{fmt(r.grade?.coef, 3)}</td>
              <td className="num pcell">{r.grade ? r.grade.p.toFixed(3) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
