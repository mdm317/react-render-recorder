export { mountRecorderUI } from "./ui/mountRecorderUI";
export type { RecorderUIOptions } from "./ui/mountRecorderUI";
export {
  createRecorderSnapshot,
  installReactRecordCommitLogger,
  registerOnCommitFiberRoot,
} from "./core";
export type {
  CommitFiberRootCallback,
  InstallReactRecordCommitLoggerOptions,
  RecorderSnapshot,
  RecorderSnapshotOptions,
} from "./core";
