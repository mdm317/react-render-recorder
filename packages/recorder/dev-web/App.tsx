export function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Development surface</p>
        <h1>react-record browser workspace with a React shell and Preact recorder</h1>
        <p className="copy">
          This page keeps the development shell on React while the recorder UI is mounted as a
          separate Preact app so both runtimes can be exercised together.
        </p>
      </section>
      <section className="notes">
        <p className="notes-title">Runtime split</p>
        <p className="notes-copy">
          The recorder panel below is mounted into its own root outside the React tree. The shell
          stays React-only.
        </p>
      </section>
    </main>
  );
}
