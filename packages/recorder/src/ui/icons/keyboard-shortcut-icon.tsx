/** @jsxImportSource preact */

type KeyboardShortcutIconProps = {
  active: boolean;
};

export function KeyboardShortcutIcon({ active }: KeyboardShortcutIconProps) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 20 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={[
          "size-[18px] transition-colors duration-300",
          active ? "text-white" : "text-white",
        ].join(" ")}
      >
        <rect x="1" y="1" width="18" height="12" rx="2.2" />
        <path d="M4.2 4.4h0.01M7.2 4.4h0.01M10.2 4.4h0.01M13.2 4.4h0.01M16.2 4.4h0.01M4.2 7.2h0.01M7.2 7.2h0.01M10.2 7.2h0.01M13.2 7.2h0.01M16.2 7.2h0.01M6 10.2h8" />
      </svg>
      <span
        className={[
          "pointer-events-none absolute -bottom-[1px] -right-[1px] size-[7px] rounded-full border transition-opacity duration-300 group-hover:opacity-0",
          active
            ? "border-rose-200/70 bg-rose-400 shadow-[0_0_6px_rgba(253,164,175,0.85)]"
            : "border-zinc-900 bg-zinc-600",
        ].join(" ")}
      />
    </span>
  );
}
