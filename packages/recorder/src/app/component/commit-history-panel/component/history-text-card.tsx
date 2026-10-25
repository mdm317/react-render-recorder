/** @jsxImportSource preact */

import { CopyTextButton } from "@/ui/primitives/copy-text-button";

type HistoryTextCardProps = {
  text: string;
  title: string;
  titleTone?: "sky" | "rose";
  section?: "hook" | "commit";
  copyLabel?: string;
  copyTestId?: string;
  maxHeightClass?: string;
  className?: string;
};

const TONE_STYLES = {
  sky: "text-sky-200",
  rose: "text-rose-200",
} as const;

export function HistoryTextCard({
  text,
  title,
  titleTone = "sky",
  section = "commit",
  copyLabel = "Copy",
  copyTestId,
  maxHeightClass = "max-h-56",
  className = "rounded-2xl",
}: HistoryTextCardProps) {
  return (
    <article
      className={["overflow-hidden border border-white/10 bg-black/25", className].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div
          className={[
            "text-[0.7rem] font-semibold uppercase tracking-[0.2em]",
            TONE_STYLES[titleTone],
          ].join(" ")}
        >
          {title}
        </div>
        <CopyTextButton label={copyLabel} section={section} testId={copyTestId} text={text} />
      </div>
      <pre
        className={[
          "recorder-scrollbar-hidden overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78",
          maxHeightClass,
        ].join(" ")}
      >
        {text}
      </pre>
    </article>
  );
}
