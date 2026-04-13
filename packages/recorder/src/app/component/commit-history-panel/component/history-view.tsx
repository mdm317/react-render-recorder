/** @jsxImportSource preact */
import { CopyHistoryButton } from "../../common/copy-history-button";

type CommitHistoryContentProps = {
  commitHistoryText: string;
  hookHistoryText: string;
};

export function CommitHistoryContent({
  commitHistoryText,
  hookHistoryText,
}: CommitHistoryContentProps) {
  return (
    <div data-testid="component-filter-result" className="mt-4 space-y-4">
      <HistoryText
        accentClassName="text-rose-200"
        section="hook"
        text={hookHistoryText}
        title="Hook history"
      />
      <HistoryText
        accentClassName="text-sky-200"
        section="commit"
        text={commitHistoryText}
        title="Commit history"
      />
    </div>
  );
}

type HistoryTextProps = {
  accentClassName: string;
  section: "hook" | "commit";
  text: string;
  title: string;
};

function HistoryText({ accentClassName, section, text, title }: HistoryTextProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div
          className={[
            "text-[0.7rem] font-semibold uppercase tracking-[0.2em]",
            accentClassName,
          ].join(" ")}
        >
          {title}
        </div>
        <CopyHistoryButton section={section} text={text} />
      </div>
      <pre className="recorder-scrollbar-hidden max-h-56 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
        {text}
      </pre>
    </div>
  );
}
