import { useEffect, useState } from "react";

function Twin({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(value);
  }, [value]);
  return count;
}

export function SameNameTwins() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="btn"
      data-testid="same-name-twins-button"
      onClick={() => setCount((c) => c + 1)}
    >
      <Twin value={count} />
      <Twin value={count} />
      <span className="btn__meta">{count}</span>
    </button>
  );
}
