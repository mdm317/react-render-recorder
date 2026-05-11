import { useDebugValue, useState } from "react";

function useDebugCounter() {
  const [count, setCount] = useState(0);
  useDebugValue(`count = ${count}`);
  return [count, setCount] as const;
}

export function DebugValueButton() {
  const [count, setCount] = useDebugCounter();
  return (
    <button
      type="button"
      className="btn"
      data-testid="debug-value-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger with useDebugValue
      <span className="btn__meta">{count}</span>
    </button>
  );
}
