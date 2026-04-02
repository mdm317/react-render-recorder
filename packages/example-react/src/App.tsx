import { ReactRecord } from "react-record";

import "./index.css";

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Workspace example</p>
        <h1>Vite app consuming the local react-record library</h1>
        <p className="copy">
          The example package resolves <code>react-record</code> from the
          workspace source so you can iterate on the library without a separate
          prebuild step.
        </p>
      </section>

      <ReactRecord label="Recorder preview" />
    </main>
  );
}
