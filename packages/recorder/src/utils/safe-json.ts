type ElementLike = {
  className?: unknown;
  getAttribute?: (name: string) => string | null;
  id?: unknown;
  nodeType?: unknown;
  tagName?: unknown;
};

export function isElementLike(value: unknown): value is ElementLike {
  if (typeof Element !== "undefined" && value instanceof Element) {
    return true;
  }

  if (typeof value !== "object" || value == null) {
    return false;
  }

  return (
    (value as ElementLike).nodeType === 1 && typeof (value as ElementLike).tagName === "string"
  );
}

function readElementStringField(element: ElementLike, fieldName: "class" | "id"): string {
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

export function formatElementSummary(element: ElementLike): string {
  const tagName = String(element.tagName).toLowerCase();
  const id = readElementStringField(element, "id");
  const className = readElementStringField(element, "class");

  return `[HTMLElement ${tagName}${id ? `#${id}` : ""}${summarizeElementClassName(className)}]`;
}

export function createSafeJsonReplacer() {
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

    if (value === undefined) {
      return "[undefined]";
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

export function sanitizeForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, createSafeJsonReplacer())) as T;
}
