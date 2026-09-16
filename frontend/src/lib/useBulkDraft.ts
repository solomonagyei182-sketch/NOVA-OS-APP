/**
 * Client-side-only draft storage for Bulk Entry screens. A draft is just rows
 * sitting in this browser's localStorage — it never touches the server, so it
 * cannot affect sales/inventory/calculations/reports until "Record All" is
 * actually submitted. Scoped per-device on purpose (no sync needed for this).
 */
export function useBulkDraft<T>(key: string) {
  const storageKey = `nova-os:bulk-draft:${key}`;

  function saveDraft(rows: T[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ rows, savedAt: new Date().toISOString() }));
    } catch {
      // localStorage unavailable (private mode, quota) — draft simply won't persist.
    }
  }

  function loadDraft(): { rows: T[]; savedAt: string } | null {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  return { saveDraft, loadDraft, clearDraft };
}
