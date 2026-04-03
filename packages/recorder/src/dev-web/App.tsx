import { ReactRecord } from "../index";

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Development surface</p>
        <h1>react-record browser workspace for live recorder iteration</h1>
        <p className="copy">
          This browser app exercises the recorder UI and the devtools hook together
          while the package structure stays split between core logic and
          development-only runtime code.
        </p>
      </section>

      <ReactRecord label="Recorder preview" />
    </main>
  );
}
