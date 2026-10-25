/** @jsxImportSource preact */

type HistoryIconProps = {
  active: boolean;
  size?: number;
};

export function HistoryIcon({ active, size = 10 }: HistoryIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className="shrink-0">
      <rect
        x="1"
        y="1.5"
        width="8"
        height="1.25"
        rx="0.6"
        fill="currentColor"
        opacity={active ? 1 : 0.6}
      />
      <rect
        x="1"
        y="4.4"
        width="8"
        height="1.25"
        rx="0.6"
        fill="currentColor"
        opacity={active ? 0.85 : 0.5}
      />
      <rect
        x="1"
        y="7.3"
        width="5"
        height="1.25"
        rx="0.6"
        fill="currentColor"
        opacity={active ? 0.7 : 0.4}
      />
    </svg>
  );
}
