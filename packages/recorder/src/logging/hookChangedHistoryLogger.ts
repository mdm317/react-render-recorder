import type { HookChangedHistory } from "../store/recorderStore";

export type HookChangedHistoryLogger = (message: string) => void;

type ElementLike = {
  className?: unknown;
  getAttribute?: (name: string) => string | null;
  id?: unknown;
  nodeType?: unknown;
  tagName?: unknown;
};

function isElementLike(value: unknown): value is ElementLike {
  if (typeof Element !== "undefined" && value instanceof Element) {
    return true;
  }

  if (typeof value !== "object" || value == null) {
    return false;
  }

  return (
    (value as ElementLike).nodeType === 1 &&
    typeof (value as ElementLike).tagName === "string"
  );
}

function readElementStringField(
  element: ElementLike,
  fieldName: "class" | "id",
): string {
  const directValue = fieldName === "class" ? element.className : element.id;
  if (typeof directValue === "string") {
    return directValue.trim();
  }

  if (typeof element.getAttribute === "function") {
    return element.getAttribute(fieldName)?.trim() ?? "";
  }

  return "";
}

function summarizeElementClassName(className: string): string {
  const classes = className
    .split(/\s+/)
    .map((classToken) => classToken.trim())
    .filter(Boolean)
    .slice(0, 3);

  return classes.length > 0 ? `.${classes.join(".")}` : "";
}

function formatElementSummary(element: ElementLike): string {
  const tagName = String(element.tagName).toLowerCase();
  const id = readElementStringField(element, "id");
  const className = readElementStringField(element, "class");

  return `[HTMLElement ${tagName}${id ? `#${id}` : ""}${summarizeElementClassName(className)}]`;
}

function createSafeJsonReplacer() {
  const seen = new WeakSet<object>();

  return (_key: string, value: unknown) => {
    if (typeof value === "bigint") {
      return `${value}n`;
    }

    if (typeof value === "function") {
      return `[Function ${value.name || "anonymous"}]`;
    }

    if (typeof value === "symbol") {
      return value.toString();
    }

    if (isElementLike(value)) {
      return formatElementSummary(value);
    }

    if (typeof value === "object" && value != null) {
      if (seen.has(value)) {
        return "[Circular]";
      }

      seen.add(value);
    }

    return value;
  };
}

function formatValueForLLM(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return JSON.stringify(value);
  }

  if (isElementLike(value)) {
    return formatElementSummary(value);
  }

  const serialized = JSON.stringify(value, createSafeJsonReplacer());
  return serialized ?? String(value);
}

export function formatHookChangedHistoryForLLM(
  hookChangedHistory: HookChangedHistory,
): string {
  const componentNames = Object.keys(hookChangedHistory).sort((left, right) =>
    left.localeCompare(right),
  );

  const totalHookCount = componentNames.reduce((count, componentName) => {
    return count + Object.keys(hookChangedHistory[componentName] ?? {}).length;
  }, 0);

  const totalChangeCount = componentNames.reduce((count, componentName) => {
    return (
      count +
      Object.values(hookChangedHistory[componentName] ?? {}).reduce(
        (sum, entries) => sum + entries.length,
        0,
      )
    );
  }, 0);

  const lines = [
    "Hook change history summary",
    `- Components with hook changes: ${componentNames.length}`,
    `- Distinct changed hooks: ${totalHookCount}`,
    `- Total hook change events: ${totalChangeCount}`,
    "- Commit indices are zero-based.",
  ];

  if (componentNames.length === 0) {
    lines.push("- No hook changes were recorded.");
    return lines.join("\n");
  }

  componentNames.forEach((componentName) => {
    const indexedHooks = hookChangedHistory[componentName] ?? {};
    const hookIndices = Object.keys(indexedHooks)
      .map(Number)
      .sort((left, right) => left - right);

    lines.push("", `Component ${componentName}`);

    hookIndices.forEach((hookIndex) => {
      const entries = indexedHooks[hookIndex] ?? [];
      const commitIndices = entries.map(({ commitIndex }) => commitIndex);

      lines.push(
        `- Hook ${hookIndex} changed ${entries.length} time(s) across commit(s): ${commitIndices.join(", ")}`,
      );

      entries.forEach(({ commitIndex, prev, next }) => {
        lines.push(
          `  - Commit ${commitIndex}: ${formatValueForLLM(prev)} -> ${formatValueForLLM(next)}`,
        );
      });
    });
  });

  return lines.join("\n");
}

export function logHookChangedHistoryForLLM(
  hookChangedHistory: HookChangedHistory,
  logger: HookChangedHistoryLogger = (message) => {
    console.info(message);
  },
): string {
  const formattedMessage = formatHookChangedHistoryForLLM(hookChangedHistory);
  logger(formattedMessage);
  return formattedMessage;
}
