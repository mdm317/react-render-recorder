/** @jsxImportSource preact */
import { CommitHistoryPanel } from "@/app/component/commit-history-panel";
import { RecordButton } from "@/app/component/record-button";
import { RecordingOption } from "@/app/component/recording-option";
import { CommitHistoryPanelToggleButton } from "@/app/component/commit-history-panel-toggle-button";

export function App() {
  return (
    <div className="flex max-h-[calc(100vh-2rem)] w-[34rem] max-w-[calc(100vw-2rem)] flex-col items-end">
      <div className="flex items-center gap-2">
        <RecordingOption />
        <RecordButton />
        <CommitHistoryPanelToggleButton />
      </div>
      <CommitHistoryPanel />
    </div>
  );
}
