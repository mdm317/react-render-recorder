---
name: improve-perf-deep
description: A deeper run of improve-perf. Record a per-step baseline with react-render-recorder, have subagents derive candidate fixes — first across each whole scenario, then within each step that still has avoidable cost — and measure them one by one against it, and stash every fix that improves its target step without regressing another. Costs far more than improve-perf but finds more causes. Use only when the user names improve-perf-deep or asks for a deep, thorough, or exhaustive render perf pass; otherwise use improve-perf.
---

# Render Performance Deep

Record a per-step baseline for what the user wants faster, then hand each scenario and then each step that still has avoidable cost to its own subagent, which derives candidate fixes from the recordings and measures them one by one against that baseline, and give the user one stash per fix that improves its target step without making another step worse.

**Core principle:** trust only numbers you recorded yourself.

## Setup

Check for `window.__REACT_RENDER_RECORDER__` on the page. If it is missing, invoke the `react-recorder:install` skill.

Before the first recording, read `<this skill's base directory>/../../references/measurement.md`.

## 1. Baseline

The user may describe the target any way they like — a page, a component, a symptom, a file, or just "this feels slow". Turn it into concrete steps you can replay in the browser, finding the route and the trigger from the code or by exploring the app yourself. Group the steps into scenarios: each scenario is one page or setup replayed from a fresh load.

When the request names one action — a click, a page load — record it without asking. When it names something broader, like a component or a whole page, propose the scenarios and steps you would record in one line and wait for the user to confirm or adjust them before recording.

Write the replay script per `measurement.md` so it runs every scenario, or only the ones named as arguments, and run it until the counts repeat. The baseline is the per-step table it prints. If a step's counts keep varying, find out why and make the step deterministic in the script yourself (see Noise in `measurement.md`) before improving anything; don't hand that investigation to an improve subagent, because it pulls the subagent's attention away from causes.

## 2. Improve

Before the first subagent, check that the code under test has no uncommitted changes. If it does, ask the user to commit or stash them first. The recorder script stays in place.

Spawn the subagents one at a time and wait for each before starting the next — they share a working tree, dev server, and browser. Tell each to read and follow `<this skill's base directory>/references/improve-scenario.md`, and give it the replay script path, the per-step baseline table for every scenario, its mode (`scenario` or `step`) and target, and a skip list of the causes earlier subagents already stashed, so it skips them. Write one line per cause, naming the cause and where it lives but not the fix. Leave out candidates that were discarded: one that did nothing for one step can still help another.

The two passes catch different causes, so run both:

1. **Scenario pass.** One subagent per scenario, reading every step's recording. Some causes are split across steps — a value set in one step and reset in another, each through an extra commit — and each half looks explainable on its own; only a view of the whole scenario connects them. This pass goes first because those causes tend to remove whole commits.
2. **Step pass.** Afterwards, one subagent per step that the scenario pass's classification still shows avoidable re-renders in. Given a single step, a subagent digs into causes that a scenario-wide view skims past. Skip steps with no avoidable re-renders left.

Every candidate starts from the original code and is compared with the same baseline; nothing carries over between them. Never commit, push, or apply a stash — the user picks which stashes to apply.

## Report

When every subagent has finished, read each stash's diff with `git stash show -p --include-untracked stash@{n}` to see which stashes fix the same cause or edit the same lines. Don't apply or measure them for this.

Report the scenarios and steps you recorded, so the user can check the scope, then one table covering every candidate:

| stash       | fix                                      | <one column per step> | overlaps with          |
| ----------- | ---------------------------------------- | --------------------- | ---------------------- |
|             | **baseline**                             | **9/108**             |                        |
| `stash@{0}` | what it fixes                            | 8/106                 | `stash@{3}`: same file |
| `stash@{1}` | what it fixes (alternative: `stash@{2}`) | ·                     |                        |
| discarded   | what it tried                            | ·                     | reason                 |

- Cells are commits/rendered after the fix, and `·` means unchanged. Mark a step that regressed with ⚠.
- Group the rows by scenario. Take each `stash@{n}` from `git stash list` at the end, since later stashes shift the numbers.
- "overlaps with" names candidates that target the same component, commit, or step or edit the same files: their gains may overlap, so applying both may not add up, and the stashes may need a manual merge.
- When two stashes are alternatives — they fix the same cause, or edit the same lines so they won't apply together — give them one row: the one with the larger gain, with the other named as its alternative and why it lost, so the user doesn't have to sort them out.

Show `git stash apply stash@{n}` as the way to try one; `apply` rather than `pop` keeps the other indices stable. If you added the recorder script, say so.
