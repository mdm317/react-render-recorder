/** @jsxImportSource preact */
import { useCommitHistoryViewStore } from "@/store/use-commit-history-view-store";
import { HistoryIcon } from "@/ui/icons/history-icon";

export function CommitHistoryPanelToggleButton() {
  const { hasCommitHistory, isOpen, toggle } = useCommitHistoryViewStore();

  if (!hasCommitHistory) {
    return null;
  }

  return (
    <button
      data-testid="commit-history-toggle"
      data-open={isOpen ? "true" : "false"}
      type="button"
      title={isOpen ? "Hide commit history" : "Show commit history"}
      onClick={toggle}
      className={[
        "recorder-btn group relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-recorder-border outline-none",
        "transition-[color,box-shadow,border-color,background-color] duration-300 ease-out",
        "focus-visible:ring-2 focus-visible:ring-recorder-record/60 active:brightness-90",
        isOpen
          ? "border-recorder-record/30 bg-[linear-gradient(180deg,#1a0a0e_0%,#0d0608_100%)] text-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.18),0_8px_22px_rgba(0,0,0,0.45)] hover:text-rose-300 hover:shadow-[0_0_28px_rgba(225,29,72,0.28),0_12px_30px_rgba(0,0,0,0.55)]"
          : "bg-[linear-gradient(180deg,var(--color-recorder-surface)_0%,var(--color-recorder-ink)_100%)] text-zinc-500 shadow-[0_8px_22px_rgba(0,0,0,0.3)] hover:border-white/16 hover:text-zinc-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)]",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          isOpen ? "bg-rose-300/10" : "bg-white/10",
        ].join(" ")}
      />
      <span
        className={[
          "pointer-events-none absolute inset-[1px] rounded-full border transition-colors duration-300",
          isOpen
            ? "border-rose-500/10 group-hover:border-rose-300/30"
            : "border-white/6 group-hover:border-white/20",
        ].join(" ")}
      />
      <HistoryIcon active={isOpen} size={16} />
    </button>
  );
}
