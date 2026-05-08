/** @jsxImportSource preact */
import type { Dispatch, StateUpdater } from "preact/hooks";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export type RecorderOptionsState = {
  isRenderDurationVisible: boolean;
  isRerenderCountVisible: boolean;
};

type RecorderOptionKey = keyof RecorderOptionsState;

export const INITIAL_RECORDER_OPTIONS: RecorderOptionsState = {
  isRenderDurationVisible: false,
  isRerenderCountVisible: false,
};

export function buildInitialRecorderOptions(
  queryParameters: URLSearchParams | null,
): RecorderOptionsState {
  if (queryParameters == null) return INITIAL_RECORDER_OPTIONS;
  return {
    isRenderDurationVisible: queryParameters.get("renderTime") === "true",
    isRerenderCountVisible: queryParameters.get("rerenders") === "true",
  };
}

type OptionDef = {
  key: RecorderOptionKey;
  label: string;
};

const OPTION_DEFS: readonly OptionDef[] = [
  { key: "isRerenderCountVisible", label: "Show rerenders" },
  { key: "isRenderDurationVisible", label: "Show render time" },
];

type ViewOptionsPopoverProps = {
  options: RecorderOptionsState;
  setOptions: Dispatch<StateUpdater<RecorderOptionsState>>;
};

export function ViewOptionsPopover({ options, setOptions }: ViewOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOption = useCallback(
    (key: RecorderOptionKey) => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setOptions],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current;
      if (container == null) return;
      // event.target is retargeted to the shadow host when bubbling out of shadow DOM,
      // so use composedPath to see the actual click path.
      if (event.composedPath().includes(container)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="View options"
        data-testid="view-options-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          "inline-flex size-8 items-center justify-center rounded-full border transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          isOpen
            ? "border-white/25 bg-white/10 text-white"
            : "border-white/12 bg-black/45 text-white/55 hover:border-white/20 hover:text-white/85",
        ].join(" ")}
      >
        <GearGlyph />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="View options"
          data-testid="view-options-popover"
          className={[
            "absolute right-0 top-full z-30 mt-2 min-w-[12rem]",
            "rounded-xl border border-white/12 bg-[linear-gradient(180deg,rgba(24,24,27,0.98)_0%,rgba(9,9,11,1)_100%)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)]",
          ].join(" ")}
        >
          <ul className="flex flex-col">
            {OPTION_DEFS.map(({ key, label }) => (
              <li key={key}>
                <OptionRow
                  isOn={options[key]}
                  label={label}
                  onToggle={() => toggleOption(key)}
                  testId={`view-option-${key}`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type OptionRowProps = {
  isOn: boolean;
  label: string;
  onToggle: () => void;
  testId: string;
};

function OptionRow({ isOn, label, onToggle, testId }: OptionRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      data-testid={testId}
      onClick={onToggle}
      className={[
        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left",
        "text-[0.78rem] text-white/85 transition hover:bg-white/5",
        "focus-visible:outline-none focus-visible:bg-white/5",
      ].join(" ")}
    >
      <span>{label}</span>
      <SwitchVisual isOn={isOn} />
    </button>
  );
}

function SwitchVisual({ isOn }: { isOn: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full border transition-colors",
        isOn
          ? "border-sky-400/40 bg-[linear-gradient(180deg,#0f2238_0%,#06121f_100%)]"
          : "border-white/10 bg-[linear-gradient(180deg,#0e0e11_0%,#050507_100%)]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1/2 size-[12px] -translate-y-1/2 rounded-full transition-[left,background] duration-200 ease-out",
          isOn
            ? "left-[15px] bg-[linear-gradient(180deg,#f0f9ff_0%,#7dd3fc_100%)] shadow-[0_0_6px_rgba(125,211,252,0.7)]"
            : "left-[2px] bg-[linear-gradient(180deg,#4a4a52_0%,#26262a_100%)]",
        ].join(" ")}
      />
    </span>
  );
}

function GearGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
