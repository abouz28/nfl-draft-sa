import { useMemo, useState } from "react";
import { fmt, useTip, GradeChip } from "./ui.jsx";

export function Explorer({ picks }) {
  const tip = useTip();
  const [signal, setSignal] = useState("fans");
  const seasons = useMemo(() => [...new Set(picks.map((p) => p.season))].sort(), [picks]);
  const [on, setOn] = useState(() => new Set(seasons));
  const [pinned, setPinned] = useState(null);

  const toggleSeason = (s) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { if (next.size > 1) next.delete(s); }
      else next.add(s);
      return next;
    });

  const rows = picks.filter((p) => on.has(p.season));
  const xKey = signal === "fans" ? "sent_z" : "grade_z";
  const col = signal === "fans" ? "var(--fans)" : "var(--expert)";

  const W = 940, H = 380, padL = 56, padR = 18, padT = 14, padB = 44;
  const xs = rows.map((r) => r[xKey]), ys = rows.map((r) => r.resid);
  const xSpan = Math.max(1.5, ...xs.map(Math.abs)) * 1.1;
  const ySpan = Math.max(0.25, ...ys.map(Math.abs)) * 1.1;
  const X = (v) => padL + ((v + xSpan) / (2 * xSpan)) * (W - padL - padR);
  const Y = (v) => padT + ((ySpan - v) / (2 * ySpan)) * (H - padT - padB);

  // least-squares fit line through the visible points
  const fit = useMemo(() => {
    if (rows.length < 3) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    rows.forEach((r) => {
      num += (r[xKey] - mx) * (r.resid - my);
      den += (r[xKey] - mx) ** 2;
    });
    if (den === 0) return null;
    const b = num / den, a = my - b * mx;
    return { a, b };
  }, [rows, xKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticksX = [-xSpan, -xSpan / 2, 0, xSpan / 2, xSpan];
  const ticksY = [-ySpan, 0, ySpan];

  return (
    <div className="card">
      <div className="explorer-controls">
        <div className="seg" role="group" aria-label="Signal">
          <button className={signal === "fans" ? "on fans" : ""} onClick={() => setSignal("fans")}>
            Fanbase reaction
          </button>
          <button className={signal === "expert" ? "on expert" : ""} onClick={() => setSignal("expert")}>
            Expert grade
          </button>
        </div>
        {seasons.map((s) => (
          <button key={s} className={`yearchip ${on.has(s) ? "on" : ""}`}
            aria-pressed={on.has(s)} onClick={() => toggleSeason(s)}>
            {s}{s === 2025 ? " (holdout)" : ""}
          </button>
        ))}
        <span className="count" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>
          {rows.length} picks · click a dot to pin it
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label="Each pick's signal versus its realized above-slot outcome">
        {ticksY.map((v) => (
          <g key={`y${v}`}>
            <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)}
              stroke={v === 0 ? "var(--baseline)" : "var(--grid)"} strokeWidth={1} />
            <text className="axis-t" x={padL - 8} y={Y(v) + 4} textAnchor="end">{fmt(v, 2)}</text>
          </g>
        ))}
        {ticksX.map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} y1={padT} x2={X(v)} y2={H - padB}
              stroke={v === 0 ? "var(--baseline)" : "var(--grid)"} strokeWidth={1} />
            <text className="axis-t" x={X(v)} y={H - padB + 16} textAnchor="middle">{fmt(v, 1)}</text>
          </g>
        ))}
        <text className="axis-t" x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle">
          {signal === "fans" ? "fanbase sentiment (z, within team-year)" : "expert grade (z, within class)"}
        </text>
        <text className="axis-t" transform={`translate(14 ${(padT + H - padB) / 2}) rotate(-90)`}
          textAnchor="middle">outcome above slot (class percentile)</text>

        {fit && (
          <line x1={X(-xSpan)} y1={Y(fit.a + fit.b * -xSpan)}
            x2={X(xSpan)} y2={Y(fit.a + fit.b * xSpan)}
            stroke={col} strokeWidth={2} strokeDasharray="6 5" opacity={0.55} />
        )}

        {rows.map((r) => (
          <circle key={`${r.season}-${r.pick}`} className="explorer-dot"
            cx={X(r[xKey])} cy={Y(r.resid)} r={5.5} fill={col}
            stroke="var(--surface)" strokeWidth={2}
            opacity={pinned && (pinned.season !== r.season || pinned.pick !== r.pick) ? 0.45 : 1}
            onPointerMove={(e) => tip.show(e, `${r.player} — ${r.team} #${r.pick} (${r.season})`, [
              `fanbase ${fmt(r.sent_z)} · expert ${fmt(r.grade_z)} (${r.grade})`,
              `outcome vs slot ${fmt(r.resid, 2)} percentile`,
              `${r.n_comments.toLocaleString()} comments`,
            ])}
            onPointerLeave={tip.hide}
            onClick={() => setPinned(r)}
          />
        ))}
      </svg>

      {pinned && (
        <div className="pin-card">
          <b>{pinned.player}</b>
          <span>{pinned.team} · #{pinned.pick} · {pinned.pos} · class of {pinned.season}</span>
          <span>Walt said <GradeChip g={pinned.grade} /></span>
          <span>fanbase {fmt(pinned.sent_z)}σ on {pinned.n_comments.toLocaleString()} comments</span>
          <span>outcome {fmt(pinned.resid, 2)} vs slot</span>
          {pinned.top_thread && (
            <span style={{ flexBasis: "100%" }}>
              biggest thread: “{pinned.top_thread}” ({pinned.top_thread_n?.toLocaleString()} comments)
            </span>
          )}
          <button className="close" aria-label="Unpin" onClick={() => setPinned(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
