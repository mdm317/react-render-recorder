import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button
        type="button"
        data-testid="count-button"
        onClick={() => setCount((c) => c + 1)}
      >
        Count: {count}
      </button>
      <br />
      <ElementStatePanel />
      <br />
      <Child />
    </>
  );
}

function ElementStatePanel() {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null,
  );

  const selectedElementLabel = selectedElement
    ? `${selectedElement.tagName.toLowerCase()}#${selectedElement.id || "no-id"}`
    : "none";

  return (
    <div>
      <p data-testid="element-state-label">
        Selected element: {selectedElementLabel}
      </p>
      <button
        type="button"
        id="hook-target-alpha"
        className="hook-target alpha primary"
        data-testid="element-alpha-button"
        onClick={(event) => setSelectedElement(event.currentTarget)}
      >
        Track alpha element
      </button>
      <button
        type="button"
        id="hook-target-beta"
        className="hook-target beta secondary"
        data-testid="element-beta-button"
        onClick={(event) => setSelectedElement(event.currentTarget)}
      >
        Track beta element
      </button>
    </div>
  );
}

function Child() {
  const [count, setCount] = useState(0);

  return (
    <button
      type="button"
      data-testid="count-button"
      onClick={() => setCount((c) => c + 1)}
    >
      child Count: {count}
    </button>
  );
}
