/** @jsxImportSource preact */
import { CopyHistoryButton } from "../../common/copy-history-button";

type CommitSegmentByPaint = {
  endCommitIndex: number;
  id: string;
  paintNumber: number;
  startCommitIndex: number;
  text: string;
};

type PaintCommitHistoryContentProps = {
  commitSegmentsByPaint: CommitSegmentByPaint[];
  commitHistoryWithPaintText: string;
};

export function PaintCommitHistoryContent({
  commitSegmentsByPaint,
  commitHistoryWithPaintText,
}: PaintCommitHistoryContentProps) {
  if (commitSegmentsByPaint.length === 0) {
    return (
      <p
        data-testid="paint-history-empty"
        className="mt-4 rounded-lg border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100"
      >
        기록된 paint marker가 없습니다.
      </p>
    );
  }

  return (
    <div data-testid="paint-segment-result" className="mt-4 space-y-3">
      <div className="flex justify-end">
        <CopyHistoryButton
          label="Copy all"
          section="commit"
          testId="copy-paint-history-button"
          text={commitHistoryWithPaintText}
        />
      </div>

      {commitSegmentsByPaint.map((segment) => {
        const startCommitLabel = segment.startCommitIndex + 1;
        const endCommitLabel = segment.endCommitIndex + 1;

        return (
          <article
            key={segment.id}
            className="overflow-hidden rounded-lg border border-white/10 bg-black/25"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-200">
                  Paint {segment.paintNumber}
                </div>
                <p className="mt-1 text-xs text-white/45">
                  Commit range: {startCommitLabel}
                  {startCommitLabel === endCommitLabel ? null : `-${endCommitLabel}`}
                </p>
              </div>
              <CopyHistoryButton section="commit" text={segment.text} />
            </div>
            <pre className="recorder-scrollbar-hidden max-h-48 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
              {segment.text}
            </pre>
          </article>
        );
      })}
    </div>
  );
}
