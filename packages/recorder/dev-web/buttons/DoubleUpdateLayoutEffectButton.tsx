import { useLayoutEffect, useState } from "react";

export function DoubleUpdateLayoutEffectButton() {
  const [renders, setRenders] = useState(0);
  const [followUpPending, setFollowUpPending] = useState(false);

  useLayoutEffect(() => {
    if (!followUpPending) return;
    setFollowUpPending(false);
    setRenders((r) => r + 1);
  }, [followUpPending]);

  return (
    <button
      type="button"
      className="btn btn--coral"
      data-testid="double-update-layout-effect-button"
      onClick={() => {
        setFollowUpPending(true);
        setRenders((r) => r + 1);
      }}
    >
      Trigger 2 renders
      <span className="btn__meta">{renders}</span>
    </button>
  );
}
