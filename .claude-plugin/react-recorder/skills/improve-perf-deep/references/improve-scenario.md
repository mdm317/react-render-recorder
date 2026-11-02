# Improve a scenario or a step

Find candidate fixes for the target you were given, apply and measure them one at a time against the baseline, save each one that helps as a stash, and leave the working tree as you found it.

You run in one of two modes:

- **`scenario`**: your target is a whole scenario. Read every step's recording. Look first for causes that span steps — a value set in one step and reset in another, each change taking an extra commit — and for commits that exist only to copy state from one place to another. Each half of such a cause can look explainable on its own; compare the steps to connect them.
- **`step`**: your target is one step. A scenario pass already ran; the causes it fixed are in your skip list. Dig into what is left in your step's recording.

Read the Recordings, Recorder artifacts, and Regression sections of `../../../references/measurement.md`, relative to this file, before reading any recording.

## 1. Classify every commit

Before listing candidates, go through your target's recording commit by commit and put every rendered component into one of these:

- **needed**: its output changes in this commit.
- **avoidable**: it renders but its output doesn't change. Name the cause — the state or context value it subscribes to, the prop whose identity changed, or the commit that only copies a value somewhere else.
- **artifact**: the recorder causes it (see Recorder artifacts).

Also ask of every commit why it has to exist at all, not only whether it can be merged into another. A commit that shows up in the same place in every run is deterministic, not necessarily needed; calling it needed takes a reason. For each avoidable render caused by a subscription, check how the subscribed value is used: if it is only combined with other values (`open && highlighted`), a selector over the combination may avoid the render.

Don't stop until no row is left unclassified. Count how many components each cause re-renders, so causes that scale — every item in a list — stand out.

## 2. Candidates

From the avoidable rows, list candidate fixes ordered by expected gain, removed commits first. Each candidate names the commit or component it targets, the number it should move, and the code it changes. A candidate is the whole change that moves that number on its own — `memo` on a child together with the `useCallback`/`useMemo` that keeps its props stable is one candidate, not two. Drop a candidate whose cause is on your skip list.

## 3. Measure each candidate in order

Run `git status` once. If a file you plan to edit already has uncommitted changes, drop the candidates that touch it.

For each candidate, in order:

1. Start from the original code and apply only this fix. Nothing carries over between candidates.
2. Run the whole replay script, every scenario, until every step's counts repeat run to run.
3. Run the tests covering what you touched.
4. Check the screen still behaves as before.
5. If a target step improved, no step in any scenario regressed, and nothing broke, stash only your files:
   `git stash push -u -m "improve-perf-deep: <scenario> <step or 'all'> <candidate>" -- <files you changed>`
   Otherwise discard your edits: `git checkout -- <files>`, and delete any files you created. If a step regressed, name it and its numbers in the reason.
6. Run `git status` and confirm none of your files remain changed.

A fix that moves renders from one step into a later one has not improved anything.

Never commit, push, or apply a stash.

## Return

One entry per candidate:

- the candidate: what it changes, and why
- `stashed` or `discarded` (with the reason)
- the stash message
- the full per-step table for every scenario, before → after
- the files you changed and the tests you ran

Then the avoidable rows you left unaddressed, per step, each with its cause and why you didn't fix it. In `scenario` mode, this list decides which steps get a step pass.
