# Improve one scenario

Find candidate fixes for the scenario you were given, apply and measure them one at a time against the baseline, save each one that helps as a stash, and leave the working tree as you found it.

Read `../../../references/measurement.md`, relative to this file, before recording.

## 1. Candidates

For each step of your scenario, read its recording to find where the cost comes from, read the source behind it, then list candidate fixes ordered by expected gain. Each candidate names its target step, the commit or component it targets, the number it should move, and the code it changes. A candidate is the whole change that moves that number on its own — `memo` on a child together with the `useCallback`/`useMemo` that keeps its props stable is one candidate, not two. Drop a candidate whose cause is already covered by a stash you were told about.

## 2. Measure each candidate in order

Run `git status` once. If a file you plan to edit already has uncommitted changes, drop the candidates that touch it.

For each candidate, in order:

1. Start from the original code and apply only this fix. Nothing carries over between candidates.
2. Run the whole replay script, every scenario, until every step's counts repeat run to run.
3. Run the tests covering what you touched.
4. Check the screen still behaves as before.
5. If the target step improved, no step in any scenario regressed, and nothing broke, stash only your files:
   `git stash push -u -m "improve-perf: <scenario> <candidate>" -- <files you changed>`
   Otherwise discard your edits: `git checkout -- <files>`, and delete any files you created. If a step regressed, name it and its numbers in the reason.
6. Run `git status` and confirm none of your files remain changed.

A fix that moves renders from its target step into a later one has not improved the target step.

Never commit, push, or apply a stash.

## Return

One entry per candidate:

- the candidate: target step, what it changes, and why
- `stashed` or `discarded` (with the reason)
- the stash message
- the full per-step table for every scenario, before → after
- the files you changed and the tests you ran
