import { useState } from "react";

const starterEvents = [
  "Recorder script loaded from the custom document",
  "Pages Router entry is hydrated",
];

const starterRoutes = [
  { id: 1, name: "pages/_document.jsx", detail: "Script before app" },
  { id: 2, name: "pages/index.jsx", detail: "Stateful route" },
];

export default function Home() {
  const [count, setCount] = useState(0);
  const [view, setView] = useState("summary");
  const [routes, setRoutes] = useState(starterRoutes);
  const [events, setEvents] = useState(starterEvents);

  function logEvent(message) {
    setEvents((current) => [message, ...current].slice(0, 6));
  }

  function handleCount() {
    const nextCount = count + 1;
    setCount(nextCount);
    logEvent(`Counter advanced to ${nextCount}`);
  }

  function handleView() {
    const nextView = view === "summary" ? "detail" : "summary";
    setView(nextView);
    logEvent(`View switched to ${nextView}`);
  }

  function handleRoute() {
    const nextRoute = {
      id: routes.length + 1,
      name: `pages/demo-${routes.length + 1}.jsx`,
      detail: view,
    };

    setRoutes([nextRoute, ...routes]);
    logEvent(`Added ${nextRoute.name}`);
  }

  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Next.js Pages Router</p>
        <h1 id="page-title">Record React commits from a Pages Router route</h1>
        <p className="lede">
          Inject the recorder in the document head, then use route state to create commits after
          hydration.
        </p>
        <div className="actions" aria-label="Demo controls">
          <button onClick={handleCount} type="button">
            Count {count}
          </button>
          <button onClick={handleView} type="button">
            View {view}
          </button>
          <button onClick={handleRoute} type="button">
            Add route
          </button>
        </div>
      </section>

      <section className="status-grid" aria-label="Recorder activity">
        <article className="status-block">
          <p className="label">Recent events</p>
          <ul className="event-list">
            {events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </article>

        <article className="status-block">
          <p className="label">Route sources</p>
          <div className="route-list">
            {routes.map((route) => (
              <div className="route" key={route.id}>
                <span>{route.name}</span>
                <strong>{route.detail}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
