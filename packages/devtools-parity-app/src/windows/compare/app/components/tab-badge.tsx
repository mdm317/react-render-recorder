type TabBadgeProps = {
  matchedCount: number;
  mismatchedCount: number;
};

export function TabBadge({ matchedCount, mismatchedCount }: TabBadgeProps) {
  if (matchedCount + mismatchedCount === 0) return null;

  const isMismatched = mismatchedCount > 0;
  return (
    <span className={`tab-badge tab-badge-${isMismatched ? "mismatched" : "matched"}`}>
      {isMismatched ? `${mismatchedCount} ✗` : `${matchedCount} ✓`}
    </span>
  );
}
