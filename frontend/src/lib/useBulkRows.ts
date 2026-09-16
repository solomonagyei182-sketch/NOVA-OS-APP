import { useState } from 'react';

/** Shared row-array state for every Bulk Entry screen — add/remove/edit/clear, nothing section-specific. */
export function useBulkRows<T>(makeEmptyRow: () => T) {
  const [rows, setRows] = useState<T[]>([makeEmptyRow()]);

  function addRow() {
    setRows((prev) => [...prev, makeEmptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateRow(index: number, patch: Partial<T>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function clearRow(index: number) {
    setRows((prev) => prev.map((r, i) => (i === index ? makeEmptyRow() : r)));
  }

  function resetRows() {
    setRows([makeEmptyRow()]);
  }

  return { rows, setRows, addRow, removeRow, updateRow, clearRow, resetRows };
}
