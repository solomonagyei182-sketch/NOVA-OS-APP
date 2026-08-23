import { SalesForm } from './SalesForm';
import { SalesHistory } from './SalesHistory';

export function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Sales</h1>
        <p className="text-sm text-fg-muted">Record transactions and browse sales history.</p>
      </div>
      <SalesForm />
      <SalesHistory />
    </div>
  );
}
