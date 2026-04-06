/** @jsxImportSource preact */

import { useRecorderStore } from "./useRecorderStore";

export function RecorderButton() {
  const { state } = useRecorderStore();

  return (
    <button
      type="button"
      aria-label="Open recorder state"
      onClick={() => {
        console.log(state);
      }}
      className="group relative inline-flex items-center gap-3 rounded-full border border-white/12 bg-[linear-gradient(180deg,#101115_0%,#020202_100%)] px-3 py-3 text-[0.7rem] font-black uppercase tracking-[0.34em] text-white shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_48px_rgba(0,0,0,0.5)] active:translate-y-0"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-full border border-white/8"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_34%),linear-gradient(135deg,rgba(255,84,107,0.22),transparent_46%)]"
      />
      <span className="relative flex size-10 items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle_at_35%_30%,#ffcdc9_0%,#ff6b7d_28%,#e11d48_58%,#4a0712_100%)] shadow-[0_0_26px_rgba(225,29,72,0.45)]">
        <span className="absolute size-6 rounded-full bg-white/18 blur-[2px] transition duration-200 group-hover:scale-110" />
        <span className="absolute size-4 rounded-full bg-white/12 animate-pulse" />
        <span className="relative size-3 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
      </span>
      <span className="relative pr-1 text-white/92">REC</span>
    </button>
  );
}
