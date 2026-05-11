import { useState } from "react";

export function ObjectSameValueButton() {
  const [state, setState] = useState({ x: 0, y: 0 });
  return (
    <button
      type="button"
      className="btn"
      data-testid="object-same-value-button"
      onClick={() => setState((prev) => ({ ...prev }))}
    >
      Set same value
      <span className="btn__meta">
        ({state.x}, {state.y})
      </span>
    </button>
  );
}
