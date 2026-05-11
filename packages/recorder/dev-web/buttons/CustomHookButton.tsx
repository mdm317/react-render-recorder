import { useState } from "react";

function useHookCounter() {
  return useState(0);
}

export function CustomHookButton() {
  const [count, setCount] = useHookCounter();
  return (
    <button
      type="button"
      className="btn"
      data-testid="custom-hook-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger via hook
      <span className="btn__meta">{count}</span>
    </button>
  );
}
