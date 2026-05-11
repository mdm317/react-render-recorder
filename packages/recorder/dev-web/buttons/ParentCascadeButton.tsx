import { memo, useState } from "react";

function PlainChild({ label }: { label: string }) {
  return <span className="twin">{label}</span>;
}

const StableMemoChild = memo(function StableMemoChild() {
  return <span className="twin">memo · stable</span>;
});

const ChangingMemoChild = memo(function ChangingMemoChild({ value }: { value: number }) {
  return <span className="twin">memo · {value}</span>;
});

export function ParentCascadeButton() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="btn"
      data-testid="parent-cascade-button"
      onClick={() => setCount((c) => c + 1)}
    >
      <PlainChild label="plain" />
      <StableMemoChild />
      <ChangingMemoChild value={count} />
      <span className="btn__meta">{count}</span>
    </button>
  );
}
