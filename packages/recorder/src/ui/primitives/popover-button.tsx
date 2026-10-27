/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

type PopoverButtonProps = {
  trigger: ComponentChildren;
  popupContent: ComponentChildren;
  testId?: string;
  popupTestId?: string;
  placement?: "top" | "bottom";
};

export function PopoverButton({
  trigger,
  popupContent,
  testId,
  popupTestId,
  placement = "top",
}: PopoverButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function dismiss(event: PointerEvent) {
      if (!event.composedPath().includes(containerRef.current!)) setOpen(false);
    }

    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }

    window.addEventListener("pointerdown", dismiss, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        data-testid={testId}
        data-open={open ? "true" : "false"}
        onClick={() => setOpen((value) => !value)}
        className={[
          "recorder-btn group relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-recorder-border outline-none",
          "transition-[color,box-shadow,border-color,background-color] duration-300 ease-out",
          "focus-visible:ring-2 focus-visible:ring-recorder-record/60 active:brightness-90",
          open
            ? "border-recorder-record/30 bg-[linear-gradient(180deg,#1a0a0e_0%,#0d0608_100%)] shadow-[0_0_20px_rgba(225,29,72,0.18),0_8px_22px_rgba(0,0,0,0.45)] hover:shadow-[0_0_28px_rgba(225,29,72,0.28),0_12px_30px_rgba(0,0,0,0.55)]"
            : "bg-[linear-gradient(180deg,var(--color-recorder-surface)_0%,var(--color-recorder-ink)_100%)] shadow-[0_8px_22px_rgba(0,0,0,0.3)] hover:border-white/16 hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)]",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            open ? "bg-rose-300/10" : "bg-white/10",
          ].join(" ")}
        />
        <span
          className={[
            "pointer-events-none absolute inset-[1px] rounded-full border transition-colors duration-300",
            open
              ? "border-rose-500/10 group-hover:border-rose-300/30"
              : "border-white/6 group-hover:border-white/20",
          ].join(" ")}
        />
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          data-testid={popupTestId}
          className={[
            "absolute right-0 z-30 min-w-[12rem] rounded-xl border border-white/12 bg-recorder-surface p-1.5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.55)]",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          ].join(" ")}
        >
          {popupContent}
        </div>
      )}
    </div>
  );
}
