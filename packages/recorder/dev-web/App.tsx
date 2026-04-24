import { useDebugValue, useEffect, useLayoutEffect, useState } from "react";

import "./App.css";

export function App() {
  return (
    <main className="page">
      <h1 className="page__title">Render <em>tracking</em> dev</h1>
      <p className="page__sub">Isolated cases for exercising the recorder.</p>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Single render</div>
          <div className="row__label-sub">One setState, one render.</div>
        </div>
        <UpdateButton />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Double render · useLayoutEffect</div>
          <div className="row__label-sub">Click + follow-up layout effect.</div>
        </div>
        <DoubleUpdateLayoutEffectButton />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Double render · useEffect</div>
          <div className="row__label-sub">Click + follow-up passive effect.</div>
        </div>
        <DoubleUpdateEffectButton />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Custom hook · state update</div>
          <div className="row__label-sub">setState lives inside a reusable hook.</div>
        </div>
        <CustomHookButton />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Custom hook · useDebugValue</div>
          <div className="row__label-sub">Hook surfaces a label to React DevTools.</div>
        </div>
        <DebugValueButton />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">DOM reference in state</div>
          <div className="row__label-sub">Save this button's DOM node to state.</div>
        </div>
        <ElementStatePanel />
      </div>
    </main>
  );
}

function UpdateButton() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="btn"
      data-testid="update-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger re-render
      <span className="btn__meta">{count}</span>
    </button>
  );
}

function DoubleUpdateLayoutEffectButton() {
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

function DoubleUpdateEffectButton() {
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

function useHookCounter() {
  return useState(0);
}

function CustomHookButton() {
  const [count, setCount] = useHookCounter();
  return (
    <button
      type="button"
      className="btn"
      data-testid="custom-hook-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger via hook
      <span className="btn__meta">{count}</span>
    </button>
  );
}

function useDebugCounter() {
  const [count, setCount] = useState(0);
  useDebugValue(`count = ${count}`);
  return [count, setCount] as const;
}

function DebugValueButton() {
  const [count, setCount] = useDebugCounter();
  return (
    <button
      type="button"
      className="btn"
      data-testid="debug-value-button"
      onClick={() => setCount((c) => c + 1)}
    >
      Trigger with useDebugValue
      <span className="btn__meta">{count}</span>
    </button>
  );
}

function ElementStatePanel() {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  const label = selectedElement
    ? `${selectedElement.tagName.toLowerCase()}#${selectedElement.id || "no-id"}`
    : "null";

  return (
    <button
      type="button"
      id="hook-target-alpha"
      className="hook-target alpha primary btn"
      data-testid="element-alpha-button"
      onClick={(event) => {
        const target = event.currentTarget;
        setSelectedElement((prev) => (prev ? null : target));
      }}
    >
      {selectedElement ? "Clear selection" : "Store as selected"}
      <span className="btn__meta" data-testid="element-state-label">{label}</span>
    </button>
  );
}

