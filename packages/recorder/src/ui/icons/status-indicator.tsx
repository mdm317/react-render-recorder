/** @jsxImportSource preact */

export type StatusIndicatorTone = "warning" | "info";

type StatusIndicatorProps = {
  tone: StatusIndicatorTone;
  pulse?: boolean;
};

const TONE_STYLES = {
  warning: {
    pulse: "bg-amber-400/40",
    dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  },
  info: {
    pulse: "bg-sky-400/40",
    dot: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]",
  },
} as const;

export function StatusIndicator({ tone, pulse = false }: StatusIndicatorProps) {
  const styles = TONE_STYLES[tone];

  return (
    <span className="relative inline-flex size-2 shrink-0">
      {pulse && (
        <span className={`absolute inset-[-2px] animate-ping rounded-full ${styles.pulse}`} />
      )}
      <span className={`relative inline-block size-2 rounded-full ${styles.dot}`} />
    </span>
  );
}
