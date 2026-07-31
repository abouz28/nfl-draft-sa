import { useMemo, useState } from "react";
import { fmt, pfmt, useTip } from "./ui.jsx";

function PanelScatter({ points }) {
  const tip = useTip();
  const [signal, setSignal] = useState("gpa_z");
  const seasons = useMemo(
    () => [...new Set(points.map((p) => p.season))].sort(), [points]);
  const [on, setOn] = useState(() => new Set(seasons.filter((s) => s <= 2024)));

  const toggle = (s) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { if (next.size > 1) next.delete(s); }
      else next.add(s);
      return next;
    });

  const rows = points.filter(
    (p) => on.has(p.season) && p.resid != null && p[signal] != null);
  const col = signal === "gpa_z" ? "var(--expert)" : "var(--fans)";

  const W = 940, H = 400, padL = 56, padR = 18, padT = 14, padB = 44;
  const xs = rows.map((r) => r[signal]), ys = rows.map((r) => r.resid);
  const xSpan = Math.max(1.5, ...xs.map(Math.abs)) * 1.1;
  const ySpan = Math.max(0.05, ...ys.map(Math.abs)) * 1.15;
  const X = (v) => padL + ((v + xSpan) / (2 * xSpan)) * (W - padL - padR);
  const Y = (v) => padT + ((ySpan - v) / (2 * ySpan)) * (H - padT - padB);

  const fit = useMemo(() => {
    if (rows.length < 3) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    rows.forEach((r) => {
      num += (r[signal] - mx) * (r.resid - my);
      den += (r[signal] - mx) ** 2;
    });
    if (den === 0) return null;
    return { a: my - (num / den) * mx, b: num / den };
  }, [rows, signal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card">
      <div className="explorer-controls">
        <div className="seg" role="group" aria-label="Signal">
          <button className={signal === "gpa_z" ? "on expert" : ""}
            onClick={() => setSignal("gpa_z")}>Expert consensus (18–29 outlets)</button>
          <button className={signal === "fan_year_z" ? "on fans" : ""}
            onClick={() => setSignal("fan_year_z")}>Fanbase class mood</button>
        </div>
        {seasons.map((s) => (
          <button key={s} className={`yearchip ${on.has(s) ? "on" : ""}`}
            aria-pressed={on.has(s)} onClick={() => toggle(s)}>
            {s}{s === 2025 ? " (holdout)" : ""}
          </button>
        ))}
        <span className="count" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>
          {rows.length} team-classes
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label="Team-class signal versus realized above-slot outcome">
        {[-ySpan, 0, ySpan].map((v) => (
          <g key={`y${v}`}>
            <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)}
              stroke={v === 0 ? "var(--baseline)" : "var(--grid)"} strokeWidth={1} />
            <text className="axis-t" x={padL - 8} y={Y(v) + 4} textAnchor="end">{fmt(v, 2)}</text>
          </g>
        ))}
        {[-xSpan, 0, xSpan].map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} y1={padT} x2={X(v)} y2={H - padB}
              stroke={v === 0 ? "var(--baseline)" : "var(--grid)"} strokeWidth={1} />
            <text className="axis-t" x={X(v)} y={H - padB + 16} textAnchor="middle">{fmt(v, 1)}</text>
          </g>
        ))}
        <text className="axis-t" x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle">
          {signal === "gpa_z" ? "consensus GPA (z within year)" : "fanbase class sentiment (z within year)"}
        </text>
        <text className="axis-t" transform={`translate(14 ${(padT + H - padB) / 2}) rotate(-90)`}
          textAnchor="middle">class outcome above slot</text>

        {fit && (
          <line x1={X(-xSpan)} y1={Y(fit.a + fit.b * -xSpan)}
            x2={X(xSpan)} y2={Y(fit.a + fit.b * xSpan)}
            stroke={col} strokeWidth={2} strokeDasharray="6 5" opacity={0.55} />
        )}
        {rows.map((r) => (
          <g key={`${r.season}${r.team}`}>
            <circle cx={X(r[signal])} cy={Y(r.resid)} r={5.5} fill={col}
              stroke="var(--surface)" strokeWidth={2}
              onPointerMove={(e) => tip.show(e, `${r.team} — class of ${r.season}`, [
                `consensus GPA ${r.gpa} (${fmt(r.gpa_z)}z)`,
                r.fan_year_z != null ? `fanbase mood ${fmt(r.fan_year_z)}z` : "",
                `realized ${fmt(r.resid, 3)} vs slot`,
              ].filter(Boolean))}
              onPointerLeave={tip.hide}
            />
            <text className="axis-t" x={X(r[signal])} y={Y(r.resid) - 8}
              textAnchor="middle" style={{ fontSize: 9.5 }}>{r.team}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Receipts({ receipts }) {
  const Row = ({ r }) => (
    <div className="read-row">
      <span className="z">{r.gpa.toFixed(2)}</span>
      <span className="who2"><b>{r.team}</b> <span className="meta">class of {r.season}</span></span>
      <span className={`z ${r.class_resid > 0 ? "hi" : ""}`}>{fmt(r.class_resid, 3)}</span>
    </div>
  );
  return (
    <div className="reads" style={{ marginTop: 14 }}>
      <div className="card read-card">
        <h3 className="disp">Darlings that flopped</h3>
        <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 6 }}>
          top-graded classes · GPA → realized vs slot
        </div>
        {receipts.darlings.map((r) => <Row r={r} key={`${r.season}${r.team}`} />)}
      </div>
      <div className="card read-card">
        <h3 className="disp">Punching bags that hit</h3>
        <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 6 }}>
          bottom-graded classes · GPA → realized vs slot
        </div>
        {receipts.bags.map((r) => <Row r={r} key={`${r.season}${r.team}`} />)}
      </div>
    </div>
  );
}

export function Panel({ panel }) {
  const agreeBack = panel.agreement.filter((a) => a.season <= 2024);
  const meanAgree = agreeBack.reduce((s, a) => s + a.r, 0) / agreeBack.length;
  return (
    <>
      <PanelScatter points={panel.points} />
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>
          Team-class regressions, 2021–2024 (outcome already slot-adjusted; HC3 errors)
        </div>
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th><th className="num">n</th>
                <th className="num">Consensus coef</th><th className="num">p</th>
                <th className="num">Fans coef</th><th className="num">p</th>
              </tr>
            </thead>
            <tbody>
              {panel.specs.map((s) => (
                <tr key={s.model}>
                  <td>{s.model}</td>
                  <td className="num">{s.n}</td>
                  <td className="num">{fmt(s.gpa?.coef, 4)}</td>
                  <td className="num pcell">{s.gpa ? pfmt(s.gpa.p) : "—"}</td>
                  <td className={`num ${s.fan && s.fan.p < 0.06 ? "sig" : ""}`}>{fmt(s.fan?.coef, 4)}</td>
                  <td className="num pcell">{s.fan ? pfmt(s.fan.p) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 10 }}>
          Fan mood and the consensus are nearly <b style={{ color: "var(--ink)" }}>uncorrelated
          </b> (mean r = {meanAgree.toFixed(2)} across the backtest years) — the crowd is not
          echoing the grade shows; it knows different things.
        </div>
      </div>
      <Receipts receipts={panel.receipts} />
    </>
  );
}
