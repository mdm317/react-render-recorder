/** @jsxImportSource preact */

type PaintIconProps = {
  active: boolean;
  size?: number;
};

export function PaintIcon({ active, size = 10 }: PaintIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className="shrink-0">
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
