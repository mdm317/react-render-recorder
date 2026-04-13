/** @jsxImportSource preact */

type PaintViewToggleButtonProps = {
  isPressed: boolean;
  onToggle: () => void;
  text: string;
};

export function PaintViewToggleButton({ isPressed, onToggle, text }: PaintViewToggleButtonProps) {
  return (
    <div className="group mt-3 flex items-center gap-2">
      <button
        type="button"
        data-testid="paint-view-toggle"
        aria-describedby="paint-view-experiment-note"
        aria-pressed={isPressed}
        onClick={onToggle}
        className={[
          "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition",
          isPressed
            ? "border-sky-300/40 bg-sky-400/12 text-sky-100"
            : "border-white/12 bg-white/6 text-white/72 hover:border-sky-300/30 hover:bg-white/10 hover:text-white",
        ].join(" ")}
      >
        {text}
      </button>
      <span
        id="paint-view-experiment-note"
        className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sky-100/70 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        Experimental
      </span>
    </div>
  );
}
