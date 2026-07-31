import { useEffect, useState } from "react";
import DATA from "./data.json";
import { fmt, pfmt, Section, TipProvider, useCountUp } from "./ui.jsx";
import { CoefChart, Funnel, Histogram, RobustTable } from "./SummaryCharts.jsx";
import { Explorer } from "./Explorer.jsx";
import { Board } from "./Board.jsx";
import { Panel } from "./Panel.jsx";

function StatusStrip() {
  const pr = DATA.progress;
  const done = pr.threads_done >= pr.threads_total * 0.98;
  const [theme, setTheme] = useState(null);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);
  const flip = () => {
    const dark = getComputedStyle(document.documentElement).colorScheme.includes("dark");
    setTheme(dark ? "light" : "dark");
  };
  return (
    <div className="strip">
      <div className="wrap">
        <span className="name disp">NFL Draft Sentiment</span>
        <span className={`chip ${done ? "" : "live"}`}>
          <span className="dot" style={done ? { background: "var(--good)" } : undefined} />
          <span>
            {done
              ? `corpus complete · ${pr.comments_scored.toLocaleString()} comments scored`
              : `collecting · ${pr.threads_done.toLocaleString()} / ${pr.threads_total.toLocaleString()} threads`}
          </span>
        </span>
        <span className="spacer" />
        <span className="built">built {DATA.built_at}</span>
        <button className="theme-btn" onClick={flip}>light / dark</button>
      </div>
    </div>
  );
}

function ScoreCard({ cls, side, desc, t, n }) {
  const v = useCountUp(t?.coef ?? null);
  return (
    <div className={`score ${cls}`}>
      <div className="who">
        <span className="side disp">{side}</span>
        <span className="desc">{desc}</span>
      </div>
      <div className="val">{t == null ? "—" : (t.coef >= 0 ? "+" : "−") + Math.abs(+v).toFixed(3)}</div>
      <div className="sub">
        percentile points of above-slot outcome per +1σ · <b>{pfmt(t?.p)}</b>
        {t && t.p < 0.05 ? " ✓" : ""} · n={n}
      </div>
    </div>
  );
}

function Hero() {
  const both = DATA.models.find((m) => m.model === "Slot + both");
  const pr = DATA.progress;
  return (
    <header className="hero">
      <div className="eyebrow">
        A backtest, 2021–2026 · six draft classes · 32 fanbases · the entire grade industry
      </div>
      <h1 className="disp">
        <span className="crowd">The Crowd</span>
        <span className="vs disp">vs</span>
        <span className="critic">The Critic</span>
      </h1>
      <p className="lede">
        When a pick comes in, the fanbase reacts in the team subreddit within seconds —
        and so does the professional grader. Four years of NFL outcomes later, whose
        instant read held up? Every pick from 2021–2024 is scored against Pro Football
        Reference draft value, controlling for where the player was taken; 2025 is a
        holdout; the 2026 class is the standing prediction.
      </p>
      {DATA.preliminary && (
        <div className="banner">
          ⚠️ <b>Preliminary.</b> Comment collection is still running against a
          rate-limited archive — <b>{pr.threads_done.toLocaleString()}</b> of{" "}
          {pr.threads_total.toLocaleString()} selected threads are on disk, skewed
          toward alphabetically early teams. Every number on this page will move as
          the corpus completes.
        </div>
      )}
      <div className="scoreboard">
        <ScoreCard cls="fans" side="The crowd" desc="fan sentiment, standardized"
          t={both.sent} n={DATA.sample.train} />
        <ScoreCard cls="expert" side="The critic" desc="expert grade, standardized"
          t={both.grade} n={DATA.sample.train} />
      </div>
    </header>
  );
}

function Holdout() {
  if (!DATA.holdout.length) {
    return (
      <div className="tiles">
        <div className="tile">
          <div className="lab">2025 holdout</div>
          <div className="val" style={{ fontSize: 22 }}>Not enough picks collected yet</div>
          <div className="sub">fills in as the corpus completes</div>
        </div>
      </div>
    );
  }
  return (
    <div className="tiles">
      {DATA.holdout.map((h) => (
        <div className="tile" key={h.model}>
          <div className="lab">{h.model}</div>
          <div className="val">{fmt(h.r, 3)}</div>
          <div className="sub">
            correlation with realized above-slot outcome · n={DATA.sample.holdout}
          </div>
        </div>
      ))}
    </div>
  );
}

