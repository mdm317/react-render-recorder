import type { FiberRoot, RendererID } from "@react-record/devtools-api";

export type CommitData = {
  rendererID: RendererID;
  root: FiberRoot;
  priorityLevel?: number;
};
