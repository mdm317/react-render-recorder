import { useEffect, useState } from "react";

export function DoubleUpdateEffectButton() {
  const [renders, setRenders] = useState(0);
  const [followUpPending, setFollowUpPending] = useState(false);

  useEffect(() => {
    if (!followUpPending) return;
    setFollowUpPending(false);
    setRenders((r) => r + 1);
  }, [followUpPending]);

  return (
    <button
      type="button"
      className="btn btn--outline"
      data-testid="double-update-effect-button"
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
