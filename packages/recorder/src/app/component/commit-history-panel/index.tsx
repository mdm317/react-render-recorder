/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { useCommitHistory } from "../../../hooks/use-commit-history";
import { CommitHistoryFilterInput } from "./component/component-filter-input";
import { CommitHistoryContent } from "./component/history-view";
import { PaintCommitHistoryContent } from "./component/paint-view";
import { PaintViewToggleButton } from "./component/paint-view-toggle";

export function CommitHistoryPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [showPaintView, setShowPaintView] = useState(false);
  const {
    availableComponentNames,
    commitCount,
    commitHistoryText,
    commitSegmentsByPaint,
    componentNameFilter,
    hookHistoryText,
    matchingComponents,
    commitHistoryWithPaintText,
    setComponentNameFilter,
  } = useCommitHistory();

  if (commitCount === 0) {
    return null;
  }

  const hasNoMatchingComponent =
    componentNameFilter.trim().length > 0 && matchingComponents.length === 0;

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(9,9,11,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <CommitHistoryHeader
        commitCount={commitCount}
        componentCount={availableComponentNames.length}
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

      <PaintViewToggleButton
        isPressed={showPaintView}
        onToggle={() => {
          setShowPaintView((prev) => !prev);
        }}
        text={showPaintView ? "Show history" : "Show paint"}
      />

      <CollapsibleContent
        className="min-h-0"
        id="commit-history-panel-content"
        isOpen={isOpen}
        openClassName="mt-3"
      >
        <CommitHistoryFilterInput
          helperText={
            availableComponentNames.length > 0
              ? `Available: ${availableComponentNames.join(", ")}`
              : null
          }
          setValue={setComponentNameFilter}
          value={componentNameFilter}
        />

        {hasNoMatchingComponent ? (
          <NoMatchMessage />
        ) : showPaintView ? (
          <PaintCommitHistoryContent
            commitSegmentsByPaint={commitSegmentsByPaint}
            commitHistoryWithPaintText={commitHistoryWithPaintText}
          />
        ) : (
          <CommitHistoryContent
            commitHistoryText={commitHistoryText}
            hookHistoryText={hookHistoryText}
          />
        )}
      </CollapsibleContent>
    </section>
  );
}

type CommitHistoryHeaderProps = {
  commitCount: number;
  componentCount: number;
  headerAction: ComponentChildren;
};

function CommitHistoryHeader({
  commitCount,
  componentCount,
  headerAction,
}: CommitHistoryHeaderProps) {
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
        <p data-testid="component-count">{componentCount} component(s)</p>
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
      <div className={["min-h-0 overflow-hidden", innerClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </div>
  );
}

function NoMatchMessage() {
  return (
    <p
      data-testid="component-filter-no-match"
      className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      입력한 이름과 일치하는 컴포넌트가 없습니다.
    </p>
  );
}
