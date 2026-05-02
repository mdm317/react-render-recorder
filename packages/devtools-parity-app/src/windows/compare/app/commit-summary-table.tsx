import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";

import type { CommitPair } from "./build-commit-pairs";
import { CommitDetailView } from "./commit-detail-view";

type LengthOf = { length: number };

function makeColumns(): ColumnDef<CommitPair>[] {
  return [
    {
      id: "expander",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="row-expander"
          onClick={row.getToggleExpandedHandler()}
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
        >
          {row.getIsExpanded() ? "▾" : "▸"}
        </button>
      ),
    },
    {
      accessorKey: "commitIndex",
      header: "Commit",
      cell: (info) => `#${info.getValue<number>()}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.getValue<CommitPair["status"]>();
        return (
          <span className={`status-pill status-${status}`}>
            {status === "matched" ? "✓ matched" : "✗ mismatched"}
          </span>
        );
      },
    },
    {
      accessorKey: "matched",
      header: "Matched",
      cell: (info) => info.getValue<LengthOf>().length,
      sortingFn: (a, b) => a.original.matched.length - b.original.matched.length,
    },
    {
      accessorKey: "recorderOnly",
      header: "Recorder-only",
      cell: (info) => {
        const n = info.getValue<LengthOf>().length;
        return <span className={n > 0 ? "count-warn" : undefined}>{n}</span>;
      },
      sortingFn: (a, b) => a.original.recorderOnly.length - b.original.recorderOnly.length,
    },
    {
      accessorKey: "devtoolsOnly",
      header: "DevTools-only",
      cell: (info) => {
        const n = info.getValue<LengthOf>().length;
        return <span className={n > 0 ? "count-warn" : undefined}>{n}</span>;
      },
      sortingFn: (a, b) => a.original.devtoolsOnly.length - b.original.devtoolsOnly.length,
    },
    {
      accessorKey: "recorderSkipped",
      header: "Skipped",
      cell: (info) => info.getValue<LengthOf>().length,
      sortingFn: (a, b) =>
        a.original.recorderSkipped.length - b.original.recorderSkipped.length,
    },
    {
      id: "totals",
      header: "Recorder / DevTools total",
      enableSorting: false,
      cell: ({ row }) => `${row.original.recorderTotal} / ${row.original.devtoolsTotal}`,
    },
  ];
}

export function CommitSummaryTable({ data }: { data: CommitPair[] }) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(makeColumns, []);

  const table = useReactTable({
    data,
    columns,
    state: { expanded, sorting },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  if (data.length === 0) {
    return (
      <div className="commit-summary-empty">
        No commits captured yet. Click <strong>Start Recording</strong>, interact with the
        target page, then <strong>Stop Recording</strong>.
      </div>
    );
  }

  return (
    <table className="commit-table">
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((h) => {
              const canSort = h.column.getCanSort();
              const sorted = h.column.getIsSorted();
              return (
                <th
                  key={h.id}
                  onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                  className={canSort ? "sortable" : undefined}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <Fragment key={row.id}>
            <tr className={`commit-row commit-row-${row.original.status}`}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
            {row.getIsExpanded() && (
              <tr className="commit-detail-row">
                <td colSpan={row.getVisibleCells().length}>
                  <CommitDetailView pair={row.original} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
