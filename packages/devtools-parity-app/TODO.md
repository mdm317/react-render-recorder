# devtools-parity-app — TODO

## profilingData: per-renderer source tracking

**Where**: `src/main.ts` — WS tap merge logic (`buildWsTapScript`'s `tap()`); also `src/types/profiling-data.ts`.

**Current behavior**: when both an RSC (flight) renderer and a client renderer respond to `getProfilingData`, the WS tap concatenates `dataForRoots` from each response but the top-level `rendererID` is overwritten by `Object.assign`. Only the **last responder's** `rendererID` survives. Roots from different renderers are indistinguishable in the merged payload.

**Why it matters**: comparing recorder vs devtools commits is harder when we can't tell which root belongs to which React renderer (RSC vs client). UI labels like "RSC" / "Client" become impossible from the merged shape alone.

**Proposed fix (Option A — tag each root with its source)**:

1. Extend the merged type:
   ```ts
   // src/types/profiling-data.ts
   export type ProfilingDataForRootBackendWithSource =
     ProfilingDataForRootBackend & { sourceRendererID: number };

   export type ProfilingDataMerged = {
     dataForRoots: ProfilingDataForRootBackendWithSource[];
     rendererIDs: number[];          // contributing renderers (was singular)
     timelineData: TimelineDataExport | null;
   };
   ```

2. Update the WS tap (`buildWsTapScript`) to tag each incoming root with its renderer before merging, and accumulate `rendererIDs[]`:
   ```js
   const tagged = (msg.payload.dataForRoots || []).map((root) => ({
     ...root,
     sourceRendererID: msg.payload.rendererID,
   }));
   const prevRenderers = (prev && prev.rendererIDs) || [];
   window.__lastProfilingData = {
     dataForRoots: ((prev && prev.dataForRoots) || []).concat(tagged),
     rendererIDs: prevRenderers.includes(msg.payload.rendererID)
       ? prevRenderers
       : prevRenderers.concat(msg.payload.rendererID),
     timelineData: msg.payload.timelineData ?? (prev && prev.timelineData) ?? null,
   };
   ```

3. Replace `ComparisonResult.devtools` type with `ProfilingDataMerged | null` in `src/main.ts` and `src/compare/App.tsx`.

4. `describeDevtools` in `src/compare/App.tsx` can show source per root, e.g. `"App (renderer 2)"`.

**Alternatives considered**:
- *Option B — keep responses separate per renderer*: stores `Record<rendererID, ProfilingDataBackend>` instead of merging. Most accurate, but compare UI has to handle a (renderer × root) matrix and timeline data per renderer.
- *Option C — `rendererIDs[]` only*: minimal change, but renderer-to-root mapping becomes order-dependent and breaks if `dataForRoots` is filtered/sorted later.

Option A wins because the renderer label rides with the root and can't desync.
