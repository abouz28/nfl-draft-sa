# NFL Draft Sentiment Analysis

**Do fans know their own team better than national analysts do?**

## Motivation

Expert analysts cover all 32 teams. A fan covers one. This project tests whether
that trade-off is real — whether an analyst's grade is better calibrated across
the league while a fanbase's reaction is better calibrated for its own team.

It started as an argument with my brother. It became an attempt to settle it
with data.

## Hypothesis

For a given draft pick, sentiment within that team's fanbase predicts the
player's class-adjusted NFL outcome at least as well as national expert grades do.

## Method

### Outcome measure

Pro Football Reference's Approximate Value, specifically **DrAV** — the value a
player accumulates with the team that drafted him. DrAV fits the question better
than career AV: a player who succeeds elsewhere still represents a failed pick.

Players who never accumulated value carry a missing DrAV in the source data.
These are **filled with zero rather than dropped**. A player who never took a
snap is not missing data — he is the clearest possible outcome, and excluding
him would systematically remove busts and make every evaluator look prescient.
Roughly 20–33 players per draft class fall into this group.

### Comparability across draft classes

Career totals favor older classes purely as a function of time: mean DrAV falls
from 11.0 in the 2021 class to 2.6 in 2025, reflecting years of accumulation
rather than talent. DrAV is therefore **standardized within each draft class**,
so every player is compared only against his own peers and the maturity
difference cancels out. Both a z-score and a percentile rank are computed —
DrAV is heavily right-skewed, and the rank-based version is robust to that skew.

### Controlling for draft position

Pick number predicts NFL outcome on its own, and both fans and analysts know
where a player was taken. Comparing raw sentiment to outcomes would largely
measure shared knowledge of draft order. The test is therefore on residuals:
fit outcome against draft slot, then ask whether fan sentiment or expert grades
explain what slot alone does not.

### Controlling for fan optimism

Fanbases react positively to nearly every pick they make. Sentiment is z-scored
within each fanbase so the signal is relative conviction — which picks *this*
fanbase was unusually excited or uneasy about — rather than baseline enthusiasm.

### Validation, then prediction

| Draft classes | Role |
| --- | --- |
| 2021–2024 | Primary backtest |
| 2025 | Robustness check (one season of outcomes; noisy) |
| 2026 | Out-of-sample prediction, resolves in future seasons |

## Data

| Source | Use | Notes |
| --- | --- | --- |
| [nflverse](https://github.com/nflverse/nflverse-data) `draft_picks` | Draft results and Approximate Value | Sourced from Pro Football Reference |
| [Arctic Shift](https://arctic-shift.photon-reddit.com/) | Historical Reddit comments | Pushshift successor; archives from 2005 |
| ESPN, NFL.com, CBS Sports | Expert grades and analysis | Collection in progress |

Attribution of picks to fan reaction relies on team subreddits posting a
dedicated thread per selection, with the player named in the title. A
feasibility spike (`notebooks/01_feasibility_spike.ipynb`) confirmed this
convention holds across multiple fanbases, though thread titling varies by
subreddit.

## Repository structure

├── data/
│   ├── raw/                            # scraped source data (not tracked)
│   └── processed/
│       ├── draft_outcomes_2021_2025.csv
│       └── draft_2026_picks.csv
├── notebooks/
│   ├── 01_feasibility_spike.ipynb      # Reddit data availability + attribution
│   └── 02_collect_pfr_drafts.ipynb     # draft outcomes and standardization
├── environment.yml
└── README.md

## Setup

```bash
conda env create -f environment.yml
conda activate nfl-draft-sa
```

## Status

Draft outcome data collected and standardized. Reddit collection pipeline and
expert grade collection in progress.

## Acknowledgements

Approximate Value was developed by Doug Drinen at Pro Football Reference.
Draft data is distributed by the nflverse project. Historical Reddit data is
made available by Arctic Shift.