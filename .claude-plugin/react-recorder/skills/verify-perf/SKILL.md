---
name: verify-perf
description: Verify that a code change actually reduced React commits and re-renders for an interaction, by recording it with react-render-recorder once without the change and once with it, then comparing. Does not edit code. Use when the user has changed code and wants to confirm re-renders or commits dropped, or mentions "리렌더 줄었는지 확인", "렌더링 검증", "성능 검증", or "verify render perf".
---

# Render Performance Verify

Replay the same steps without the change and again with it, then compare the numbers step by step. Never edit the code under test.

**Core principle:** trust only numbers you recorded yourself.

## Setup

Check for `window.__REACT_RENDER_RECORDER__` on the page. If it is missing, invoke the `react-recorder:install` skill.

Before the first recording, read `<this skill's base directory>/../../references/measurement.md`.

## 1. Steps

The change is the uncommitted diff unless the user names a commit. Read it, find what exercises the changed code, and turn it into concrete steps you can replay in the browser. Write the replay script per `measurement.md`. Ask only if you cannot tell what to record.

## 2. Before

Take the change out, leaving the recorder script in place:

- uncommitted — `git stash push -u -m "verify-perf" -- <changed files>`
- a commit — `git checkout <commit>^ -- <changed files>`, only if those files have no uncommitted changes; otherwise ask

Run the replay script until every step's counts repeat run to run.

## 3. After

Put the change back — `git stash pop`, or `git checkout HEAD -- <changed files>` — and confirm `git status` matches what it was at the start. Run the same script the same way.

If anything fails midway, restore the change before reporting.

## Report

- the steps you recorded, so the user can check the scope
- a per-step table, before → after, with a verdict per step: reduced, unchanged, or increased
- components whose re-render count changed in each step — gone, new, fewer, more
- an overall verdict: reduced only if at least one step dropped and no step increased; render time only as a per-step median

If the numbers did not drop, or a step increased, say what the after recording shows for it. Do not fix it unless asked.
