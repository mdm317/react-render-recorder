import { useLayoutEffect, useState } from "react";

function useCounterState(initialCount: number) {
  const [count, setCount] = useState(initialCount);

  return {
    count,
    increment() {
      setCount((currentCount) => currentCount + 1);
    },
  };
}

export function App() {
  const [view] = useState("overview");
  const { count, increment } = useCounterState(0);
  const [c, setc] = useState(0);

  useLayoutEffect(() => {
    if (c === 1) {
      setc((v) => v + 1);
    }
  }, [c]);

  const handleCount = () => {
    increment();
    setc(1);
  };

  return (
    <>
      <h1>{c}</h1>
      <p data-testid="view-label">View: {view}</p>
      <button type="button" data-testid="count-button" onClick={handleCount}>
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
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  const selectedElementLabel = selectedElement
    ? `${selectedElement.tagName.toLowerCase()}#${selectedElement.id || "no-id"}`
    : "none";

  return (
    <div>
      <p data-testid="element-state-label">Selected element: {selectedElementLabel}</p>
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
    <button type="button" data-testid="count-button" onClick={() => setCount((c) => c + 1)}>
      child Count: {count}
    </button>
  );
}