function Reads() {
  const ex = DATA.extremes;
  if (!ex.length) return null;
  const seasons = [...new Set(ex.map((e) => e.season))].sort();
  return (
    <Section eyebrow="Face validity" title="The room reads"
      note={<>The picks each fanbase was most unusually high or low on (≥30 comments).
        If these don't read like the stories fans remember, the measurement is
        broken.</>}>
      <div className="reads">
        {seasons.map((s) => (
          <div className="card read-card" key={s}>
            <h3 className="disp">Class of {s}</h3>
            {["high", "low"].map((kind) =>
              ex.filter((e) => e.season === s && e.kind === kind).map((e) => (
                <div className="read-row" key={`${e.team}${e.pick}`}>
                  <span className={`z ${kind === "high" ? "hi" : ""}`}>{fmt(e.sent_z)}</span>
                  <span className="who2">
                    <b>{e.player}</b> <span className="meta">{e.team} · #{e.pick}</span>
                  </span>
                  <span className="meta">{e.n.toLocaleString()} comments</span>
                </div>
              )))}
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function App() {
  return (
    <TipProvider>
      <StatusStrip />
      <div className="wrap">
        <Hero />

        <Section eyebrow="The pipeline" title="From 98,231 posts to one number per pick"
          note={<>Draft-window posts from every team subreddit are matched to specific
            picks by player name — with a timing floor so a pick can't inherit pre-draft
            speculation, and ambiguous titles dropped rather than guessed. Comments from
            each thread's first 48 hours are scored with VADER, averaged per pick, then
            standardized <b>within each fanbase and class</b>, because fans love almost
            everything their team does: <b>{DATA.coverage.pos_sent_share}% of picks draw
            positive raw sentiment</b>. The signal that remains is relative
            conviction.</>}>
          <div className="grid2">
            <div className="card"><Funnel stages={DATA.funnel} /></div>
            <div className="card">
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>
                Raw mean sentiment per pick — nearly everything lands right of zero
              </div>
              <Histogram bins={DATA.hist} posShare={DATA.coverage.pos_sent_share} />
            </div>
          </div>
        </Section>

        <Section eyebrow="Every pick, one dot" title="Explore the backtest yourself"
          note={<>Each dot is a drafted player: how strongly his fanbase (or the expert)
            felt on draft night, against how his career has actually run relative to his
            slot. The dashed line is the trend through the visible picks — uphill means
            the signal carried real information.</>}>
          <Explorer picks={DATA.picks} />
        </Section>

        <Section eyebrow="The backtest · 2021–2024"
          title="Does either voice explain what draft slot can't?"
          note={<>Outcome: DrAV percentile within class. All models control for
            log(pick). Dots are coefficients on the standardized signals; whiskers are
            95% intervals. A dot right of the zero line means that voice adds real
            information <b>beyond the slot the player went at</b> — the test both
            signals have to pass.</>}>
          <div className="card">
            <div className="legend">
              <span className="key"><span className="sw fans" />Fan sentiment (z)</span>
              <span className="key"><span className="sw expert" />Expert grade (z)</span>
            </div>
            <CoefChart models={DATA.models} />
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8 }}>
              Robustness — the joint model under different choices
            </div>
            <RobustTable rows={DATA.robustness} />
          </div>
        </Section>

        <Section eyebrow="The holdout · 2025" title="One rookie season as a sanity check"
          note={<>Coefficients fitted on 2021–2024, applied cold to the 2025 class,
            scored by correlation with each pick's realized above-slot outcome. One
            season of value is the noisiest possible yardstick — read direction, not
            magnitude.</>}>
          <Holdout />
        </Section>

        <Section eyebrow="The prediction · class of 2026"
          title="The 2026 board, scored before the league can score it"
          note={<>The fitted joint model, applied to this spring's class. <b>Edge</b> is
            each pick's predicted class-percentile above (or below) what his draft slot
            alone implies. These rows are commitments — they resolve as careers
            accumulate.</>}>
          <Board board={DATA.board} />
        </Section>

        <Section eyebrow="The panel · 18–29 outlets per year"
          title="What about the whole grade industry?"
          note={<>One grader could be an unfair fight. René Bugner compiles every
            outlet's instant team grades — Kiper, PFF, CBS, NFL.com and more — into a
            composite GPA per class. Tested against each class's slot-adjusted outcome,
            the industry consensus is unstable year to year and adds no significant
            information, while the fanbase's class-level mood performs at least as
            well — and the two barely correlate.</>}>
          <Panel panel={DATA.panel} />
        </Section>

        <Reads />

        <Section eyebrow="Fine print" title="What this can and can't say">
          <ul className="fine">
            <li><b>The expert is one expert.</b> WalterFootball is the only outlet found
              that grades every pick of every round live, with one grader and one scale
              across all six drafts. That buys symmetry with the fan signal and costs
              breadth — this is a fans-vs-one-critic test, not fans-vs-consensus. Only
              original draft-night grades are used, never his one-year re-grades.</li>
            <li><b>Sentiment is VADER.</b> It misreads celebratory profanity and sarcasm
              at the comment level; averaging per pick and standardizing within fanbase
              is the mitigation, not a cure.</li>
            <li><b>Small cells.</b> Within-fanbase z-scores rest on 7–11 picks per
              team-year.</li>
            <li><b>DrAV favors time on the field.</b> Outcomes are standardized within
              class, but 2024's careers are still young; coefficients will keep settling
              for years.</li>
            <li><b>Selection.</b> Per pick: full-name-matched threads preferred, top 5 by
              volume, first 48 hours of comments — every cap chosen before results
              existed.</li>
          </ul>
        </Section>

        <footer>
          Data: nflverse draft &amp; Approximate Value (Pro Football Reference) · Arctic
          Shift Reddit archive · WalterFootball live draft grades. Approximate Value by
          Doug Drinen. Built as a personal research project — it started as an argument
          with a brother.
        </footer>
      </div>
    </TipProvider>
  );
}
