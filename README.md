# NFL Draft Sentiment Analysis

**Do fans know their own team better than national analysts do?**

## Motivation

Expert analysts cover all 32 teams. A fan covers one. This project tests whether
that trade-off is real, whether an analyst's grade is better calibrated across
the league while a fanbase's reaction is better calibrated for its own team.

It started as an argument with my brother. It became an attempt to settle it
with data.

## Hypothesis

For a given draft pick, sentiment within that team's fanbase predicts the
player's slot-adjusted NFL outcome at least as well as national expert grades do.

## Method

**Outcome measure.** Pro Football Reference's Approximate Value, specifically
DrAV, the value a player accumulates with the team that drafted him, measured
over a fixed window of his first three seasons. DrAV fits the question better
than career value: a player who succeeds elsewhere still represents a failed
pick. The fixed window keeps draft classes comparable, since career totals would
favor older classes purely as a function of time.

**Controlling for draft position.** Pick number predicts NFL outcome on its own,
and both fans and analysts know where a player was taken. Comparing raw sentiment
to outcomes would mostly measure shared knowledge of draft order. The test is
therefore on residuals: fit outcome against draft slot, then ask whether fan
sentiment or expert grades explain what slot alone does not.

**Controlling for fan optimism.** Fanbases react positively to nearly every pick
they make. Sentiment is z-scored within each fanbase so the signal is relative
conviction — which picks *this* fanbase was unusually excited or uneasy about,
rather than baseline enthusiasm.

**Validation, then prediction.** The framework is fit and evaluated on the
2021–2023 draft classes, each of which has three completed seasons, with a
two-season robustness check extending to 2024. It is then applied to the 2026
class as an out-of-sample prediction that resolves in future seasons.

## Data sources

| Source | Use |
| --- | --- |
| Team subreddits (historical archives) | Fan reaction at time of pick |
| ESPN, NFL.com, CBS Sports | Expert grades and analysis |
| Pro Football Reference | Draft results and Approximate Value |

## Status

Early development — environment configured, data collection not yet started.

## Repository structure

├── data/
│   ├── raw/          # scraped source data (not tracked)
│   └── processed/    # cleaned datasets
├── notebooks/        # exploratory analysis
├── environment.yml   # conda environment specification
└── README.md

## Setup

```bash
conda env create -f environment.yml
conda activate nfl-draft-sa
```