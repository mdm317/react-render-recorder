import type { CommittedFiberChange } from "devtools-api";
import { RendererID, type RecorderFiberRoot } from "devtools-api";

export type CommitData = {
  rendererID: RendererID;
  root: RecorderFiberRoot;
  priorityLevel?: number;
};

export type RecorderStoreState = {
  isRecording: boolean;
  commits: CommitData[];
  fiberChanges: CommittedFiberChange[];
};
