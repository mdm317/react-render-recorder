# Measurement

Replay the same steps with one script for every recording, before or after a change, so the numbers compare step by step.

## Recorder API

```ts
declare const __REACT_RENDER_RECORDER__: {
  start(): void; // call, then perform the steps
  end(): void; // returns immediately
  getCommitHistoryText(options?: Options): string; // whole recording since start()
};

type Options = {
  includeRenderDuration?: boolean; // "(11.8ms)" after each component
  includeHookPath?: boolean; // "(in useTodos)" after each hook
  includeSource?: boolean; // "Source:" line under each hook — where the hook is defined
  includeCallerSource?: boolean; // "Called at:" line under each hook — the line in the component body that leads to it
  includeAllRenders?: boolean; // every rendered component with its render reason, not only hook changes
}; // all default to false
```

## Replay script

Write one script outside the repo (the scratchpad). Each run:

- starts from a fresh page load
- runs the steps in order, with `start()` before and `end()` after each one
- after each `end()`, saves the step's recording twice from the same recording (see Recordings)
- prints one line per step:

```
step | commits | rendered | ms
open | 2 | 14 | 8.3
close | 3 | 20 | 5.1
```

The counts come from the `## Summary` at the top of the `.txt` recording:

```
## Summary
2 commits, 14 components rendered
8.30ms total render time
```

The script is not kept in the repo, so copy its output into the conversation as you go.

## Recordings

Call `getCommitHistoryText` twice after each `end()`, with the same options except `includeSource`:

```js
const options = { includeAllRenders: true, includeCallerSource: true };
const text = recorder.getCommitHistoryText(options);
const full = recorder.getCommitHistoryText({ ...options, includeSource: true });
```

Save them as `<scenario>-<step>-<run>.txt` and `<scenario>-<step>-<run>.full.txt`.

- `.txt`: read this first to find which commits and components cost what. Each commit header splits its components into first mounts and re-renders: `## Commit 2 (3 mounted, 11 rerendered)`. Each hook has a `Called at:` line — the line in the component that leads to it; edit here when the hook comes from a library.
- `.full.txt`: the same recording with `Source:` lines added. Open it only for the commit you're tracing, when you need where a hook itself is defined.

`Called at:` and `Source:` can also read:

- `Resolving…` — source maps resolve after `end()`; read again until it is gone.
- `(unmapped)` — a bundler-output location, a hint only.
- `library (<package>)` — code the source map ignore-lists; not a place to edit, so follow `Called at:` instead.

## Recorder artifacts

Some renders come from recording, not from the app:

- **Hook inspection.** After each commit the recorder inspects hooks by replaying them, which can hand back fresh callbacks and change values kept in refs. The next real render then sees a "changed" ref callback, which can unregister and re-register it and schedule an extra commit. To check a suspicious commit, replay the step without `start()` and log whether it still happens; if it doesn't, it is an artifact.
- **Wrapper components.** `memo`, `forwardRef` and similar wrappers count as components of their own, so wrapping a child adds one render per instance on mount. Keeping the element identical with `useMemo` avoids the wrapper when the count matters.

Don't fix an artifact in the app; it only makes the measurement look better.

## Baseline

Run the script until every step's counts repeat run to run. Those counts are the baseline. Take render time as a per-step median.

## Noise

When a step's counts keep varying, find the source before taking the baseline. A common one is an input sent while an exit animation still runs: each animation frame can commit a position update, and how many frames fit varies. Wait for the animation to finish — the element to unmount — before the next input in the script.

## Regression

A step regresses when its commit or rendered count rises. Render time alone never counts as a regression.
