import JsonView from "@uiw/react-json-view";

type PaneProps = {
  available: boolean;
  data: unknown;
  emptyMessage: string;
  errorMessage: string | null;
  summary: string;
  title: string;
};

export function Pane({
  available,
  data,
  emptyMessage,
  errorMessage,
  summary,
  title,
}: PaneProps) {
  return (
    <section className="pane">
      <h2>{title}</h2>
      <div className="summary">{summary}</div>
      {errorMessage ? (
        <div className="error">{errorMessage}</div>
      ) : available ? (
        <div className="pane-body">
          <JsonView
            value={data as object}
            collapsed={2}
            displayDataTypes={false}
            shortenTextAfterLength={120}
          />
        </div>
      ) : (
        <div className="empty">{emptyMessage}</div>
      )}
    </section>
  );
}
