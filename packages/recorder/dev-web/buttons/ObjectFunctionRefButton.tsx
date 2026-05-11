import { useState } from "react";

export function ObjectFunctionRefButton() {
  const [state, setState] = useState({ handler: function handlerA() {} });
  return (
    <button
      type="button"
      className="btn"
      data-testid="object-function-ref-button"
      onClick={() =>
        setState((prev) =>
          prev.handler.name === "handlerA"
            ? { handler: function handlerB() {} }
            : { handler: function handlerA() {} },
        )
      }
    >
      Swap function ref
      <span className="btn__meta">{state.handler.name}</span>
    </button>
  );
}
