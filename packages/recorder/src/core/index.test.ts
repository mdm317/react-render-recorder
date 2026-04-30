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

  it("exposes window.__REACT_RENDER_RECORDER__ returning a JSON-safe snapshot shape", async () => {
    const stubbedWindow = {} as Record<string, unknown>;
    const globalAny = globalThis as unknown as Record<string, unknown>;
    const previousWindow = globalAny.window;
    globalAny.window = stubbedWindow;

    try {
      const { installReactRenderRecorder } = await import("./index");
      const recorderStore = createRecorderStore();

      installReactRenderRecorder();
      const recorderGlobal = stubbedWindow.__REACT_RENDER_RECORDER__ as
        | { snapshot: () => unknown; start: () => void; end: () => unknown }
        | undefined;
      expect(typeof recorderGlobal?.snapshot).toBe("function");
      expect(typeof recorderGlobal?.start).toBe("function");
      expect(typeof recorderGlobal?.end).toBe("function");
      const snapshotFn = recorderGlobal!.snapshot as () => unknown;

      const initialSnapshot = snapshotFn!() as Record<string, unknown>;
      expect(initialSnapshot).toMatchObject({
        commitCount: 0,
        isRecording: false,
        paintCommitIndices: [],
      });
      expect(Array.isArray(initialSnapshot.commits)).toBe(true);
      expect((initialSnapshot.commits as unknown[]).length).toBe(0);

      recorderStore.startRecording();
      mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
      recorderStore.endRecording([
        [{ displayName: "Foo", actualDuration: 1.5, selfDuration: 0.5 } as never],
      ] as never);

      const afterSnapshot = snapshotFn!() as {
        commitCount: number;
        commits: Array<{ commitIndex: number; entries: unknown[] }>;
      };
      expect(afterSnapshot.commitCount).toBe(1);
      expect(afterSnapshot.commits).toHaveLength(1);
      expect(afterSnapshot.commits[0].commitIndex).toBe(0);

      expect(() => JSON.stringify(afterSnapshot)).not.toThrow();
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
