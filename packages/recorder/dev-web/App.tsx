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
      <br/>
      <Child />
    </>
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
