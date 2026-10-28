---
name: improve-perf
description: Make a React interaction faster by recording a per-step baseline with react-render-recorder, measuring each candidate fix alone against it, and stashing every fix that improves its target step without regressing another. Use when the user wants to speed up an interaction, cut commits or re-renders, or mentions "성능 개선", "렌더링 최적화", "commit 줄이기", or "render perf".
---

# Render Performance

Record a per-step baseline for what the user wants faster, derive candidate fixes from the recording, then measure each fix alone against that baseline in its own subagent and hand the user one stash per fix that improves its target step without making another step worse.

**Core principle:** trust only numbers you recorded yourself.

## Setup

Check for `window.__REACT_RENDER_RECORDER__` on the page. If it is missing, invoke the `react-recorder:install` skill.

Before the first recording, read `<this skill's base directory>/../../references/recorder-api.md` and `<this skill's base directory>/../../references/measurement.md`.

## 1. Baseline

The user may describe the target any way they like — a page, a component, a symptom, a file, or just "this feels slow". Turn it into concrete steps you can replay in the browser, finding the route and the trigger from the code or by exploring the app yourself.

When the request names one action — a click, a page load — record it without asking. When it names something broader, like a component or a whole page, propose the pages and steps you would record in one line and wait for the user to confirm or adjust them before recording.

Write the replay script per `measurement.md` and run it until the counts repeat. The baseline is the per-step table it prints.

## 2. Candidates

For each step, read its recording through every option to find where the cost comes from:

- by paint — which paint carries the commits
- `includeRenderDuration` — which components cost the most
- `includeHookPath` — which custom hook owns the changing state
- `includeSource` — where that hook lives in the code

Read the source at those locations, then list candidate fixes ordered by expected gain. Each candidate names its target step, the commit or component it targets, and the number it should move. A candidate is the whole change that moves that number on its own — `memo` on a child together with the `useCallback`/`useMemo` that keeps its props stable is one candidate, not two.

## 3. Measure each candidate alone

Before the first candidate, check that the files the candidates will touch have no uncommitted changes. If they do, ask the user to commit or stash them first. The recorder script stays in place.

For each candidate, spawn one subagent and wait for it before starting the next — they share a working tree, dev server, and browser. Tell it to read and follow `<this skill's base directory>/references/apply-fix.md`, and give it the replay script path, the per-step baseline table, the target step, and the candidate.

Every candidate starts from the original code and is compared with the same baseline; nothing carries over between them. Never commit, push, or apply a stash — the user picks which stashes to apply.

## Report

The steps you recorded, so the user can check the scope. Then a table with one row per candidate and one column per step, each cell before → after. Mark a step that regressed with ⚠. Add stashed or discarded (with the reason) and its current `stash@{n}` from `git stash list`. Mark candidates that target the same component, commit, or step — their gains may overlap, so applying both may not add up. Show `git stash apply stash@{n}` as the way to try one; `apply` rather than `pop` keeps the other indices stable. If you added the recorder script, say so.
