# Measurement

Replay the same steps with one script for every recording, before or after a change, so the numbers compare step by step.

## Replay script

Write one script outside the repo (the scratchpad). Each run:

- starts from a fresh page load
- runs the steps in order, with `start()` before and `end()` after each one
- prints one line per step:

```
step | paints | commits | rerendered | ms
open | 1 | 2 | 14 | 8.3
close | 1 | 3 | 20 | 5.1
```

`paints` is the length of `getCommitHistoryTextByPaint()`; `commits`, `rerendered` and `ms` come from `## Summary`. Keep the per-step text too, for reading with the options later.

The script is not kept in the repo, so copy its output into the conversation as you go.

## Baseline

Run the script until every step's counts repeat run to run. Those counts are the baseline. Take render time as a per-step median.

## Regression

A step regresses when its commit or re-render count rises. Render time alone never counts as a regression.
