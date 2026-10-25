/** @jsxImportSource preact */
import { KeyboardShortcutToggle } from "./keyboard-shortcut-toggle";

export function RecordingToolbar() {
  return (
    <div className="flex items-center gap-2">
      <KeyboardShortcutToggle />
    </div>
  );
}
