/** @jsxImportSource preact */
import { CommitHistoryPanel } from "./component/commit-history-panel";
import { RecordButton } from "./component/record-button";

export function App() {
  return (
    <div className="flex max-w-[min(34rem,calc(100vw-2rem))] flex-col items-end gap-3">
      <RecordButton />
      <CommitHistoryPanel />
    </div>
  );
}
