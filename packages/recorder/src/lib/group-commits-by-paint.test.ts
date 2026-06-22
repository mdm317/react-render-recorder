import type { CommittedFiberChange } from "@react-record/devtools-api";
import { describe, expect, it } from "vitest";

import { groupCommitsByPaint } from "./group-commits-by-paint";

const changeA = { displayName: "A" } as CommittedFiberChange;
const changeB = { displayName: "B" } as CommittedFiberChange;
const changeC = { displayName: "C" } as CommittedFiberChange;

describe("groupCommitsByPaint", () => {
  it("removes empty commits and groups the remaining commits by paint", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[changeA], [], [changeB], [changeC]],
      paintCommitIndices: [0, 2, 3],
    });

    expect(result).toEqual([[[changeA]], [[changeB]], [[changeC]]]);
  });

  it("keeps a paint boundary that lands on an empty commit", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[changeA], [], [changeB]],
      paintCommitIndices: [1],
    });

    expect(result).toEqual([[[changeA]], [[changeB]]]);
  });

  it("returns no paint segments when every commit is empty", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[], []],
      paintCommitIndices: [0, 1],
    });

    expect(result).toEqual([]);
  });

  it("returns no paint segments when there are no commits", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [],
      paintCommitIndices: [],
    });

    expect(result).toEqual([]);
  });

  it("groups trailing commits after the last paint into a final segment", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[changeA], [changeB], [changeC]],
      paintCommitIndices: [0],
    });

    expect(result).toEqual([[[changeA]], [[changeB], [changeC]]]);
  });

  it("puts every commit in one segment when there are no paints", () => {
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[changeA], [changeB]],
      paintCommitIndices: [],
    });

    expect(result).toEqual([[[changeA], [changeB]]]);
  });

  it("absorbs a paint index past the last commit", () => {
    // paintCommitIndices[2] = 5 is out of range (only 4 commits); the extra
    // index over-reaches but slice clamps, so no bogus segment is produced.
    const result = groupCommitsByPaint({
      fiberChangesByCommit: [[changeA], [], [changeB], [changeC]],
      paintCommitIndices: [0, 2, 5],
    });

    expect(result).toEqual([[[changeA]], [[changeB]], [[changeC]]]);
  });
});
