import { ReactRecord } from "./index";

export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Integrated demo</p>
        <h1>react-record package with its example app built in</h1>
        <p className="copy">
          The recorder package now ships its local demo surface directly, so
          you can iterate on the library component and its devtools hook from a
          single workspace package.
        </p>
      </section>

      <ReactRecord label="Recorder preview" />
    </main>
  );
}
