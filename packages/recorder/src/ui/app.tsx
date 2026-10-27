/** @jsxImportSource preact */
import { CommitHistoryPanel } from "@/features/commit-history/components/commit-history-panel";
import { RecordButton } from "@/features/recording/components/record-button";
import { RecordingToolbar } from "@/features/recording/components/recording-toolbar";
import { CommitHistoryPanelToggleButton } from "@/features/commit-history/components/commit-history-panel-toggle-button";

export function App() {
  return (
    <div className="flex max-h-[calc(100vh-2rem)] w-[34rem] max-w-[calc(100vw-2rem)] flex-col items-end">
      <div className="flex items-center gap-2">
        <RecordingToolbar />
        <RecordButton />
        <CommitHistoryPanelToggleButton />
      </div>
      <CommitHistoryPanel />
    </div>
  );
}
