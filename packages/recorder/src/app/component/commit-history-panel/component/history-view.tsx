/** @jsxImportSource preact */
import { HistoryTextCard } from "./history-text-card";

type CommitHistoryContentProps = {
  commitHistoryText: string;
};

export function CommitHistoryContent({ commitHistoryText }: CommitHistoryContentProps) {
  return (
    <div data-testid="commit-history-result" className="mt-4 space-y-4">
      <HistoryTextCard section="commit" text={commitHistoryText} title="Commit history" />
    </div>
  );
}
