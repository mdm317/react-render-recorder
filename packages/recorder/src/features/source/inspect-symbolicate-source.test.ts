import { describe, expect, it } from "vitest";

import type { CommittedFiberChange } from "@react-record/devtools-api";

import { collectSourceLocations, findProjectRoot } from "./inspect-symbolicate-source";

// Trimmed from a Next 16 Turbopack dev chunk: each module is registered under its `[project]/` id
const chunk = [
  '"[project]/packages/ui/useCounter.js [app-client] (ecmascript)", ((__turbopack_context__) => {',
  '"[project]/apps/web/app/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {',
  '    fileName: "[project]/apps/web/app/page.js",',
  '"[project]/node_modules/.pnpm/next@16.1.6/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__) => {',
].join("\n");

describe("findProjectRoot", () => {
  it.each([
    "file:///Users/me/mono/apps/web/app/page.js",
    "file:///Users/me/mono/packages/ui/useCounter.js",
    "file:///Users/me/mono/node_modules/.pnpm/next%4016.1.6/node_modules/next/dist/compiled/react/jsx-dev-runtime.js",
  ])("finds the root from %s", (source) => {
    expect(findProjectRoot(source, chunk)).toBe("/Users/me/mono");
  });

  it("does not match a path that only shares the file name", () => {
    expect(findProjectRoot("file:///Users/me/other/web/app/page.js", chunk)).toBeNull();
  });

  it("leaves non-file sources alone", () => {
    expect(findProjectRoot("http://localhost:3000/apps/web/app/page.js", chunk)).toBeNull();
  });

  it("returns null when the chunk has no [project] ids", () => {
    expect(findProjectRoot("file:///Users/me/app/src/App.tsx", "console.log(1);")).toBeNull();
  });
});

describe("collectSourceLocations", () => {
  const at = (lineNumber: number) => ({
    fileName: "http://localhost/bundle.js",
    lineNumber,
    columnNumber: 1,
    functionName: null,
  });

  function changeWithHooks(
    hooks: NonNullable<CommittedFiberChange["hooks"]>,
  ): CommittedFiberChange {
    return {
      actualDuration: null,
      context: null,
      didHooksChange: true,
      displayName: "Menu",
      fiber: {} as never,
      hooks,
      isFirstMount: false,
      prevFiber: null,
      props: null,
      selfDuration: 0,
      state: null,
    };
  }

  it("collects hook and caller locations once each", () => {
    const hook = { hookIndex: 0, hookName: "State", prev: 0, next: 1 };
    const locations = collectSourceLocations([
      [changeWithHooks([{ ...hook, hookSource: at(4), hookCallerSource: at(8) }])],
      [changeWithHooks([{ ...hook, hookSource: at(4), hookCallerSource: at(8) }])],
      [changeWithHooks([{ ...hook, hookSource: at(8), hookCallerSource: null }])],
    ]);

    expect(locations.map((location) => location.lineNumber)).toEqual([4, 8]);
  });
});
