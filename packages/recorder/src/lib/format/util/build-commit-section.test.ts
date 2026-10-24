import type { CommittedFiberChange } from "@react-record/devtools-api";
import { describe, expect, it } from "vitest";

import { buildCommitHistory, type CommitHistoryFiberChange } from "@/lib/build-commit-history";

import { buildCommitSectionLines } from "./build-commit-section";

function makeChange(
  displayName: string,
  hooks: NonNullable<CommittedFiberChange["hooks"]>,
  selfDuration = 0,
): CommitHistoryFiberChange {
  const change: CommittedFiberChange = {
    actualDuration: null,
    context: null,
    didHooksChange: true,
    displayName,
    fiber: {} as never,
    hooks,
    isFirstMount: false,
    prevFiber: null,
    props: null,
    selfDuration,
    state: null,
  };
  return buildCommitHistory([[change]])[0][0];
}

describe("build-commit-section shallow shape for null↔object", () => {
  it("renders null → object as a one-level-deep shape, not a full dump", () => {
    const next = {
      subscribe: () => {},
      getSnapshot: () => {},
      state: { open: false },
      listeners: {},
      updateTick: 6,
      syncOnly: false,
    };

    const lines = buildCommitSectionLines([
      makeChange("NavRoot", [
        { hookIndex: 13, hookName: "State", hookPath: ["State"], prev: null, next },
      ]),
    ]);

    expect(lines).toEqual([
      "- NavRoot:",
      "  - hook[13] State: null → " +
        "{subscribe: [Function], getSnapshot: [Function], state: [object], " +
        "listeners: [object], updateTick: 6, syncOnly: false}",
    ]);
  });

  it("renders undefined → object the same way", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: undefined,
          next: { a: 1, b: "two" },
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", '  - hook[0] State: undefined → {a: 1, b: "two"}']);
  });

  it("renders object → null using the shallow shape on the prev side", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: { a: 1, nested: { x: 1 }, items: [1, 2, 3] },
          next: null,
        },
      ]),
    ]);

    expect(lines).toEqual([
      "- Foo:",
      "  - hook[0] State: {a: 1, nested: [object], items: [Array(3)]} → null",
    ]);
  });

  it("renders null → array with item summaries", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: null,
          next: [1, "x", { k: 1 }, [9, 9]],
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", '  - hook[0] State: null → [1, "x", [object], [Array(2)]]']);
  });

  it("leaves primitive → primitive untouched", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: false, next: true },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", "  - hook[0] State: false → true"]);
  });

  it("still produces path-diff lines for object → object (no regression)", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        {
          hookIndex: 0,
          hookName: "State",
          hookPath: ["State"],
          prev: { x: 0, y: 0 },
          next: { x: 1, y: 0 },
        },
      ]),
    ]);

    expect(lines).toEqual(["- Foo:", "  - hook[0] State: changed fields:", "      x: 0 → 1"]);
  });

  it("appends selfDuration to the component header when includeRenderDuration is true", () => {
    const lines = buildCommitSectionLines(
      [
        makeChange(
          "Foo",
          [{ hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 0, next: 1 }],
          0.5,
        ),
      ],
      { includeRenderDuration: true, includeHookPath: false, includeSource: false },
    );

    expect(lines).toEqual(["- Foo (0.50ms):", "  - hook[0] State: 0 → 1"]);
  });

  it("sorts components by descending selfDuration", () => {
    const hook: NonNullable<CommittedFiberChange["hooks"]> = [
      { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 0, next: 1 },
    ];
    const lines = buildCommitSectionLines([
      makeChange("Fast", hook, 0.1),
      makeChange("Slow", hook, 2),
      makeChange("Medium", hook, 0.5),
    ]);

    expect(lines.filter((line) => line.startsWith("- "))).toEqual([
      "- Slow:",
      "- Medium:",
      "- Fast:",
    ]);
  });

  it("omits the wrapper chain by default for multi-segment hookPaths", () => {
    const lines = buildCommitSectionLines([
      makeChange("Combo", [
        {
          hookIndex: 0,
          hookName: "SyncExternalStore",
          hookPath: ["ComboboxRootContext", "FloatingRootContext", "SyncExternalStore"],
          prev: 0,
          next: 1,
        },
      ]),
    ]);

    expect(lines).toEqual(["- Combo:", "  - hook[0] SyncExternalStore: 0 → 1"]);
  });

  it("renders the wrapper chain when includeHookPath is true", () => {
    const lines = buildCommitSectionLines(
      [
        makeChange("Combo", [
          {
            hookIndex: 0,
            hookName: "SyncExternalStore",
            hookPath: ["ComboboxRootContext", "FloatingRootContext", "SyncExternalStore"],
            prev: 0,
            next: 1,
          },
        ]),
      ],
      { includeRenderDuration: false, includeHookPath: true, includeSource: false },
    );

    expect(lines).toEqual([
      "- Combo:",
      "  - hook[0] SyncExternalStore (in ComboboxRootContext > FloatingRootContext): 0 → 1",
    ]);
  });

  it("groups multiple hook changes under a single component header", () => {
    const lines = buildCommitSectionLines([
      makeChange("Foo", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: false, next: true },
        {
          hookIndex: 2,
          hookName: "Reducer",
          hookPath: ["Reducer"],
          prev: { x: 0, y: 0 },
          next: { x: 1, y: 0 },
        },
      ]),
      makeChange("Bar", [
        { hookIndex: 0, hookName: "State", hookPath: ["State"], prev: 1, next: 2 },
      ]),
    ]);

    expect(lines).toEqual([
      "- Foo:",
      "  - hook[0] State: false → true",
      "  - hook[2] Reducer: changed fields:",
      "      x: 0 → 1",
      "- Bar:",
      "  - hook[0] State: 1 → 2",
    ]);
  });
});

