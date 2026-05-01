import { useState, type ReactNode } from "react";
import "./Table.css";

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface TableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  emptyMessage?: string;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  className?: string;
}

export function Table({
  columns,
  data,
  emptyMessage = "No data available",
  onSort,
  className,
}: TableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(nextDir);
    onSort?.(key, nextDir);
  };

  return (
    <div className={`ui-table-wrapper${className ? ` ${className}` : ""}`}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  col.sortable ? "ui-table__th--sortable" : undefined
                }
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && (
                  <SortIndicator
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : null}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="ui-table__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc" | null;
}) {
  const cls = `ui-table__sort-indicator${active ? " ui-table__sort-indicator--active" : ""}`;
  if (!active || direction === null) {
    return <span className={cls}>&#9650;&#9660;</span>;
  }
  return (
    <span className={cls}>{direction === "asc" ? "\u25B2" : "\u25BC"}</span>
  );
}
