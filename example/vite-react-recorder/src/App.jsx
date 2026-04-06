import { useState } from "react";

const initialEvents = [
  "Recorder bundle loaded from /react-record.auto.js",
  "Click the buttons to generate real React commits",
];

export function App() {
  const [count, setCount] = useState(0);
  const [view, setView] = useState("overview");
  const [cards, setCards] = useState([
    { id: 1, label: "Initial snapshot", accent: "rose" },
    { id: 2, label: "Stateful panel", accent: "cyan" },
  ]);
  const [events, setEvents] = useState(initialEvents);

  function appendEvent(message) {
    setEvents((current) => [message, ...current].slice(0, 6));
  }

  function handleCountClick() {
    const nextCount = count + 1;
    setCount(nextCount);
    appendEvent(`Counter advanced to ${nextCount}`);
  }

  function handleAddCard() {
    const nextId = cards.length + 1;
    setCards((current) => [
      { id: nextId, label: `Generated card ${nextId}`, accent: nextId % 2 === 0 ? "rose" : "cyan" },
      ...current,
    ]);
    appendEvent(`Added generated card ${nextId}`);
  }

  function handleToggleView() {
    const nextView = view === "overview" ? "activity" : "overview";
    setView(nextView);
    appendEvent(`Switched dashboard to ${nextView}`);
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Recorder Example</p>
        <h1>React app loading the built recorder bundle from a script tag</h1>
        <p className="lede">
          The recorder UI should appear in the lower-right corner. Use the controls below to force
          real React state updates and verify that commits are captured.
        </p>
        <div className="actions">
          <button data-testid="count-button" onClick={handleCountClick} type="button">
            Count is {count}
          </button>
          <button data-testid="add-card-button" onClick={handleAddCard} type="button">
            Add card
          </button>
          <button data-testid="toggle-view-button" onClick={handleToggleView} type="button">
            Toggle view
          </button>
        </div>
      </section>

      <section className="dashboard">
        <article className="panel">
          <div className="panel-header">
            <span className="panel-label">View</span>
            <strong>{view}</strong>
          </div>
          <p className="panel-copy">
            Each interaction updates local React state so the recorder bundle can observe commits.
          </p>
        </article>

        <article className="panel">
          <div className="panel-header">
            <span className="panel-label">Recent events</span>
            <strong>{events.length}</strong>
          </div>
          <ul className="event-list">
            {events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card-grid">
        {cards.map((card) => (
          <article className={`card card-${card.accent}`} key={card.id}>
            <span className="card-id">0{card.id}</span>
            <h2>{card.label}</h2>
            <p>
              This tile participates in React re-renders. Add more cards or toggle the view to
              create fresh commits in the recorder.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
