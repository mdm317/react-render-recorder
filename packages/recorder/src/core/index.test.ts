import type { installHook } from "@react-record/devtools-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecorderStore } from "../store";
import type { ReactCommitCallback } from "./on-react-commit";

const mocks = vi.hoisted(() => ({
  commitCallbacks: [] as ReactCommitCallback[],
  onCommitFiber: vi.fn(() => []),
}));

vi.mock("@react-record/devtools-api", () => ({
  onCommitFiber: mocks.onCommitFiber,
  startRecording: vi.fn(),
  endRecording: vi.fn(() => []),
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

let frameCallbacks: FrameRequestCallback[] = [];

function tickFrame() {
  const callbacks = frameCallbacks;
  frameCallbacks = [];
  for (const callback of callbacks) {
    callback(0);
  }
}

describe("installReactRenderRecorder", () => {
  beforeEach(() => {
    createRecorderStore().reset();
    mocks.commitCallbacks.length = 0;
    mocks.onCommitFiber.mockClear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    frameCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
    recorderStore.endRecording([[{} as never]] as never);

    expect(mocks.onCommitFiber).toHaveBeenCalledTimes(1);
    expect(recordCommit).toHaveBeenCalledTimes(1);
    expect(recorderStore.getSnapshot().fiberChanges).toHaveLength(1);
    expect(recorderStore.getSnapshot().fiberChanges).toEqual([[{}]]);
  });

  it("preserves bailout commits in raw fiberChanges when recording stops", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    recorderStore.endRecording([[]] as never);

    expect(mocks.onCommitFiber).toHaveBeenCalledTimes(1);
    expect(recordCommit).toHaveBeenCalledTimes(1);
    expect(recorderStore.getSnapshot().fiberChanges).toEqual([[]]);
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

  it("defers input-dispatch commits to the frame marker", async () => {
    vi.stubGlobal("window", { event: new Event("click") });
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    await Promise.resolve();
    expect(recorderStore.getSnapshot().paintCommitIndices).toEqual([]);

    tickFrame();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    tickFrame();
    tickFrame();

    expect(recorderStore.getSnapshot().paintCommitIndices).toEqual([1, 2]);
  });

  it("closes non-dispatch commits at the end of their task via microtask", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    await Promise.resolve();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    await Promise.resolve();

    expect(recorderStore.getSnapshot().paintCommitIndices).toEqual([1, 2]);
  });

  it("flushes trailing commits when recording stops before the next frame", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();

    installReactRenderRecorder();
    recorderStore.startRecording();
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    recorderStore.endRecording([[]] as never);

    expect(recorderStore.getSnapshot().paintCommitIndices).toEqual([0]);
  });

  it("starts the marker loop on recording start and cancels it on stop", async () => {
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();

    installReactRenderRecorder();
    expect(frameCallbacks.length).toBe(0);

    recorderStore.startRecording();
    expect(frameCallbacks.length).toBeGreaterThan(0);

    recorderStore.endRecording([] as never);
    expect(vi.mocked(cancelAnimationFrame)).toHaveBeenCalled();
  });

  it("exposes window.__REACT_RENDER_RECORDER__ with JSON-safe getFiberChanges", async () => {
    const stubbedWindow = {} as Record<string, unknown>;
    const globalAny = globalThis as unknown as Record<string, unknown>;
    const previousWindow = globalAny.window;
    globalAny.window = stubbedWindow;

    try {
      const { installReactRenderRecorder } = await import("./index");
      const recorderStore = createRecorderStore();

      installReactRenderRecorder();
      const recorderGlobal = stubbedWindow.__REACT_RENDER_RECORDER__ as
        | { start: () => void; end: () => unknown; getFiberChanges: () => unknown[][] }
        | undefined;
      expect(typeof recorderGlobal?.start).toBe("function");
      expect(typeof recorderGlobal?.end).toBe("function");
      expect(typeof recorderGlobal?.getFiberChanges).toBe("function");

      expect(recorderGlobal!.getFiberChanges()).toEqual([]);

      recorderStore.startRecording();
      mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
      recorderStore.endRecording([
        [{ displayName: "Foo", actualDuration: 1.5, selfDuration: 0.5 } as never],
      ] as never);

      const fiberChanges = recorderGlobal!.getFiberChanges() as Array<
        Array<{ displayName: string }>
      >;
      expect(fiberChanges).toHaveLength(1);
      expect(fiberChanges[0]).toHaveLength(1);
      expect(fiberChanges[0][0].displayName).toBe("Foo");

      expect(() => JSON.stringify(fiberChanges)).not.toThrow();
    } finally {
      if (previousWindow === undefined) {
        delete globalAny.window;
      } else {
        globalAny.window = previousWindow;
      }
    }
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
