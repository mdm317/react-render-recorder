import type { CommittedFiberChange } from "devtools-api";
import { RendererID, type FiberRoot } from "devtools-api";

export type CommitData = {
  rendererID: RendererID;
  root: FiberRoot;
  priorityLevel?: number;
};

export type RecorderStoreState = {
  isRecording: boolean;
  commits: CommitData[];
  fiberChanges: CommittedFiberChange[];
};
