import { useState } from "react";

export function ElementStatePanel() {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  const label = selectedElement
    ? `${selectedElement.tagName.toLowerCase()}#${selectedElement.id || "no-id"}`
    : "null";

  return (
    <button
      type="button"
      id="hook-target-alpha"
      className="hook-target alpha primary btn"
      data-testid="element-alpha-button"
      onClick={(event) => {
        const target = event.currentTarget;
        setSelectedElement((prev) => (prev ? null : target));
      }}
    >
      {selectedElement ? "Clear selection" : "Store as selected"}
      <span className="btn__meta" data-testid="element-state-label">
        {label}
      </span>
    </button>
  );
}
