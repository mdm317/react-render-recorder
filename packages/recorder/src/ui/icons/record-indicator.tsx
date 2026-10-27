/** @jsxImportSource preact */

type RecordIndicatorProps = {
  isRecording: boolean;
};

export function RecordIndicator({ isRecording }: RecordIndicatorProps) {
  return (
    <span
      className={[
        "pointer-events-none relative size-2.5 transition-[background-color,box-shadow] duration-200",
        isRecording
          ? "rounded-[2px] bg-rose-400 group-hover:bg-rose-300 group-hover:shadow-[0_0_8px_rgba(251,113,133,0.45)]"
          : "rounded-full bg-zinc-500 group-hover:bg-zinc-300 group-hover:shadow-[0_0_8px_rgba(212,212,216,0.35)]",
      ].join(" ")}
    />
  );
}
