import { useState } from "react";

export function ObjectPartialUpdateButton() {
  const [state, setState] = useState({ x: 0, y: 0 });
  return (
    <button
      type="button"
      className="btn"
      data-testid="object-partial-update-button"
      onClick={() => setState((prev) => ({ ...prev, x: prev.x + 1 }))}
    >
      Bump x only
      <span className="btn__meta">
        ({state.x}, {state.y})
      </span>
    </button>
  );
}
