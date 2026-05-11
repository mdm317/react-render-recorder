import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type ChildHandle = { bumpLocal: () => void };

const UnmountReproContext = createContext<{ label: string }>({ label: "default" });

const UnmountReproChild = forwardRef<ChildHandle, { parentTick: number }>(
  function UnmountReproChild(props, forwardedRef) {
    const { label } = useContext(UnmountReproContext);
    const [local, setLocal] = useState(0);
    useImperativeHandle(
      forwardedRef,
      () => ({
        bumpLocal: () => setLocal((n) => n + 1),
      }),
      [],
    );
    useEffect(() => {}, []);
    return (
      <span className="twin">
        ctx={label} · parent-tick={props.parentTick} · local={local}
      </span>
    );
  },
);

export function UnmountBeforeFlushPanel() {
  const childRef = useRef<ChildHandle | null>(null);
  const [parentTick, setParentTick] = useState(0);
  const [mounted, setMounted] = useState(true);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn"
        data-testid="unmount-child-update"
        onClick={() => childRef.current?.bumpLocal()}
      >
        1. Update child
      </button>
      <button
        type="button"
        className="btn btn--outline"
        data-testid="unmount-child-unmount"
        onClick={() => setMounted((m) => !m)}
      >
        2. {mounted ? "Unmount child" : "Remount child"}
      </button>
      <button
        type="button"
        className="btn"
        data-testid="unmount-parent-update"
        onClick={() => setParentTick((t) => t + 1)}
      >
        3. Update parent
        <span className="btn__meta">{parentTick}</span>
      </button>
      {mounted && (
        <UnmountReproContext.Provider value={{ label: `tick-${parentTick}` }}>
          <UnmountReproChild ref={childRef} parentTick={parentTick} />
        </UnmountReproContext.Provider>
      )}
    </div>
  );
}
