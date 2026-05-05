import type { CommitPair } from "../lib/build-commit-pairs";
import { CommitSummaryTable } from "./commit-summary-table";

const PARITY_NOTE =
  "Multiset compare per commit · ForwardRef/Memo wrappers stripped · selfDuration rounded to 3 decimals · single-root";

type ParityPanelProps = {
  commitPairs: CommitPair[];
  matchedCount: number;
  mismatchedCount: number;
};

export function ParityPanel({ commitPairs, matchedCount, mismatchedCount }: ParityPanelProps) {
  const hasCommitPairs = commitPairs.length > 0;
  const mismatchStatus = mismatchedCount > 0 ? "mismatched" : "matched";

  return (
    <div className="parity-section">
      <header className="parity-header">
        <h2>Per-commit parity</h2>
        <div className="parity-meta">
          {hasCommitPairs ? (
            <>
              <span className="status-pill status-matched">✓ {matchedCount}</span>
              <span className={`status-pill status-${mismatchStatus}`}>✗ {mismatchedCount}</span>
              <span className="parity-meta-note">{PARITY_NOTE}</span>
            </>
          ) : (
            <span className="parity-meta-note">No data yet</span>
          )}
        </div>
      </header>
      <CommitSummaryTable data={commitPairs} />
    </div>
  );
}
