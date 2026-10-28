---
name: verify-perf
description: Verify that a code change actually reduced React commits and re-renders for an interaction, by recording it with react-render-recorder once without the change and once with it, then comparing. Does not edit code. Use when the user has changed code and wants to confirm re-renders or commits dropped, or mentions "리렌더 줄었는지 확인", "렌더링 검증", "성능 검증", or "verify render perf".
---

# Render Performance Verify

Record one interaction without the change and again with it, then compare the numbers. Never edit the code under test.

**Core principle:** trust only numbers you recorded yourself.

## Setup

Check for `window.__REACT_RENDER_RECORDER__` on the page. If it is missing, invoke the `react-recorder:install` skill.

Before the first recording, read `<this skill's base directory>/../../references/recorder-api.md`.

## 1. Steps

The change is the uncommitted diff unless the user names a commit. Read it, find the interaction that exercises the changed components, and turn it into concrete steps you can replay in the browser. Ask only if you cannot tell what to record.

## 2. Before

Take the change out, leaving the recorder script in place:

- uncommitted — `git stash push -u -m "verify-perf" -- <changed files>`
- a commit — `git checkout <commit>^ -- <changed files>`, only if those files have no uncommitted changes; otherwise ask

Reload the page, then record the steps until the commit and re-render counts in `## Summary` repeat run to run.

## 3. After

Put the change back — `git stash pop`, or `git checkout HEAD -- <changed files>` — and confirm `git status` matches what it was at the start. Reload the page and record the same steps the same way.

If anything fails midway, restore the change before reporting.

## Report

- `## Summary` counts, before → after
- components whose re-render count changed — gone, new, fewer, more
- verdict: reduced, unchanged, or increased; render time only as a median of several runs

If the numbers did not drop, say what the after recording shows instead. Do not fix it unless asked.
