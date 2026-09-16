/** @jsxImportSource preact */
import { CopyTextButton } from "../../common/copy-text-button";
import { HistoryTextCard } from "./history-text-card";

type PaintCommitHistoryContentProps = {
  commitHistoryTextByPaint: string[];
};

export function PaintCommitHistoryContent({
  commitHistoryTextByPaint,
}: PaintCommitHistoryContentProps) {
  const allText = commitHistoryTextByPaint.join("\n\n");

  return (
    <div data-testid="paint-segment-result" className="mt-4 space-y-3">
      <div className="flex justify-end">
        <CopyTextButton
          label="Copy all"
          section="commit"
          testId="copy-paint-history-button"
          text={allText}
        />
      </div>

      {commitHistoryTextByPaint.map((paintText, index) => (
        <HistoryTextCard
          key={index}
          className="rounded-lg"
          maxHeightClass="max-h-48"
          section="commit"
          text={paintText}
          title={`Paint ${index + 1}`}
        />
      ))}
    </div>
  );
}
