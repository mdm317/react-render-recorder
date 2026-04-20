/** @jsxImportSource preact */
import { CommitHistoryPanel } from "./component/commit-history-panel";
import { RecordButton } from "./component/record-button";
import { RecordingOption } from "./component/recording-option";

export function App() {
  return (
    <div className="flex max-h-[calc(100vh-2rem)] w-[34rem] max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      <div className="flex items-center gap-2">
        <RecordingOption />
        <RecordButton />
      </div>
      <CommitHistoryPanel />
    </div>
  );
}