describe("hook source formatting", () => {
  const source = {
    fileName: "http://localhost/bundle.js",
    lineNumber: 48,
    columnNumber: 9,
    functionName: null,
  };
  const changes = [
    makeChange("Counter", [
      { hookIndex: 0, hookName: "State", prev: 0, next: 1, hookSource: source },
    ]),
  ];
  const options = { includeRenderDuration: false, includeHookPath: false, includeSource: true };
  const key = `${source.fileName}:${source.lineNumber}:${source.columnNumber}`;

  it("shows resolved sources beneath hooks only when enabled", () => {
    const results = {
      [key]: {
        location: ["", "src/Counter.tsx", 12, 27] as [string, string, number, number],
        ignored: false,
      },
    };
    expect(
      buildCommitSectionLines(
        buildCommitHistory([changes], { sourceResults: results, projectRoot: null })[0],
        options,
      ),
    ).toEqual(["- Counter:", "  - hook[0] State: 0 → 1", "    Source: src/Counter.tsx:12:27"]);
    expect(
      buildCommitSectionLines(
        buildCommitHistory([changes], { sourceResults: results, projectRoot: null })[0],
        {
          includeRenderDuration: false,
          includeHookPath: false,
          includeSource: false,
        },
      ),
    ).toHaveLength(2);
  });

  it("distinguishes pending, unmapped, and missing locations", () => {
    expect(buildCommitSectionLines(changes, options)).toContain("    Source: Resolving…");
    expect(
      buildCommitSectionLines(
        buildCommitHistory([changes], { sourceResults: { [key]: null }, projectRoot: null })[0],
        options,
      ),
    ).toContain("    Source: /bundle.js:48:9 (unmapped)");
    expect(
      buildCommitSectionLines(
        [makeChange("Counter", [{ hookIndex: 0, prev: 0, next: 1 }])],
        options,
      ),
    ).toContain("    Source: Unavailable");
  });

  it("omits the URL origin from resolved source locations", () => {
    const results = {
      [key]: {
        location: ["", "http://localhost:5173/src/Counter.tsx", 12, 27] as [
          string,
          string,
          number,
          number,
        ],
        ignored: false,
      },
    };
    expect(
      buildCommitSectionLines(
        buildCommitHistory([changes], { sourceResults: results, projectRoot: null })[0],
        options,
      ),
    ).toContain("    Source: /src/Counter.tsx:12:27");
  });

  function formatResolved(
    fileName: string,
    ignored = false,
    projectRoot: string | null = null,
  ): string {
    const results = {
      [key]: { location: ["", fileName, 12, 27] as [string, string, number, number], ignored },
    };
    return buildCommitSectionLines(
      buildCommitHistory([changes], { sourceResults: results, projectRoot })[0],
      options,
    )[2];
  }

  it.each([
    ["file:///Users/me/my%20app/src/Counter.tsx", null, "/Users/me/my app/src/Counter.tsx"],
    ["file:///Users/me/my%20app/src/Counter.tsx", "/Users/me/my app", "src/Counter.tsx"],
    [
      "file:///Users/me/other/src/Counter.tsx",
      "/Users/me/my app",
      "/Users/me/other/src/Counter.tsx",
    ],
    ["file:///Users/me/100%/src/Counter.tsx", "/Users/me/my app", "/Users/me/100%/src/Counter.tsx"],
  ])("resolves %s against the project root %s", (fileName, projectRoot, expected) => {
    expect(formatResolved(fileName, false, projectRoot)).toBe(`    Source: ${expected}:12:27`);
  });

  it.each([
    ["webpack://my-app/./src/Counter.tsx", "src/Counter.tsx"],
    ["webpack:///./src/Counter.tsx", "src/Counter.tsx"],
    ["webpack://my-app/./src/Counter.tsx?1591", "src/Counter.tsx"],
    ["file:///Users/me/app/src/Counter.tsx", "/Users/me/app/src/Counter.tsx"],
  ])("strips the bundler prefix from %s", (fileName, expected) => {
    expect(formatResolved(fileName)).toBe(`    Source: ${expected}:12:27`);
  });

  it.each([
    "rsc://React/Server/src/Counter.tsx",
    "webpack://my-app/src/Counter.tsx",
    "turbopack:///[next]/entry/page-loader.ts",
    "src/Counter.tsx",
  ])("passes the unrecognised location %s through untouched", (fileName) => {
    expect(formatResolved(fileName)).toBe(`    Source: ${fileName}:12:27`);
  });

  it("labels locations the source map ignore-lists as library code", () => {
    expect(formatResolved("webpack://my-app/./node_modules/lib/index.js", true)).toBe(
      "    Source: node_modules/lib/index.js:12:27 (library)",
    );
  });

  it("keeps the unmapped label and only strips the origin from bundler-space hints", () => {
    const webpackSource = { ...source, fileName: "webpack-internal:///./src/Counter.tsx" };
    const webpackChanges = [
      makeChange("Counter", [
        { hookIndex: 0, hookName: "State", prev: 0, next: 1, hookSource: webpackSource },
      ]),
    ];
    const webpackKey = `${webpackSource.fileName}:${source.lineNumber}:${source.columnNumber}`;
    expect(
      buildCommitSectionLines(
        buildCommitHistory([webpackChanges], {
          sourceResults: { [webpackKey]: null },
          projectRoot: null,
        })[0],
        options,
      ),
    ).toContain("    Source: webpack-internal:///./src/Counter.tsx:48:9 (unmapped)");
  });
});
