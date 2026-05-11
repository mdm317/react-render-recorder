import "./App.css";

import { CustomHookButton } from "./buttons/CustomHookButton";
import { DebugValueButton } from "./buttons/DebugValueButton";
import { DoubleUpdateEffectButton } from "./buttons/DoubleUpdateEffectButton";
import { DoubleUpdateLayoutEffectButton } from "./buttons/DoubleUpdateLayoutEffectButton";
import { ElementStatePanel } from "./buttons/ElementStatePanel";
import { ParentCascadeButton } from "./buttons/ParentCascadeButton";
import { SameNameTwins } from "./buttons/SameNameTwins";
import { UpdateButton } from "./buttons/UpdateButton";

export function App() {
  return (
    <main className="page">
      <header className="hero">
        <div className="hero__bar">
          <span className="hero__brand">
            <span className="hero__brand-dot" aria-hidden="true" />
            <span className="hero__brand-name">react-render-recorder</span>
          </span>
          <a
            className="hero__github"
            href="https://github.com/mdm317/react-render-recorder"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="hero__github-icon">
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            GitHub
            <span className="hero__github-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>

        <h1 className="hero__title">
          Every React render,
          <br />
          <em>recorded.</em>
        </h1>
        <p className="hero__lede">
          Tracks how every hook shifts across each React commit, then hands the trace to{" "}
          <span className="hero__lede-tag">Claude</span>,{" "}
          <span className="hero__lede-tag">Codex</span>, or any LLM — and lets it explain why a
          component re-rendered.
        </p>
      </header>

      <div className="page__divider" role="separator" aria-label="Playground">
        <span className="page__divider-label">Playground</span>
      </div>

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

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Same component name</div>
          <div className="row__label-sub">Two siblings both named “Twin”.</div>
        </div>
        <SameNameTwins />
      </div>

      <div className="row">
        <div className="row__label">
          <div className="row__label-title">Parent cascade · hook-change filter</div>
          <div className="row__label-sub">
            Only the parent (own setState) should appear; children render but have no hook change.
          </div>
        </div>
        <ParentCascadeButton />
      </div>
    </main>
  );
}
