import type { installHook } from "@react-record/devtools-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecorderStore } from "../store";
import type { ReactCommitCallback } from "./on-react-commit";
import type { ReactPaintCallback } from "./on-react-paint";

const mocks = vi.hoisted(() => ({
  commitCallbacks: [] as ReactCommitCallback[],
  onCommitFiber: vi.fn(() => []),
  paintCallbacks: [] as ReactPaintCallback[],
}));

vi.mock("@react-record/devtools-api", () => ({
  onCommitFiber: mocks.onCommitFiber,
}));

vi.mock("./render-recorder-ui", () => ({
  renderRecorderUI: vi.fn(),
}));

vi.mock("./on-react-commit", () => ({
  onReactCommit: vi.fn((callback: ReactCommitCallback) => {
    mocks.commitCallbacks.push(callback);
    return () => {};
  }),
}));

vi.mock("./on-react-paint", () => ({
  onReactPaint: vi.fn((callback: ReactPaintCallback) => {
    mocks.paintCallbacks.push(callback);
    return () => {};
  }),
}));

describe("installReactRenderRecorder", () => {
  beforeEach(() => {
    createRecorderStore().reset();
    mocks.commitCallbacks.length = 0;
    mocks.paintCallbacks.length = 0;
    mocks.onCommitFiber.mockClear();
    vi.restoreAllMocks();
  });

  it("skips commit collection while recording is off", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");

    installReactRenderRecorder();
    mocks.commitCallbacks[0](createHook(), 1, {} as never);

    expect(mocks.onCommitFiber).not.toHaveBeenCalled();
    expect(recordCommit).not.toHaveBeenCalled();
  });

  it("stores recorded commits when recording stops", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    expect(recorderStore.getSnapshot().fiberChanges).toEqual([]);
    recorderStore.endRecording([[{} as never]] as never);

    expect(mocks.onCommitFiber).toHaveBeenCalledTimes(1);
    expect(recordCommit).toHaveBeenCalledTimes(1);
    expect(recorderStore.getSnapshot().fiberChanges).toHaveLength(1);
    expect(recorderStore.getSnapshot().fiberChanges).toEqual([[{}]]);
  });

  it("drops commits without changes when recording stops", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    recorderStore.endRecording([[]] as never);

    expect(mocks.onCommitFiber).toHaveBeenCalledTimes(1);
    expect(recordCommit).toHaveBeenCalledTimes(1);
    expect(recorderStore.getSnapshot().fiberChanges).toEqual([]);
  });

  it("skips commit collection when the root has no mounted child", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createUnmountedRoot());

    expect(mocks.onCommitFiber).not.toHaveBeenCalled();
    expect(recordCommit).not.toHaveBeenCalled();
  });

  it("skips paint recording while recording is off", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordPaint = vi.spyOn(recorderStore, "recordPaint");

    installReactRenderRecorder();
    mocks.paintCallbacks[0]();

    expect(recordPaint).not.toHaveBeenCalled();
  });

  it("records paints while recording is on", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordPaint = vi.spyOn(recorderStore, "recordPaint");

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.paintCallbacks[0]();

    expect(recordPaint).toHaveBeenCalledTimes(1);
  });
});

function createHook(): ReturnType<typeof installHook> {
  return {
    renderers: new Map([[1, { currentDispatcherRef: {} }]]),
  } as never;
}

function createUnmountedRoot() {
  return {
    current: {
      child: null,
    },
  } as never;
}

function createMountedRoot() {
  return {
    current: {
      child: {},
    },
  } as never;
}
