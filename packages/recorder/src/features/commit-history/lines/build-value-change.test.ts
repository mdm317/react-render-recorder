import { describe, expect, it } from "vitest";

import { buildValueChange } from "./build-value-change";

describe("buildValueChange", () => {
  it.each([
    ["primitives", 0, 1, { prev: 0, next: 1, diffs: null }],
    ["null → object", null, { a: 1 }, { prev: null, next: { a: 1 }, diffs: null }],
    ["object → array", { a: 1 }, [1], { prev: { a: 1 }, next: [1], diffs: null }],
    [
      "object → object",
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { prev: { x: 0, y: 0 }, next: { x: 1, y: 0 }, diffs: [{ path: "x", prev: 0, next: 1 }] },
    ],
    [
      "array → array",
      [1, 2],
      [1, 3, 4],
      {
        prev: [1, 2],
        next: [1, 3, 4],
        diffs: [
          { path: "length", prev: 2, next: 3 },
          { path: "[1]", prev: 2, next: 3 },
        ],
      },
    ],
    ["equal objects", { a: 1 }, { a: 1 }, { prev: { a: 1 }, next: { a: 1 }, diffs: [] }],
  ])("classifies %s", (_label, prev, next, expected) => {
    expect(buildValueChange(prev, next)).toEqual(expected);
  });
});
