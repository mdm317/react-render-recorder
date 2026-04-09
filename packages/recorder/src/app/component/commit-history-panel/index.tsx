/** @jsxImportSource preact */
import { useCommitHistoryFilter } from "../../../hooks/use-commit-history-filter";
import { CommitHistoryContent } from "./component/commit-history-content";

export function CommitHistoryPanel() {
  const {
    availableComponentNames,
    commitCount,
    commitHistoryText,
    componentNameFilter,
    hookHistoryText,
    setComponentNameFilter,
    showNoMatchMessage,
  } = useCommitHistoryFilter();

  if (commitCount === 0) {
    return null;
  }

  return (
    <section className="w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(9,9,11,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <CommitHistoryHeader
        commitCount={commitCount}
        componentCount={availableComponentNames.length}
      />

      <CommitHistoryFilterInput
        helperText={
          availableComponentNames.length > 0
            ? `Available: ${availableComponentNames.join(", ")}`
            : null
        }
        setValue={setComponentNameFilter}
        value={componentNameFilter}
      />

      <CommitHistoryContent
        commitHistoryText={commitHistoryText}
        hookHistoryText={hookHistoryText}
        showNoMatchMessage={showNoMatchMessage}
      />
    </section>
  );
}

type CommitHistoryHeaderProps = {
  commitCount: number;
  componentCount: number;
};

function CommitHistoryHeader({ commitCount, componentCount }: CommitHistoryHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-rose-300">
          Component Filter
        </p>
        <p className="mt-1 text-sm text-white/70">
          녹화가 끝났습니다. 비워두면 전체를, 입력하면 해당 데이터만 표시합니다.
        </p>
      </div>
      <div className="text-right text-[0.7rem] text-white/45">
        <p>{commitCount} commit(s)</p>
        <p>{componentCount} component(s)</p>
      </div>
    </div>
  );
}

type CommitHistoryFilterInputProps = {
  helperText: string | null;
  setValue: (value: string) => void;
  value: string;
};

function CommitHistoryFilterInput({ helperText, setValue, value }: CommitHistoryFilterInputProps) {
  return (
    <>
      <label className="block">
        <span className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/55">
          Component name
        </span>
        <input
          data-testid="component-filter-input"
          type="text"
          value={value}
          onInput={(event) => {
            setValue((event.currentTarget as HTMLInputElement).value);
          }}
          placeholder="App, Child, ElementStatePanel"
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/50 focus:bg-black/45 focus:ring-2 focus:ring-rose-500/20"
        />
      </label>

      {helperText != null ? (
        <p
          data-testid="component-filter-available"
          className="mt-3 text-xs leading-5 text-white/45"
        >
          {helperText}
        </p>
      ) : null}
    </>
  );
}
