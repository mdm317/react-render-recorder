import { useState } from "react";

function StaticLeafA() {
  return <span className="twin">leaf · A</span>;
}

function StaticLeafB() {
  return <span className="twin">leaf · B</span>;
}

function StaticLeafC() {
  return <span className="twin">leaf · C</span>;
}

export function RenderByParentButton() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="btn"
      data-testid="render-by-parent-button"
      onClick={() => setCount((c) => c + 1)}
    >
      <StaticLeafA />
      <StaticLeafB />
      <StaticLeafC />
      <span className="btn__meta">{count}</span>
    </button>
  );
}
