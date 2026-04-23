/** @jsxImportSource preact */

type PaintViewToggleButtonProps = {
  isPressed: boolean;
  onToggle: () => void;
  text?: string;
  historyLabel?: string;
  paintLabel?: string;
};

export function PaintViewToggleButton({
  isPressed,
  onToggle,
  historyLabel = "By Commit",
  paintLabel = "By Paint",
}: PaintViewToggleButtonProps) {
  const select = (next: boolean) => {
    if (next !== isPressed) onToggle();
  };

  return (
    <div className="mt-3">
      <div
        data-testid="paint-view-toggle"
        role="radiogroup"
        aria-label="View grouping mode"
        className="relative inline-flex items-center rounded-full border border-white/10 bg-black/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_6px_20px_-8px_rgba(0,0,0,0.6)]"
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full",
            "transition-[left,background-color,box-shadow] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isPressed
              ? "left-[calc(50%+0.125rem)] bg-gradient-to-b from-sky-300/25 to-sky-500/10 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.4),0_0_22px_-4px_rgba(56,189,248,0.55)]"
              : "left-1 bg-gradient-to-b from-white/14 to-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
          ].join(" ")}
        />

        <button
          type="button"
          role="radio"
          aria-checked={!isPressed}
          data-testid="paint-view-toggle-history"
          onClick={() => select(false)}
          className={[
            "relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
            !isPressed ? "text-white" : "text-white/40 hover:text-white/75",
          ].join(" ")}
        >
          <HistoryGlyph active={!isPressed} />
          <span>{historyLabel}</span>
        </button>

        {/* By Paint button wrapped for hover tooltip */}
        <span className="group relative z-10">
          <button
            type="button"
            role="radio"
            aria-checked={isPressed}
            aria-describedby="paint-view-experiment-note"
            data-testid="paint-view-toggle-paint"
            onClick={() => select(true)}
            className={[
              "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40 focus-visible:ring-offset-0",
              isPressed ? "text-sky-100" : "text-white/40 hover:text-white/75",
            ].join(" ")}
          >
            <PaintGlyph active={isPressed} />
            <span>{paintLabel}</span>
          </button>

          <span
            id="paint-view-experiment-note"
            role="status"
            aria-live="polite"
            className={[
              "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2",
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1",
              "text-[0.62rem] font-bold uppercase tracking-[0.2em]",
              "opacity-0 transition-all duration-200 group-hover:opacity-100",
              "border-amber-400/50 bg-amber-400/15 text-amber-200 shadow-[0_0_16px_-2px_rgba(251,191,36,0.3),inset_0_1px_0_rgba(251,191,36,0.15)]",
            ].join(" ")}
          >
            <span className="relative inline-flex h-2 w-2">
              <span
                aria-hidden="true"
                className="absolute inset-[-2px] rounded-full bg-amber-400/40 animate-ping"
              />
              <span
                aria-hidden="true"
                className="relative inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
              />
            </span>
            Experimental
          </span>
        </span>
      </div>
    </div>
  );
}

function HistoryGlyph({ active }: { active: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1.5" width="8" height="1.25" rx="0.6" fill="currentColor" opacity={active ? 1 : 0.6} />
      <rect x="1" y="4.4" width="8" height="1.25" rx="0.6" fill="currentColor" opacity={active ? 0.85 : 0.5} />
      <rect x="1" y="7.3" width="5" height="1.25" rx="0.6" fill="currentColor" opacity={active ? 0.7 : 0.4} />
    </svg>
  );
}

function PaintGlyph({ active }: { active: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M1.6 8.4 C 3 6.4, 5.2 4.2, 8.4 1.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={active ? 1 : 0.55}
      />
      <circle cx="8.4" cy="1.6" r="1.1" fill="currentColor" opacity={active ? 1 : 0.55} />
    </svg>
  );
}
