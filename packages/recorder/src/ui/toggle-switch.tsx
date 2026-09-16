/** @jsxImportSource preact */

type ToggleSwitchProps = {
  checked: boolean;
  size?: "compact" | "wide";
  tone?: "accent" | "recording";
};

const SIZE_STYLES = {
  compact: {
    track: "h-[18px] w-[30px]",
    thumb: "size-[12px]",
    off: "left-[2px]",
    on: "left-[15px]",
  },
  wide: {
    track: "h-[18px] w-8",
    thumb: "size-[12px]",
    off: "left-[2px]",
    on: "left-[17px]",
  },
} as const;

const TONE_STYLES = {
  accent: {
    trackOn: "border-sky-400/40 bg-[linear-gradient(180deg,#0f2238_0%,#06121f_100%)]",
    thumbOn:
      "bg-[linear-gradient(180deg,#f0f9ff_0%,#7dd3fc_100%)] shadow-[0_0_6px_rgba(125,211,252,0.7)]",
  },
  recording: {
    trackOn: "border-rose-400/40 bg-[linear-gradient(180deg,#3a0f19_0%,#1a070c_100%)]",
    thumbOn:
      "bg-[linear-gradient(180deg,#fff1f3_0%,#fda4af_100%)] shadow-[0_0_8px_rgba(253,164,175,0.85),inset_0_1px_0_rgba(255,255,255,0.6)]",
  },
} as const;

export function ToggleSwitch({ checked, size = "compact", tone = "accent" }: ToggleSwitchProps) {
  const dimensions = SIZE_STYLES[size];
  const colors = TONE_STYLES[tone];

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors",
        dimensions.track,
        checked
          ? colors.trackOn
          : "border-white/10 bg-[linear-gradient(180deg,#0e0e11_0%,#050507_100%)]",
        size === "wide" ? "shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]" : "",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1/2 -translate-y-1/2 rounded-full transition-[left,background,box-shadow] duration-300 ease-out",
          dimensions.thumb,
          checked
            ? `${dimensions.on} ${colors.thumbOn}`
            : `${dimensions.off} bg-[linear-gradient(180deg,#4a4a52_0%,#26262a_100%)] ${size === "wide" ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_1px_rgba(0,0,0,0.5)]" : ""}`,
        ].join(" ")}
      />
    </span>
  );
}
