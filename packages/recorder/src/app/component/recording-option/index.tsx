/** @jsxImportSource preact */
import { useQueryParameter } from "../../../hooks/use-query-parameter";
import { KeyboardShortcutToggle } from "./component/keyboard-shortcut-toggle";

export function RecordingOption() {
  const queryParameters = useQueryParameter();
  const isShortcutEnabled = queryParameters?.get("shortcut") === "true";

  return (
    <div className="flex items-center gap-2">
      <KeyboardShortcutToggle defaultEnabled={isShortcutEnabled} />
    </div>
  );
}
