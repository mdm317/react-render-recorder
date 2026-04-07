/** @jsxImportSource preact */
import { logHookChangedHistoryForLLM } from "../logging/hookChangedHistoryLogger";
import { useRecorderStore } from "./useRecorderStore";

export function RecorderButton() {
  const { state, setRecording } = useRecorderStore();
  const isRecording = state.isRecording;

  if(!isRecording){
    console.log(state)
    logHookChangedHistoryForLLM(state.hookChangedHistory);
  }

  return (
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
  );
}
