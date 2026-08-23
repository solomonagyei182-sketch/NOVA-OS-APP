export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface text-sm text-fg-subtle">
      {message}
    </div>
  );
}
