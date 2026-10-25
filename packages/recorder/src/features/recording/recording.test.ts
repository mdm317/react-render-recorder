import { endRecording as endDevtoolsRecording } from "@react-record/devtools-api";
import { expect, it, vi } from "vitest";
import { inspectSymbolicateSource, type SourceResults } from "@/lib/inspect-symbolicate-source";
import { createRecorderStore } from "./recorder-store";
import { endRecording } from "./recording";

vi.mock("@react-record/devtools-api", () => ({
  endRecording: vi.fn(),
  startRecording: vi.fn(),
}));
vi.mock("@/lib/inspect-symbolicate-source", async (importOriginal) => ({
  ...(await importOriginal()),
  inspectSymbolicateSource: vi.fn(),
}));

it("resolves sources when recording ends without waiting for a history request", async () => {
  const store = createRecorderStore();
  store.reset();
  const fiberChanges = [[]];
  let resolveSources!: (results: SourceResults) => void;
  vi.mocked(endDevtoolsRecording).mockReturnValue(fiberChanges);
  vi.mocked(inspectSymbolicateSource).mockReturnValue(
    new Promise((resolve) => {
      resolveSources = resolve;
    }),
  );
  store.startRecording();

  expect(endRecording(store)).toBe(fiberChanges);
  expect(store.getSnapshot().isRecording).toBe(false);
  expect(store.getSnapshot().sourceResults).toBeNull();
  expect(inspectSymbolicateSource).toHaveBeenCalledExactlyOnceWith([]);
  expect(endRecording(store)).toBeNull();
  expect(inspectSymbolicateSource).toHaveBeenCalledTimes(1);

  const sourceResults = {};
  resolveSources(sourceResults);
  await vi.waitFor(() => expect(store.getSnapshot().sourceResults).toBe(sourceResults));
  store.reset();
});
