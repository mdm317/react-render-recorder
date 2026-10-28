---
name: improve-perf
description: Make a React interaction faster by measuring its commits and renders with react-render-recorder, fixing the biggest cost, and re-measuring until nothing worthwhile is left. Use when the user wants to speed up an interaction, cut commits or re-renders, or mentions "성능 개선", "렌더링 최적화", "commit 줄이기", or "render perf".
---

# Render Performance

Record a baseline for one interaction, derive candidate fixes from the recording, then measure each fix alone against that baseline in its own subagent and hand the user one stash per fix that measurably improves the numbers.

**Core principle:** trust only numbers you recorded yourself.

## Setup

Check for `window.__REACT_RENDER_RECORDER__` on the page. If it is missing, invoke the `react-recorder:install` skill.

Before the first recording, read `<this skill's base directory>/../../references/recorder-api.md`.

## 1. Baseline

The user may describe the target any way they like — a page, a component, a symptom, a file, or just "this feels slow". Turn it into concrete steps you can replay in the browser, finding the route and the trigger from the code or by exploring the app yourself. Ask only if you cannot tell what to record.

Record those steps until the commit and re-render counts in `## Summary` repeat run to run. Those counts are the baseline. Render time is noisy, so use it only as a median of several runs.

## 2. Candidates

Read the same recording through every option to find where the cost comes from:

- by paint — which paint carries the commits
- `includeRenderDuration` — which components cost the most
- `includeHookPath` — which custom hook owns the changing state
- `includeSource` — where that hook lives in the code

Read the source at those locations, then list candidate fixes ordered by expected gain. Each candidate names the commit or component it targets and the number it should move. A candidate is the whole change that moves that number on its own — `memo` on a child together with the `useCallback`/`useMemo` that keeps its props stable is one candidate, not two.

## 3. Measure each candidate alone

Before the first candidate, check that the files the candidates will touch have no uncommitted changes. If they do, ask the user to commit or stash them first. The recorder script stays in place.

For each candidate, spawn one subagent and wait for it before starting the next — they share a working tree, dev server, and browser. Tell it to read and follow `<this skill's base directory>/references/apply-fix.md`, and give it the exact steps you recorded, the baseline numbers, and the candidate.

Every candidate starts from the original code and is compared with the same baseline; nothing carries over between them. Never commit, push, or apply a stash — the user picks which stashes to apply.

## Report

A table of every candidate: baseline → after numbers, stashed or discarded (with the reason), and its current `stash@{n}` from `git stash list`. Mark candidates that target the same component or commit — their gains may overlap, so applying both may not add up. Show `git stash apply stash@{n}` as the way to try one; `apply` rather than `pop` keeps the other indices stable. If you added the recorder script, say so.
