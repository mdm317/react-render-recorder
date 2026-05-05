import { describeFiberChanges, describeRankedSummary } from "../lib/parity-report";
import type { FiberChangesResult, RankedProfilerSummaryResult } from "../lib/compare-types";
import { Pane } from "./pane";

type RawDataPanelProps = {
  fatalError: string | null;
  profilerRankedSummary: RankedProfilerSummaryResult | null;
  recorderFiberChanges: FiberChangesResult | null;
};

export function RawDataPanel({
  fatalError,
  profilerRankedSummary,
  recorderFiberChanges,
}: RawDataPanelProps) {
  return (
    <div className="panes">
      <Pane
        title="recorder fiberChanges (raw)"
        summary={
          recorderFiberChanges ? describeFiberChanges(recorderFiberChanges.fiberChanges) : "—"
        }
        available={Boolean(recorderFiberChanges?.fiberChangesAvailable)}
        data={recorderFiberChanges?.fiberChanges}
        emptyMessage="No fiber changes captured yet. Click Start Recording, interact with the target page, then Stop Recording."
        errorMessage={fatalError}
      />
      <Pane
        title="react-devtools ranked summary (Profiler UI)"
        summary={describeRankedSummary(profilerRankedSummary?.data ?? null)}
        available={Boolean(profilerRankedSummary?.data && profilerRankedSummary.data.length > 0)}
        data={profilerRankedSummary?.data}
        emptyMessage="Ranked summary comes from the standalone DevTools profilingCache. Empty until the Profiler has processed data."
        errorMessage={profilerRankedSummary?.error ?? fatalError}
      />
    </div>
  );
}
