import { useLayoutEffect, useState } from "react";

export function ChainedTaskRenderButton() {
  const [first, setFirst] = useState(0);
  const [second, setSecond] = useState(0);

  useLayoutEffect(() => {
    if (first === 1) {
      setFirst((count) => count + 1);
    }
  }, [first]);

  const handleClick = () => {
    setFirst((count) => count + 1);
    requestAnimationFrame(() => {
      setSecond((count) => count + 1);
    });
  };

  return (
    <button
      type="button"
      className="btn"
      data-testid="chained-task-render-button"
      onClick={handleClick}
    >
      Chained task render
      <span className="btn__meta">
        {first}·{second}
      </span>
    </button>
  );
}
