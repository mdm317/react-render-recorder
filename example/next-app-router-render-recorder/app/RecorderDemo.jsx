"use client";

import { useState } from "react";

const starterEvents = [
  "Recorder script requested before hydration",
  "App Router client boundary is ready",
];

const starterTracks = [
  { id: 1, title: "Server layout", status: "Script strategy" },
  { id: 2, title: "Client island", status: "State updates" },
];

export function RecorderDemo() {
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState("overview");
  const [tracks, setTracks] = useState(starterTracks);
  const [events, setEvents] = useState(starterEvents);

  function logEvent(message) {
    setEvents((current) => [message, ...current].slice(0, 6));
  }

  function handleCount() {
    const nextCount = count + 1;
    setCount(nextCount);
    logEvent(`Counter advanced to ${nextCount}`);
  }

  function handleMode() {
    const nextMode = mode === "overview" ? "timeline" : "overview";
    setMode(nextMode);
    logEvent(`Mode switched to ${nextMode}`);
  }

  function handleTrack() {
    const nextTrack = {
      id: tracks.length + 1,
      title: `Commit source ${tracks.length + 1}`,
      status: mode,
    };

    setTracks([nextTrack, ...tracks]);
    logEvent(`Added ${nextTrack.title}`);
  }

  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Next.js App Router</p>
        <h1 id="page-title">Record React commits from an App Router client boundary</h1>
        <p className="lede">
          Load the recorder before hydration, then interact with client state to confirm commits are
          captured.
        </p>
        <div className="actions" aria-label="Demo controls">
          <button onClick={handleCount} type="button">
            Count {count}
          </button>
          <button onClick={handleMode} type="button">
            Mode {mode}
          </button>
          <button onClick={handleTrack} type="button">
            Add source
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
          <p className="label">Commit sources</p>
          <div className="track-list">
            {tracks.map((track) => (
              <div className="track" key={track.id}>
                <span>{track.title}</span>
                <strong>{track.status}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
