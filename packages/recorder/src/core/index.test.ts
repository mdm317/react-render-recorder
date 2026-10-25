import type { installHook } from "@react-record/devtools-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRecorderStore } from "@/store/recorder-store";
import type { ReactCommitCallback } from "./on-react-commit";
import type { ReactPaintCallback } from "./on-react-paint";

const mocks = vi.hoisted(() => ({
  commitCallbacks: [] as ReactCommitCallback[],
  onCommitFiber: vi.fn(() => []),
  paintCallbacks: [] as ReactPaintCallback[],
  startRecording: vi.fn(),
}));

vi.mock("@react-record/devtools-api", () => ({
  onCommitFiber: mocks.onCommitFiber,
  startRecording: mocks.startRecording,
  endRecording: vi.fn(() => []),
}));

vi.mock("@/ui/render-recorder-ui", () => ({
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
    mocks.startRecording.mockClear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it("starts recording on the first mounted commit when record is enabled in the URL", async () => {
    vi.stubGlobal("window", { location: { search: "?record=true" } });
    const { installReactRenderRecorder } = await import("./index");
    const recorderStore = createRecorderStore();
    const recordCommit = vi.spyOn(recorderStore, "recordCommit");
    const root = createMountedRoot();

    installReactRenderRecorder();
    mocks.commitCallbacks[0](createHook(), 1, root);

    expect(mocks.startRecording).toHaveBeenCalledWith([root]);
    expect(recorderStore.getSnapshot().isRecording).toBe(true);
    expect(recordCommit).toHaveBeenCalledTimes(1);

    recorderStore.endRecording([] as never);
    mocks.commitCallbacks[0](createHook(), 1, createMountedRoot());
    expect(recorderStore.getSnapshot().isRecording).toBe(false);
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
