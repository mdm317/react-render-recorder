import { useMemo, useState } from "react";
import { Tabs } from "@base-ui-components/react/tabs";

import { CompareControls } from "./components/compare-controls";
import { ParityPanel } from "./components/parity-panel";
import { RawDataPanel } from "./components/raw-data-panel";
import { TabBadge } from "./components/tab-badge";
import { useCompareStore } from "./hooks/use-compare-store";
import { EMPTY_PARITY_REPORT, getParityReport, getStatusText } from "./lib/parity-report";
import type { TabId } from "./lib/compare-types";

const getTabClassName = (state: { selected: boolean }) =>
  state.selected ? "tab tab-active" : "tab";

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("parity");
  const compareStore = useCompareStore();
  const parityReport = useMemo(() => {
    if (compareStore.recorderFiberChanges == null || compareStore.profilerRankedSummary == null) {
      return EMPTY_PARITY_REPORT;
    }

    return getParityReport(compareStore.recorderFiberChanges, compareStore.profilerRankedSummary);
  }, [compareStore.recorderFiberChanges, compareStore.profilerRankedSummary]);
  const fatalError = compareStore.error ?? compareStore.recorderFiberChanges?.error ?? null;

  return (
    <div className="layout">
      <CompareControls
        onRefresh={compareStore.fetchComparison}
        onStart={compareStore.startRecording}
        onStop={compareStore.stopRecording}
        status={compareStore.status}
        statusText={getStatusText(compareStore.status)}
      />
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
        className="tabs-root"
      >
        <Tabs.List className="tabs">
          <Tabs.Tab value="parity" className={getTabClassName}>
            Parity
            <TabBadge
              matchedCount={parityReport.matchedCount}
              mismatchedCount={parityReport.mismatchedCount}
            />
          </Tabs.Tab>
          <Tabs.Tab value="raw" className={getTabClassName}>
            Raw data
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="parity" keepMounted className="tab-panel">
          <ParityPanel
            commitPairs={parityReport.commitPairs}
            matchedCount={parityReport.matchedCount}
            mismatchedCount={parityReport.mismatchedCount}
          />
        </Tabs.Panel>
        <Tabs.Panel value="raw" keepMounted className="tab-panel">
          <RawDataPanel
            fatalError={fatalError}
            profilerRankedSummary={compareStore.profilerRankedSummary}
            recorderFiberChanges={compareStore.recorderFiberChanges}
          />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
