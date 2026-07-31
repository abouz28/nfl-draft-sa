"""Build src/data.json for the results site from data/processed.

Usage: conda run -n nfl-draft-sa python site/build_data.py
Rerun whenever the processed CSVs change; the Vite dev server hot-reloads it.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data" / "processed"
key = ["season", "team", "round", "pick"]
MIN_COMMENTS = 10

outcomes = pd.read_csv(P / "draft_outcomes_2021_2025.csv")
sent = pd.read_csv(P / "pick_sentiment.csv")
grades = pd.read_csv(P / "expert_grades.csv")
matched = pd.read_csv(P / "matched_threads.csv")
p26_raw = pd.read_csv(P / "draft_2026_picks.csv")

top_thread = (matched.sort_values("num_comments", ascending=False)
              .drop_duplicates(key)[key + ["title", "num_comments"]]
              .rename(columns={"title": "top_thread", "num_comments": "top_thread_n"}))

df = (outcomes
      .merge(sent[key + ["n_comments", "sent_mean", "sent_z"]], on=key, how="left")
      .merge(grades[key + ["wf_grade", "grade_points", "grade_z"]], on=key, how="left")
      .merge(top_thread, on=key, how="left"))
df["log_pick"] = np.log(df["pick"])

base = df[df.sent_z.notna() & df.grade_z.notna()
          & (df.n_comments >= MIN_COMMENTS)].copy()
train = base[base.season <= 2024]
holdout = base[base.season == 2025]

models = {
    "Slot only": "dr_av_pct ~ log_pick",
    "Slot + fans": "dr_av_pct ~ log_pick + sent_z",
    "Slot + expert": "dr_av_pct ~ log_pick + grade_z",
    "Slot + both": "dr_av_pct ~ log_pick + sent_z + grade_z",
}
fits = {n: smf.ols(f, data=train).fit(cov_type="HC3") for n, f in models.items()}

def term(fit, t):
    if t not in fit.params:
        return None
    lo, hi = fit.conf_int().loc[t]
    return {"coef": round(fit.params[t], 4), "p": round(fit.pvalues[t], 4),
            "lo": round(lo, 4), "hi": round(hi, 4)}

model_rows = [{"model": n, "adjR2": round(f.rsquared_adj, 4),
               "sent": term(f, "sent_z"), "grade": term(f, "grade_z")}
              for n, f in fits.items()]

variants = {
    "Baseline (≥10 comments)": smf.ols(models["Slot + both"], data=train).fit(cov_type="HC3"),
    "≥30 comments": smf.ols(models["Slot + both"], data=train[train.n_comments >= 30]).fit(cov_type="HC3"),
    "Weighted by √comments": smf.wls(models["Slot + both"], data=train,
                                     weights=np.sqrt(train.n_comments)).fit(cov_type="HC3"),
    "Outcome = DrAV z-score": smf.ols("dr_av_z ~ log_pick + sent_z + grade_z",
                                      data=train).fit(cov_type="HC3"),
    "Rounds 1–3 only": smf.ols(models["Slot + both"],
                               data=train[train["round"] <= 3]).fit(cov_type="HC3"),
}
robust_rows = [{"variant": n, "n": int(f.nobs),
                "sent": term(f, "sent_z"), "grade": term(f, "grade_z")}
               for n, f in variants.items()]

slot_fit = smf.ols("dr_av_pct ~ log_pick", data=train).fit()
hold_rows = []
if len(holdout) >= 3:
    resid = holdout.dr_av_pct - slot_fit.predict(holdout)
    for name in ["Slot + fans", "Slot + expert", "Slot + both"]:
        pred = fits[name].predict(holdout) - slot_fit.predict(holdout)
        hold_rows.append({"model": name,
                          "r": round(float(np.corrcoef(pred, resid)[0, 1]), 3)})

# every scored pick with a realized outcome — the explorer's dataset
scored = pd.concat([train, holdout])
scored = scored.assign(resid=scored.dr_av_pct - slot_fit.predict(scored))
picks_rows = [{"season": int(r.season), "team": r.team, "round": int(r["round"]),
               "pick": int(r["pick"]), "player": r.pfr_player_name,
               "pos": r.position, "grade": r.wf_grade,
               "sent_z": round(r.sent_z, 2), "grade_z": round(r.grade_z, 2),
               "n_comments": int(r.n_comments),
               "out_pct": round(r.dr_av_pct, 3), "resid": round(r.resid, 3),
               "top_thread": (r.top_thread if isinstance(r.top_thread, str) else None),
               "top_thread_n": (int(r.top_thread_n) if pd.notna(r.top_thread_n) else None)}
              for _, r in scored.sort_values(["season", "pick"]).iterrows()]

sent26 = sent[sent.season == 2026]
g26 = grades[grades.season == 2026]
p26 = (p26_raw.merge(sent26[key + ["n_comments", "sent_z"]], on=key, how="left")
       .merge(g26[key + ["wf_grade", "grade_z"]], on=key, how="left")
       .merge(top_thread, on=key, how="left"))
p26["log_pick"] = np.log(p26["pick"])
pred26 = p26[p26.sent_z.notna() & p26.grade_z.notna()
             & (p26.n_comments >= MIN_COMMENTS)].copy()
pred26["edge"] = (fits["Slot + both"].predict(pred26) - slot_fit.predict(pred26))
board = [{"team": r.team, "round": int(r["round"]), "pick": int(r["pick"]),
          "player": r.pfr_player_name, "pos": r.position,
          "grade": r.wf_grade, "sent_z": round(r.sent_z, 2),
          "grade_z": round(r.grade_z, 2), "edge": round(r.edge, 3),
          "n_comments": int(r.n_comments),
          "top_thread": (r.top_thread if isinstance(r.top_thread, str) else None),
          "top_thread_n": (int(r.top_thread_n) if pd.notna(r.top_thread_n) else None)}
         for _, r in pred26.sort_values("pick").iterrows()]

extremes = []
for season in sorted(sent.season.unique()):
    sub = sent[(sent.season == season) & (sent.n_comments >= 30)].dropna(subset=["sent_z"])
    if len(sub) < 6:
        continue
    for kind, s in [("high", sub.nlargest(3, "sent_z")),
                    ("low", sub.nsmallest(3, "sent_z"))]:
        for _, r in s.iterrows():
            extremes.append({"season": int(season), "kind": kind,
                             "team": r.team, "pick": int(r["pick"]),
                             "player": r.pfr_player_name,
                             "sent_z": round(r.sent_z, 2), "n": int(r.n_comments)})

# team-level panel (notebook 09)
tp = pd.read_csv(P / "team_panel.csv")
panel_pts = [{"season": int(r.season), "team": r.team,
              "gpa": round(r.gpa, 2), "gpa_z": round(r.gpa_z, 2),
              "fan_year_z": (round(r.fan_year_z, 2) if pd.notna(r.fan_year_z) else None),
              "resid": (round(r.class_resid, 3) if pd.notna(r.class_resid) else None)}
             for _, r in tp[tp.season <= 2025].iterrows()]
panel26 = [{"team": r.team, "gpa": round(r.gpa, 2), "gpa_z": round(r.gpa_z, 2),
            "fan_year_z": (round(r.fan_year_z, 2) if pd.notna(r.fan_year_z) else None)}
           for _, r in tp[tp.season == 2026].sort_values("gpa", ascending=False).iterrows()]

tr = tp[(tp.season <= 2024)].dropna(subset=["class_resid", "fan_year_z"]).copy()
panel_specs = []
for name, f in [("Consensus alone", "class_resid ~ gpa_z"),
                ("Fans alone", "class_resid ~ fan_year_z"),
                ("Consensus + fans", "class_resid ~ gpa_z + fan_year_z")]:
    fit = smf.ols(f, data=tr).fit(cov_type="HC3")
    panel_specs.append({"model": name, "n": int(fit.nobs),
                        "gpa": term(fit, "gpa_z"), "fan": term(fit, "fan_year_z")})
agree = [{"season": int(s), "r": round(float(g.gpa_z.corr(g.fan_year_z)), 3)}
         for s, g in tp.dropna(subset=["fan_year_z"]).groupby("season")]
t_ = tr
receipts = {
    "darlings": t_[t_.gpa_z > 0.8].nsmallest(6, "class_resid")[
        ["season", "team", "gpa", "class_resid"]].round(3).to_dict("records"),
    "bags": t_[t_.gpa_z < -0.8].nlargest(6, "class_resid")[
        ["season", "team", "gpa", "class_resid"]].round(3).to_dict("records"),
}

comments_dir = ROOT / "data" / "raw" / "reddit_comments"
n_threads_done = len(list(comments_dir.glob("*.json")))

counts, edges = np.histogram(sent.sent_mean.dropna(), bins=24, range=(-0.6, 0.6))

data = {
    "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    "preliminary": n_threads_done < 5400,
    "progress": {"threads_done": n_threads_done, "threads_total": 5487,
                 "comments_scored": int(sent.n_comments.sum()),
                 "picks_scored": int(len(sent))},
    "funnel": [
        {"stage": "Posts harvested, 32 subreddits × 6 drafts", "n": 98231},
        {"stage": "Thread–pick attributions", "n": 16677},
        {"stage": "Threads selected for comment harvest", "n": 5487},
        {"stage": "Threads on disk so far", "n": n_threads_done},
    ],
    "coverage": {"picks_total": 1551, "picks_with_thread_pct": 99.2,
                 "expert_graded": 1551,
                 "pos_sent_share": round(float((sent.sent_mean > 0).mean()) * 100, 1)},
    "sample": {"train": int(len(train)), "holdout": int(len(holdout)),
               "board": len(board)},
    "models": model_rows,
    "robustness": robust_rows,
    "holdout": hold_rows,
    "picks": picks_rows,
    "board": board,
    "extremes": extremes,
    "panel": {"points": panel_pts, "board26": panel26, "specs": panel_specs,
              "agreement": agree, "receipts": receipts},
    "hist": [{"x0": round(float(a), 3), "x1": round(float(b), 3), "n": int(c)}
             for a, b, c in zip(edges[:-1], edges[1:], counts)],
}

out = Path(__file__).parent / "src" / "data.json"
out.write_text(json.dumps(data))
print(f"wrote {out} — {len(picks_rows)} scored picks, board {len(board)}, "
      f"threads {n_threads_done}/5487")
