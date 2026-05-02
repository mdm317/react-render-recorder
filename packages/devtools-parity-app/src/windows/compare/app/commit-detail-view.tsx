import type { CommitPair, ComponentEntry, SerializableFiberChange } from "./build-commit-pairs";

type SectionKind = "matched" | "recorder-only" | "devtools-only";

function ComponentSection({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: ComponentEntry[];
  kind: SectionKind;
}) {
  return (
    <section className={`detail-section detail-${kind}`}>
      <h4>
        {title} <span className="detail-count">{entries.length}</span>
      </h4>
      {entries.length === 0 ? (
        <div className="detail-empty">—</div>
      ) : (
        <ul className="detail-list">
          {entries.map((e, i) => (
            <li key={i}>
              <span className="detail-name">{e.displayName}</span>
              <span className="detail-duration">{e.selfDuration.toFixed(3)}ms</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describeSkipReason(e: SerializableFiberChange): string {
  const reasons: string[] = [];
  if (e.displayName == null) reasons.push("displayName=null");
  if (e.selfDuration == null) reasons.push("selfDuration=null");
  return reasons.join(", ");
}

function describeChange(e: SerializableFiberChange): string {
  const tags: string[] = [];
  if (e.isFirstMount) tags.push("mount");
  if (e.didHooksChange) tags.push("hooks");
  if (e.props) tags.push("props");
  if (e.state) tags.push("state");
  if (e.context) tags.push("context");
  return tags.join(" · ");
}

export function CommitDetailView({ pair }: { pair: CommitPair }) {
  return (
    <div className="commit-detail">
      <div className="commit-detail-grid">
        <ComponentSection title="Matched" entries={pair.matched} kind="matched" />
        <ComponentSection
          title="Recorder only"
          entries={pair.recorderOnly}
          kind="recorder-only"
        />
        <ComponentSection
          title="DevTools only"
          entries={pair.devtoolsOnly}
          kind="devtools-only"
        />
      </div>
      {pair.recorderSkipped.length > 0 && (
        <section className="detail-skipped">
          <h4>
            Recorder skipped{" "}
            <span className="detail-count">{pair.recorderSkipped.length}</span>
          </h4>
          <p className="detail-note">
            Recorder entries with null displayName or selfDuration — excluded from the
            multiset comparison.
          </p>
          <ul className="detail-list">
            {pair.recorderSkipped.map((e, i) => (
              <li key={i}>
                <span className="detail-name">{e.displayName ?? "<null>"}</span>
                <span className="detail-duration">
                  {e.selfDuration == null ? "<null>" : `${e.selfDuration.toFixed(3)}ms`}
                </span>
                <span className="detail-meta">{describeChange(e) || "no-change"}</span>
                <span className="detail-skip-reason">{describeSkipReason(e)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pair.devtoolsSkipped.length > 0 && (
        <section className="detail-skipped">
          <h4>
            DevTools skipped{" "}
            <span className="detail-count">{pair.devtoolsSkipped.length}</span>
          </h4>
          <p className="detail-note">
            ContextProvider / ContextConsumer entries — recorder's collectFiberChanges
            doesn't track these fiber tags, so they're dropped on the devtools side too
            for fair comparison.
          </p>
          <ul className="detail-list">
            {pair.devtoolsSkipped.map((e, i) => (
              <li key={i}>
                <span className="detail-name">{e.displayName}</span>
                <span className="detail-duration">{e.selfDuration.toFixed(3)}ms</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
