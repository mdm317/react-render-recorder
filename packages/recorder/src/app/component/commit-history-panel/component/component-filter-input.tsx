/** @jsxImportSource preact */

type CommitHistoryFilterInputProps = {
  helperText: string | null;
  setValue: (value: string) => void;
  value: string;
};

export function CommitHistoryFilterInput({
  helperText,
  setValue,
  value,
}: CommitHistoryFilterInputProps) {
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
