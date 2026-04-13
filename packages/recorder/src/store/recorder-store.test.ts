import { describe, expect, it } from "vitest";

import { createRecorderStore, type RecorderStore } from "./recorder-store";

function recordCommit(store: RecorderStore) {
  store.recordCommit({
    changes: [],
    rendererID: 1,
    root: {} as never,
  });
}

describe("recorderStore", () => {
  it("records each painted commit index once in commit order", () => {
    const store = createRecorderStore();
    store.reset();
    store.setRecording(true);

    recordCommit(store);
    store.recordPaint();
    store.recordPaint();
    recordCommit(store);
    store.recordPaint();

    expect(store.getSnapshot().paintCommitIndices).toEqual([0, 1]);
  });
});
