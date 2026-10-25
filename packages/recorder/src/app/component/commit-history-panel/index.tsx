/** @jsxImportSource preact */
import { useState } from "preact/hooks";

import {
  type CommitHistoryFormatOptions,
  readRecordingOption,
} from "@/features/options/recording-option";
import { Tabs } from "@/ui/primitives/tabs";
import { HistoryIcon } from "@/ui/icons/history-icon";
import { PaintIcon } from "@/ui/icons/paint-icon";
import { StatusIndicator } from "@/ui/icons/status-indicator";
import { useCommitHistory } from "@/hooks/use-commit-history";
import { useCommitHistoryViewStore } from "@/store/use-commit-history-view-store";
import { CommitHistoryContent } from "./component/history-view";
import { PaintCommitHistoryContent } from "./component/paint-view";
import { ViewOptionsPopover } from "./component/view-options-popover";

export function CommitHistoryPanel() {
  const { isOpen } = useCommitHistoryViewStore();
  const [showPaintView, setShowPaintView] = useState(false);
  const [options, setOptions] = useState<CommitHistoryFormatOptions>(readRecordingOption);
  const { commitCount, commitHistoryText, commitHistoryTextByPaint } = useCommitHistory(options);

  if (commitCount === 0) {
    return null;
  }

  return (
    <div
      aria-hidden={!isOpen}
      data-open={isOpen ? "true" : "false"}
      data-testid="commit-history-panel"
      inert={!isOpen}
      className="recorder-history-panel grid min-h-0 w-full"
    >
      <div className="min-h-0 overflow-hidden">
        <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(9,9,11,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Tabs.Root
            value={showPaintView ? "paint" : "history"}
            onValueChange={(value) => setShowPaintView(value === "paint")}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs.List testId="paint-view-toggle">
                <Tabs.Tab value="history" testId="paint-view-toggle-history">
                  <HistoryIcon active={!showPaintView} />
                  <span>By Commit</span>
                </Tabs.Tab>
                <span className="group relative inline-flex">
                  <Tabs.Tab value="paint" tone="accent" testId="paint-view-toggle-paint">
                    <PaintIcon active={showPaintView} />
                    <span>By Paint</span>
                  </Tabs.Tab>
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-amber-200 shadow-[0_0_16px_-2px_rgba(251,191,36,0.3),inset_0_1px_0_rgba(251,191,36,0.15)]">
                      <StatusIndicator tone="warning" pulse />
                      Experimental
                    </span>
                  </span>
                </span>
              </Tabs.List>
              <ViewOptionsPopover options={options} setOptions={setOptions} />
            </div>

            <div
              data-testid="commit-history-panel-content"
              className="mt-3 grid min-h-0 flex-1 overflow-hidden"
            >
              <div className="recorder-scrollbar-hidden min-h-0 overflow-y-auto">
                <Tabs.Panel value="history">
                  <CommitHistoryContent commitHistoryText={commitHistoryText} />
                </Tabs.Panel>
                <Tabs.Panel value="paint">
                  <PaintCommitHistoryContent commitHistoryTextByPaint={commitHistoryTextByPaint} />
                </Tabs.Panel>
              </div>
            </div>
          </Tabs.Root>
        </section>
      </div>
    </div>
  );
}
