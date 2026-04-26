export type FormattedDuration = {
  text: string;
  unit: "s" | "ms" | "μs" | "";
};

export function formatDurationMs(value: number | null): FormattedDuration {
  if (value == null) {
    return { text: "—", unit: "" };
  }

  if (value === 0) {
    return { text: "0", unit: "ms" };
  }

  const abs = Math.abs(value);

  if (abs >= 1000) {
    return { text: (value / 1000).toFixed(2), unit: "s" };
  }
  if (abs >= 10) {
    return { text: value.toFixed(1), unit: "ms" };
  }
  if (abs >= 0.1) {
    return { text: value.toFixed(2), unit: "ms" };
  }
  return { text: Math.round(value * 1000).toString(), unit: "μs" };
}

export function formatDurationMsInline(value: number | null): string {
  const { text, unit } = formatDurationMs(value);
  if (unit === "") {
    return text;
  }
  return `${text}${unit}`;
}
