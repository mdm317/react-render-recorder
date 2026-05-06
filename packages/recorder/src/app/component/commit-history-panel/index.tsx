/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { useCommitHistory } from "../../../hooks/use-commit-history";
import { CommitHistoryContent } from "./component/history-view";
import { PaintCommitHistoryContent } from "./component/paint-view";
import { PaintViewToggleButton } from "./component/paint-view-toggle";
import {
  INITIAL_RECORDER_OPTIONS,
  type RecorderOptionsState,
  ViewOptionsPopover,
} from "./component/view-options-popover";

export function CommitHistoryPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [showPaintView, setShowPaintView] = useState(false);
  const [options, setOptions] = useState<RecorderOptionsState>(INITIAL_RECORDER_OPTIONS);
  const { commitCount, commitHistoryText, commitHistoryTextByPaint } = useCommitHistory({
    includeRenderDuration: options.isRenderDurationVisible,
    includeRerenderCount: options.isRerenderCountVisible,
  });

  if (commitCount === 0) {
    return null;
  }

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(9,9,11,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <CommitHistoryHeader
        commitCount={commitCount}
        headerAction={
          <button
            data-testid="commit-history-toggle"
            type="button"
            aria-controls="commit-history-panel-content"
            aria-expanded={isOpen}
            onClick={() => {
              setIsOpen((prev) => !prev);
            }}
            className="mt-3 inline-flex min-w-20 items-center justify-center rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            {isOpen ? "닫기" : "열기"}
          </button>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <PaintViewToggleButton
          isPressed={showPaintView}
          onToggle={() => {
            setShowPaintView((prev) => !prev);
          }}
        />
        <ViewOptionsPopover options={options} setOptions={setOptions} />
      </div>

      <CollapsibleContent
        className="min-h-0 flex-1"
        id="commit-history-panel-content"
        innerClassName="recorder-scrollbar-hidden overflow-y-auto"
        isOpen={isOpen}
        openClassName="mt-3"
      >
        {showPaintView ? (
          <PaintCommitHistoryContent commitHistoryTextByPaint={commitHistoryTextByPaint} />
        ) : (
          <CommitHistoryContent commitHistoryText={commitHistoryText} />
        )}
      </CollapsibleContent>
    </section>
  );
}

type CommitHistoryHeaderProps = {
  commitCount: number;
  headerAction: ComponentChildren;
};

function CommitHistoryHeader({ commitCount, headerAction }: CommitHistoryHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-rose-300">
          Component Filter
        </p>
        <p className="mt-1 text-sm text-white/70">
          녹화가 끝났습니다. 비워두면 전체를, 입력하면 해당 데이터만 표시합니다.
        </p>
      </div>
      <div className="text-right text-[0.7rem] text-white/45">
        <p data-testid="commit-count">{commitCount} commit(s)</p>
        {headerAction}
      </div>
    </div>
  );
}

type CollapsibleContentProps = {
  children: ComponentChildren;
  className?: string;
  id?: string;
  innerClassName?: string;
  isOpen: boolean;
  openClassName?: string;
};

function CollapsibleContent({
  children,
  className,
  id,
  innerClassName,
  isOpen,
  openClassName,
}: CollapsibleContentProps) {
  return (
    <div
      id={id}
      data-testid={id}
      aria-hidden={!isOpen}
      className={[
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
        className,
        isOpen
          ? [openClassName, "grid-rows-[1fr] opacity-100"].filter(Boolean).join(" ")
          : "grid-rows-[0fr] opacity-0",
      ].join(" ")}
    >
      <div className={["min-h-0", innerClassName ?? "overflow-hidden"].filter(Boolean).join(" ")}>
        {children}
      </div>
    </div>
  );
}
