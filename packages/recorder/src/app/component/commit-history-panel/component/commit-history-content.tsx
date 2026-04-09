/** @jsxImportSource preact */
import { CopyHistoryButton } from "../../common/copy-history-button";

type CommitHistoryContentProps = {
  commitHistoryText: string;
  hookHistoryText: string;
  showNoMatchMessage: boolean;
};

export function CommitHistoryContent({
  commitHistoryText,
  hookHistoryText,
  showNoMatchMessage,
}: CommitHistoryContentProps) {
  return (
    <>
      {showNoMatchMessage ? (
        <p
          data-testid="component-filter-no-match"
          className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          입력한 이름과 일치하는 컴포넌트가 없습니다.
        </p>
      ) : (
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
      )}
    </>
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
      <pre className="max-h-56 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
        {text}
      </pre>
    </div>
  );
}
