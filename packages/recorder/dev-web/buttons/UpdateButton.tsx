import { useState } from "react";

export function UpdateButton() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="btn"
      data-testid="update-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger re-render
      <span className="btn__meta">{count}</span>
    </button>
  );
}
