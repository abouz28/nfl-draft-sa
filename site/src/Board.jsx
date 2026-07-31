import { Fragment, useMemo, useState } from "react";
import { fmt, GradeChip, ZBar } from "./ui.jsx";

const COLS = [
  { k: "pick", label: "Pick", num: true },
  { k: "team", label: "Team" },
  { k: "player", label: "Player" },
  { k: "pos", label: "Pos" },
  { k: "grade", label: "Walt says" },
  { k: "sent_z", label: "Fanbase (z)", num: true },
  { k: "grade_z", label: "Expert (z)", num: true },
  { k: "edge", label: "Edge", num: true },
];

export function Board({ board }) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [round, setRound] = useState("");
  const [sort, setSort] = useState({ k: "edge", dir: -1 });
  const [open, setOpen] = useState(null);

  const teams = useMemo(() => [...new Set(board.map((r) => r.team))].sort(), [board]);
  const rounds = useMemo(() => [...new Set(board.map((r) => r.round))].sort((a, b) => a - b), [board]);
  const zmax = useMemo(
    () => Math.max(1.5, ...board.map((r) => Math.max(Math.abs(r.sent_z), Math.abs(r.grade_z)))),
    [board]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = board.filter((r) =>
      (!team || r.team === team) &&
      (!round || r.round === +round) &&
      (!ql || r.player.toLowerCase().includes(ql)));
    out.sort((a, b) => {
      const va = a[sort.k], vb = b[sort.k];
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * sort.dir;
    });
    return out;
  }, [board, q, team, round, sort]);

  const clickSort = (k) =>
    setSort((s) => s.k === k
      ? { k, dir: -s.dir }
      : { k, dir: k === "player" || k === "team" ? 1 : -1 });

  return (
    <div className="card">
      <div className="controls">
        <input type="search" placeholder="Search player…" aria-label="Search players"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filter by team">
          <option value="">All teams</option>
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={round} onChange={(e) => setRound(e.target.value)} aria-label="Filter by round">
          <option value="">All rounds</option>
          {rounds.map((r) => <option key={r} value={r}>Round {r}</option>)}
        </select>
        <span className="count">{rows.length} of {board.length} picks · click a row for detail</span>
      </div>
      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.k} className={`sortable ${c.num ? "num" : ""}`} tabIndex={0}
                  aria-sort={sort.k === c.k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  onClick={() => clickSort(c.k)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickSort(c.k); }
                  }}>
                  {c.label}{" "}
                  <span className="arr">{sort.k === c.k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = `${r.team}-${r.pick}`;
              const isOpen = open === id;
              return (
                <Fragment key={id}>
                  <tr className="rowbtn" tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault(); setOpen(isOpen ? null : id);
                      }
                    }}>
                    <td className="num">{r.pick}</td>
                    <td>{r.team}</td>
                    <td><b>{r.player}</b></td>
                    <td>{r.pos ?? ""}</td>
                    <td><GradeChip g={r.grade} /></td>
                    <td className="num"><ZBar v={r.sent_z} cls="fans" zmax={zmax} /></td>
                    <td className="num"><ZBar v={r.grade_z} cls="expert" zmax={zmax} /></td>
                    <td className="num">
                      <span className={`edge ${r.edge > 0 ? "up" : ""}`}>{fmt(r.edge, 3)}</span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="detail">
                      <td colSpan={COLS.length}>
                        Round {r.round} · sentiment from <b>{r.n_comments.toLocaleString()}</b> draft-night
                        comments{r.top_thread && <> · biggest thread: <b>“{r.top_thread}”</b>
                        {r.top_thread_n != null && <> ({r.top_thread_n.toLocaleString()} comments)</>}</>} ·
                        model edge <b>{fmt(r.edge, 3)}</b> class-percentile vs slot expectation
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
