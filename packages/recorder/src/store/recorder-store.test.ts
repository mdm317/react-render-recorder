import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecorderStore, type RecorderStore } from "./recorder-store";

function recordCommitMetadata(store: RecorderStore) {
  store.recordCommit();
}

describe("recorderStore", () => {
  beforeEach(() => {
    const store = createRecorderStore();
    store.reset();
  });

  it("records each painted commit index once in commit order", () => {
    const store = createRecorderStore();
    store.startRecording();

    recordCommitMetadata(store);
    store.recordPaint();
    store.recordPaint();
    recordCommitMetadata(store);
    store.recordPaint();
    store.endRecording([[{} as never], [{} as never]] as never);

    expect(store.getSnapshot().paintCommitIndices).toEqual([0, 1]);
  });

  it("remaps painted commit indices after dropping commits without changes", () => {
    const store = createRecorderStore();
    store.startRecording();

    recordCommitMetadata(store);
    store.recordPaint();
    recordCommitMetadata(store);
    store.recordPaint();
    store.endRecording([[], [{} as never]] as never);

    expect(store.getSnapshot().paintCommitIndices).toEqual([0]);
  });

  it("stores multiple fiber roots without duplicates", () => {
    const store = createRecorderStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const firstRoot = {} as never;
    const secondRoot = {} as never;

    store.setFiberRoot(firstRoot);
    store.setFiberRoot(firstRoot);
    store.setFiberRoot(secondRoot);

    expect(store.getSnapshot().fiberRoots).toEqual([firstRoot, secondRoot]);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
