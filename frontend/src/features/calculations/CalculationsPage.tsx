import { DayStatusCard } from './DayStatusCard';
import { CalculationsCard } from './CalculationsCard';
import { ProductLookupCard } from './ProductLookupCard';

export function CalculationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Calculations</h1>
        <p className="text-sm text-fg-muted">Daily, weekly, and monthly product performance.</p>
      </div>
      <DayStatusCard />
      <CalculationsCard />
      <ProductLookupCard />
    </div>
  );
}
