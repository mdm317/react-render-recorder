/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

import { copyToClipboard } from "../../../utils/copy-to-clipboard";

type CopyHistoryButtonProps = {
  section: "hook" | "commit";
  text: string;
};

const BUTTON_STYLES = {
  commit:
    "rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-sky-300/40 hover:text-white",
  hook: "rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-rose-300/40 hover:text-white",
} as const;

export function CopyHistoryButton({ section, text }: CopyHistoryButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resetCopiedTimeoutRef = useRef<number | null>(null);

  async function handleCopy() {
    if (text.trim().length === 0) {
      return;
    }

    await copyToClipboard(text);
    setIsCopied(true);

    if (resetCopiedTimeoutRef.current != null) {
      window.clearTimeout(resetCopiedTimeoutRef.current);
    }

    resetCopiedTimeoutRef.current = window.setTimeout(() => {
      setIsCopied(false);
      resetCopiedTimeoutRef.current = null;
    }, 1600);
  }

  useEffect(() => {
    return () => {
      if (resetCopiedTimeoutRef.current != null) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      data-testid={`copy-${section}-history-button`}
      onClick={() => {
        void handleCopy();
      }}
      className={BUTTON_STYLES[section]}
    >
      {isCopied ? "Copied" : "Copy"}
    </button>
  );
}
