# Recorder API

```ts
declare const __REACT_RENDER_RECORDER__: {
  start(): void; // call, then perform the steps
  end(): void; // returns immediately
  getCommitHistoryText(options?: Options): string; // whole recording
  getCommitHistoryTextByPaint(options?: Options): string[]; // one text per paint
};

type Options = {
  includeRenderDuration?: boolean; // "(11.8ms)" after each component
  includeHookPath?: boolean; // "(in useTodos)" after each hook
  includeSource?: boolean; // "Source:" line under each hook
}; // all default to false
```

Output with every option on:

```
## Summary
2 commits, 2 components rerendered
14.2ms total render time

## Commit 1
- TodoList (11.8ms):
  - hook[2] State (in useTodos): 3 → 4
    Source: /src/hooks/use-todos.ts:12:29
- Header (2.40ms):
  - hook[0] State: false → true
    Source: /assets/index-a1b2.js:40:1022 (unmapped)

## Commit 2
(no hook changes)
```

- `Source: Resolving…` — source maps resolve after `end()`; read again until it is gone.
- `(unmapped)` — a bundler-output location, a hint only.
- `(no hook changes)` — the commit re-rendered because of a parent, props, or context. The recorder sees hook value changes only.
- Commit and re-render counts in `## Summary` are the numbers to compare. Render time is noisy; compare it only as a median of several runs.
