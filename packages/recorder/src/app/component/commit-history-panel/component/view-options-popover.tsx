/** @jsxImportSource preact */
import type { Dispatch, StateUpdater } from "preact/hooks";
import { useCallback } from "preact/hooks";

import type { CommitHistoryFormatOptions } from "@/features/options/recording-option";
import { PopoverButton } from "@/app/component/common/components/popover-button";
import { ToggleSwitch } from "@/ui/toggle-switch";
import { SettingsIcon } from "@/app/component/common/icons/settings-icon";

type RecorderOptionKey = keyof CommitHistoryFormatOptions;

type OptionDef = {
  key: RecorderOptionKey;
  label: string;
};

const OPTION_DEFS: readonly OptionDef[] = [
  { key: "includeRenderDuration", label: "Show render time" },
  { key: "includeHookPath", label: "Show hook path" },
  { key: "includeSource", label: "Show source" },
];

type ViewOptionsPopoverProps = {
  options: CommitHistoryFormatOptions;
  setOptions: Dispatch<StateUpdater<CommitHistoryFormatOptions>>;
};

export function ViewOptionsPopover({ options, setOptions }: ViewOptionsPopoverProps) {
  const toggleOption = useCallback(
    (key: RecorderOptionKey) => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setOptions],
  );

  return (
    <PopoverButton
      trigger={<SettingsIcon />}
      testId="view-options-button"
      popupTestId="view-options-popover"
      placement="bottom"
      popupContent={
        <ul className="flex flex-col">
          {OPTION_DEFS.map(({ key, label }) => (
            <li key={key}>
              <button
                type="button"
                role="switch"
                aria-checked={options[key] ?? false}
                data-checked={options[key] ? "true" : "false"}
                data-testid={`view-option-${key}`}
                onClick={() => toggleOption(key)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[0.78rem] text-white/85 transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
              >
                <span>{label}</span>
                <ToggleSwitch checked={options[key] ?? false} />
              </button>
            </li>
          ))}
        </ul>
      }
    />
  );
}
