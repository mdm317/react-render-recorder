/** @jsxImportSource preact */
import { useEffect, useState } from "preact/hooks";

import { PopoverButton } from "@/app/component/common/components/popover-button";
import { ToggleSwitch } from "@/ui/toggle-switch";
import { KeyboardShortcutIcon } from "@/app/component/common/icons/keyboard-shortcut-icon";
import { useRecordingControl } from "@/hooks/use-recording-control";
import { readRecordingOption } from "@/lib/query-parameters";

export function KeyboardShortcutToggle() {
  const [isEnabled, setIsEnabled] = useState(() => readRecordingOption().shortcut);
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
    <PopoverButton
      trigger={<KeyboardShortcutIcon active={isEnabled} />}
      testId="shortcut-options-button"
      popupContent={
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          data-enabled={isEnabled ? "true" : "false"}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
        >
          <span>Ctrl + R shortcut</span>
          <ToggleSwitch checked={isEnabled} />
        </button>
      }
    />
  );
}
