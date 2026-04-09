import { RendererID, type FiberRoot } from "devtools-api";

export type CommitData = {
  rendererID: RendererID;
  root: FiberRoot;
  priorityLevel?: number;
};
