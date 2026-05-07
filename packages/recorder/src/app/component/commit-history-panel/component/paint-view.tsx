/** @jsxImportSource preact */
import { CopyHistoryButton } from "../../common/copy-history-button";

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
        <CopyHistoryButton
          label="Copy all"
          section="commit"
          testId="copy-paint-history-button"
          text={allText}
        />
      </div>

      {commitHistoryTextByPaint.map((paintText, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-lg border border-white/10 bg-black/25"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-200">
              Paint {index + 1}
            </div>
            <CopyHistoryButton section="commit" text={paintText} />
          </div>
          <pre className="recorder-scrollbar-hidden max-h-48 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
            {paintText}
          </pre>
        </article>
      ))}
    </div>
  );
}
