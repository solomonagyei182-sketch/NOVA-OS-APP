import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  keyField,
  emptyMessage = 'No records yet.',
}: {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-2 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={keyField(row)} className="transition-colors hover:bg-surface-2/60">
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-fg">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((row) => (
          <div key={keyField(row)} className="rounded-xl border border-border bg-surface p-4">
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="text-fg-subtle">{c.header}</span>
                <span className="text-right font-medium text-fg">{c.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
