/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

import {
  filterFiberChangesByComponent,
  filterHookChangedHistoryByComponent,
  getComponentNamesFromHistory,
  getMatchingComponentNames,
} from "../lib/componentFilter";
import {
  formatCommitHookChangedHistoryForLLM,
  formatHookChangedHistoryForLLM,
  logCommitHookChangedHistoryForLLM,
  logHookChangedHistoryForLLM,
} from "../lib/llmLogging";
import { useRecorderStore } from "./useRecorderStore";

export function RecorderButton() {
  const { state, setRecording } = useRecorderStore();
  const isRecording = state.isRecording;
  const [componentQuery, setComponentQuery] = useState("");
  const [copiedSection, setCopiedSection] = useState<"hook" | "commit" | null>(
    null,
  );
  const previousIsRecordingRef = useRef(isRecording);
  const resetCopiedSectionTimeoutRef = useRef<number | null>(null);

  async function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText != null) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  async function handleCopy(section: "hook" | "commit", text: string) {
    if (text.trim().length === 0) {
      return;
    }

    await copyToClipboard(text);
    setCopiedSection(section);

    if (resetCopiedSectionTimeoutRef.current != null) {
      window.clearTimeout(resetCopiedSectionTimeoutRef.current);
    }

    resetCopiedSectionTimeoutRef.current = window.setTimeout(() => {
      setCopiedSection(null);
      resetCopiedSectionTimeoutRef.current = null;
    }, 1600);
  }

  useEffect(() => {
    const stoppedRecording =
      previousIsRecordingRef.current && !isRecording && state.commits.length > 0;

    if (stoppedRecording) {
      logHookChangedHistoryForLLM(state.hookChangedHistory);
      logCommitHookChangedHistoryForLLM(state.fiberChanges);
      console.info(JSON.stringify(state.hookChangedHistory));
    }

    previousIsRecordingRef.current = isRecording;
  }, [isRecording, state.commits.length, state.fiberChanges, state.hookChangedHistory]);

  useEffect(() => {
    if (isRecording) {
      setComponentQuery("");
      setCopiedSection(null);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (resetCopiedSectionTimeoutRef.current != null) {
        window.clearTimeout(resetCopiedSectionTimeoutRef.current);
      }
    };
  }, []);

  const hasRecordingResult = !isRecording && state.commits.length > 0;
  const availableComponents = getComponentNamesFromHistory(state.hookChangedHistory);
  const matchingComponents = getMatchingComponentNames(
    state.hookChangedHistory,
    componentQuery,
  );
  const hasComponentQuery = componentQuery.trim().length > 0;
  const filteredHookHistory = filterHookChangedHistoryByComponent(
    state.hookChangedHistory,
    componentQuery,
  );
  const filteredFiberChanges = filterFiberChangesByComponent(
    state.fiberChanges,
    componentQuery,
  );
  const filteredHookSummary = hasComponentQuery
    ? formatHookChangedHistoryForLLM(filteredHookHistory)
    : "";
  const filteredCommitSummary = hasComponentQuery
    ? formatCommitHookChangedHistoryForLLM(filteredFiberChanges)
    : "";

  return (
    <div className="flex max-w-[min(34rem,calc(100vw-2rem))] flex-col items-end gap-3">
      <button
        type="button"
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        onClick={() => {
          setRecording(!isRecording);
        }}
        className={[
          "recorder-btn group relative inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] transition-all duration-300 ease-out",
          isRecording
            ? "recorder-btn--active border border-rose-400/30 bg-[linear-gradient(180deg,#1a0a0e_0%,#0d0608_100%)] text-white shadow-[0_0_32px_rgba(225,29,72,0.25),0_12px_36px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(225,29,72,0.35),0_16px_44px_rgba(0,0,0,0.55)]"
            : "border border-white/10 bg-[linear-gradient(180deg,#18181b_0%,#09090b_100%)] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-white/16 hover:text-white/90 hover:shadow-[0_14px_32px_rgba(0,0,0,0.4)]",
          "active:translate-y-0 active:scale-[0.98]",
        ].join(" ")}
      >
        {/* inner border highlight */}
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-[1px] rounded-full border transition-colors duration-300",
            isRecording ? "border-rose-500/10" : "border-white/6",
          ].join(" ")}
        />

        {/* ambient glow overlay */}
        {isRecording && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(225,29,72,0.15),transparent_60%)] animate-[glow-shift_3s_ease-in-out_infinite]"
          />
        )}

        {/* record indicator dot */}
        <span
          className={[
            "relative flex items-center justify-center rounded-full transition-all duration-300",
            isRecording ? "size-8" : "size-7",
          ].join(" ")}
        >
          {/* outer ring */}
          <span
            className={[
              "absolute inset-0 rounded-full border transition-all duration-300",
              isRecording
                ? "border-rose-500/40 bg-rose-950/50"
                : "border-white/10 bg-white/4",
            ].join(" ")}
          />

          {/* pulse ring (recording only) */}
          {isRecording && (
            <span className="absolute inset-[-3px] rounded-full border border-rose-500/20 animate-[pulse-ring_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          )}

          {/* core dot / stop square */}
          <span
            className={[
              "relative transition-all duration-300",
              isRecording
                ? "size-3 rounded-[2px] bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.7),0_0_20px_rgba(225,29,72,0.3)] animate-[rec-pulse_1.5s_ease-in-out_infinite]"
                : "size-2.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.3)]",
            ].join(" ")}
          />
        </span>

        {/* label */}
        <span
          className={[
            "relative pr-0.5 transition-colors duration-300",
            isRecording
              ? "text-rose-300"
              : "text-white/60 group-hover:text-white/80",
          ].join(" ")}
        >
          {isRecording ? "REC" : "REC"}
        </span>

        {/* live badge (recording only) */}
        {isRecording && (
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
          </span>
        )}
      </button>

      {hasRecordingResult && (
        <section className="w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96)_0%,rgba(9,9,11,0.98)_100%)] p-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-rose-300">
                Component Filter
              </p>
              <p className="mt-1 text-sm text-white/70">
                녹화가 끝났습니다. 컴포넌트명을 입력하면 해당 데이터만 표시합니다.
              </p>
            </div>
            <div className="text-right text-[0.7rem] text-white/45">
              <p>{state.commits.length} commit(s)</p>
              <p>{availableComponents.length} component(s)</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/55">
              Component name
            </span>
            <input
              data-testid="component-filter-input"
              type="text"
              value={componentQuery}
              onInput={(event) => {
                setComponentQuery(
                  (event.currentTarget as HTMLInputElement).value,
                );
              }}
              placeholder="App, Child, ElementStatePanel"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/50 focus:bg-black/45 focus:ring-2 focus:ring-rose-500/20"
            />
          </label>

          {availableComponents.length > 0 && (
            <p
              data-testid="component-filter-available"
              className="mt-3 text-xs leading-5 text-white/45"
            >
              Available: {availableComponents.join(", ")}
            </p>
          )}

          {!hasComponentQuery && (
            <p
              data-testid="component-filter-empty"
              className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-3 text-sm text-white/55"
            >
              컴포넌트명을 입력하면 hook 변경 이력과 commit 이력을 해당 컴포넌트 기준으로
              좁혀서 보여줍니다.
            </p>
          )}

          {hasComponentQuery && matchingComponents.length === 0 && (
            <p
              data-testid="component-filter-no-match"
              className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              입력한 이름과 일치하는 컴포넌트가 없습니다.
            </p>
          )}

          {hasComponentQuery && matchingComponents.length > 0 && (
            <div
              data-testid="component-filter-result"
              className="mt-4 space-y-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                Showing: {matchingComponents.join(", ")}
              </p>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-rose-200">
                    Hook history
                  </div>
                  <button
                    type="button"
                    data-testid="copy-hook-history-button"
                    onClick={() => {
                      void handleCopy("hook", filteredHookSummary);
                    }}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-rose-300/40 hover:text-white"
                  >
                    {copiedSection === "hook" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
                  {filteredHookSummary}
                </pre>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-200">
                    Commit history
                  </div>
                  <button
                    type="button"
                    data-testid="copy-commit-history-button"
                    onClick={() => {
                      void handleCopy("commit", filteredCommitSummary);
                    }}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:border-sky-300/40 hover:text-white"
                  >
                    {copiedSection === "commit" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto px-4 py-3 text-xs leading-5 whitespace-pre-wrap text-white/78">
                  {filteredCommitSummary}
                </pre>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
