import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export const fmt = (x, d = 2) =>
  x == null ? "—" : (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d);
export const pfmt = (p) =>
  p == null ? "" : p < 0.001 ? "p<0.001" : "p=" + p.toFixed(3);

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- tooltip ---- */
const TipContext = createContext(null);

export function TipProvider({ children }) {
  const [tip, setTip] = useState(null);
  const show = useCallback((evt, title, rows) => {
    setTip({ x: evt.clientX, y: evt.clientY, title, rows });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return (
    <TipContext.Provider value={{ show, hide }}>
      {children}
      {tip && <TipBox tip={tip} />}
    </TipContext.Provider>
  );
}

function TipBox({ tip }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 14, w = el.offsetWidth, h = el.offsetHeight;
    let x = tip.x + pad, y = tip.y + pad;
    if (x + w > window.innerWidth - 8) x = tip.x - w - pad;
    if (y + h > window.innerHeight - 8) y = tip.y - h - pad;
    setPos({ left: x, top: y });
  }, [tip]);
  return (
    <div className="tip" ref={ref} style={pos}>
      <div className="t">{tip.title}</div>
      {tip.rows.map((r, i) => <div className="r" key={i}>{r}</div>)}
    </div>
  );
}

export const useTip = () => useContext(TipContext);

/* ---- count-up ---- */
export function useCountUp(target, { decimals = 3, ms = 900 } = {}) {
  const [v, setV] = useState(reducedMotion() ? target : 0);
  useEffect(() => {
    if (reducedMotion() || target == null) { setV(target); return; }
    let raf, t0;
    const step = (t) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v == null ? null : v.toFixed(decimals);
}

/* ---- section scaffold ---- */
export function Section({ eyebrow, title, note, children, id }) {
  return (
    <section id={id}>
      <div className="sec-head">
        <span className="eyebrow">{eyebrow}</span>
        <div className="rule" />
      </div>
      <h2>{title}</h2>
      {note && <p className="note">{note}</p>}
      {children}
    </section>
  );
}

export function ZBar({ v, cls, zmax = 3.5 }) {
  const half = 47;
  const w = Math.min(half, (Math.abs(v) / zmax) * half);
  const style = v >= 0
    ? { left: "50%", width: w }
    : { left: `calc(50% - ${w}px)`, width: w };
  return (
    <span className="zbar">
      <span className="track">
        <span className={`fill ${cls} ${v < 0 ? "neg" : ""}`} style={style} />
      </span>
      <span className="v">{fmt(v)}</span>
    </span>
  );
}

export const GradeChip = ({ g }) => (
  <span className="gradechip">{g === "MILLEN" ? "🚨 Millen" : g}</span>
);
