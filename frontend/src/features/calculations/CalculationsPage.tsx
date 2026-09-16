import { useAuth } from '../auth/AuthContext';
import { DayStatusCard } from './DayStatusCard';
import { BusinessDaysCard } from './BusinessDaysCard';
import { CalculationsCard } from './CalculationsCard';
import { ProductLookupCard } from './ProductLookupCard';

export function CalculationsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Calculations</h1>
        <p className="text-sm text-fg-muted">Daily, weekly, and monthly product performance.</p>
      </div>
      <DayStatusCard />
      {user?.role === 'MANAGER' && <BusinessDaysCard />}
      <CalculationsCard />
      <ProductLookupCard />
    </div>
  );
}
