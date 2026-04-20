/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

import { useRecordingControl } from "../../../../hooks/use-recording-control";

type KeycapProps = {
  children: ComponentChildren;
  isEnabled: boolean;
  widthClass: string;
};

function Keycap({ children, isEnabled, widthClass }: KeycapProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "relative inline-flex h-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border px-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] transition-colors duration-300",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-1px_0_rgba(0,0,0,0.5),0_1px_0_rgba(0,0,0,0.6)]",
        widthClass,
        isEnabled
          ? "border-rose-400/35 bg-[linear-gradient(180deg,#2a0d14_0%,#14060a_100%)] text-rose-100"
          : "border-white/12 bg-[linear-gradient(180deg,#26262a_0%,#18181b_100%)] text-white/75",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[4px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_100%)]"
      />
      <span className="relative leading-none">{children}</span>
    </span>
  );
}

export function KeyboardShortcutToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const onToggle = () => {
    setIsEnabled((prev) => !prev);
  };
  const { toggleRecording } = useRecordingControl();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const isCtrlR =
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.code === "KeyR" || event.key.toLowerCase() === "r");

      if (!isCtrlR) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!event.repeat) {
        toggleRecording();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isEnabled, toggleRecording]);

  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center">
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={
          isEnabled
            ? "Disable Ctrl+R keyboard shortcut for recording"
            : "Enable Ctrl+R keyboard shortcut for recording"
        }
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className={[
          "recorder-btn group absolute right-0 top-0 flex h-10 w-10 items-center overflow-hidden rounded-full border outline-none",
          "transition-[width,box-shadow,border-color,background-color,transform] duration-300 ease-out",
          "hover:w-[10.5rem] focus-visible:w-[10.5rem]",
          "active:scale-[0.98]",
          isEnabled
            ? "border-rose-400/30 bg-[linear-gradient(180deg,#1a0a0e_0%,#0d0608_100%)] shadow-[0_0_20px_rgba(225,29,72,0.18),0_8px_22px_rgba(0,0,0,0.45)] hover:shadow-[0_0_28px_rgba(225,29,72,0.28),0_12px_30px_rgba(0,0,0,0.55)] focus-visible:shadow-[0_0_28px_rgba(225,29,72,0.28),0_12px_30px_rgba(0,0,0,0.55)]"
            : "border-white/10 bg-[linear-gradient(180deg,#18181b_0%,#09090b_100%)] shadow-[0_8px_22px_rgba(0,0,0,0.3)] hover:border-white/16 hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)] focus-visible:border-white/16 focus-visible:shadow-[0_12px_28px_rgba(0,0,0,0.4)]",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-[1px] rounded-full border transition-colors duration-300",
            isEnabled ? "border-rose-500/10" : "border-white/6",
          ].join(" ")}
        />

        {isEnabled && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_20%_15%,rgba(225,29,72,0.14),transparent_65%)]"
          />
        )}

        <span
          aria-hidden="true"
          className="relative ml-[10px] flex size-5 shrink-0 items-center justify-center"
        >
          <svg
            viewBox="0 0 20 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={[
              "size-[18px] transition-colors duration-300",
              isEnabled
                ? "text-rose-300 drop-shadow-[0_0_4px_rgba(253,164,175,0.55)]"
                : "text-white/45 group-hover:text-white/70 group-focus-visible:text-white/70",
            ].join(" ")}
            aria-hidden="true"
          >
            <rect x="1" y="1" width="18" height="12" rx="2.2" />
            <path d="M4.2 4.4h0.01M7.2 4.4h0.01M10.2 4.4h0.01M13.2 4.4h0.01M16.2 4.4h0.01M4.2 7.2h0.01M7.2 7.2h0.01M10.2 7.2h0.01M13.2 7.2h0.01M16.2 7.2h0.01M6 10.2h8" />
          </svg>

          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute -bottom-[1px] -right-[1px] size-[7px] rounded-full border transition-opacity duration-300",
              "group-hover:opacity-0",
              isEnabled
                ? "border-rose-200/70 bg-rose-400 shadow-[0_0_6px_rgba(253,164,175,0.85)]"
                : "border-zinc-900 bg-zinc-600",
            ].join(" ")}
          />
        </span>

        <span
          aria-hidden="true"
          className={[
            "relative ml-2.5 flex items-center gap-2.5 whitespace-nowrap",
            "opacity-0 -translate-x-1 transition-[opacity,transform] duration-300 ease-out delay-[80ms]",
            "group-hover:opacity-100 group-hover:translate-x-0",
            "group-focus-visible:opacity-100 group-focus-visible:translate-x-0",
          ].join(" ")}
        >
          <span className="flex items-center gap-1">
            <Keycap isEnabled={isEnabled} widthClass="w-10">
              Ctrl
            </Keycap>
            <span
              aria-hidden="true"
              className={[
                "text-[0.6rem] font-semibold leading-none transition-colors duration-300",
                isEnabled ? "text-rose-200/80" : "text-white/45",
              ].join(" ")}
            >
              +
            </span>
            <Keycap isEnabled={isEnabled} widthClass="w-5">
              R
            </Keycap>
          </span>

          <span
            aria-hidden="true"
            className={[
              "relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-300",
              "shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]",
              isEnabled
                ? "border-rose-400/40 bg-[linear-gradient(180deg,#3a0f19_0%,#1a070c_100%)]"
                : "border-white/10 bg-[linear-gradient(180deg,#0e0e11_0%,#050507_100%)]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "absolute top-1/2 size-[12px] -translate-y-1/2 rounded-full transition-[left,background,box-shadow] duration-300 ease-out",
                isEnabled
                  ? "left-[17px] bg-[linear-gradient(180deg,#fff1f3_0%,#fda4af_100%)] shadow-[0_0_8px_rgba(253,164,175,0.85),inset_0_1px_0_rgba(255,255,255,0.6)]"
                  : "left-[2px] bg-[linear-gradient(180deg,#4a4a52_0%,#26262a_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_1px_rgba(0,0,0,0.5)]",
              ].join(" ")}
            />
          </span>
        </span>
      </button>
    </span>
  );
}
