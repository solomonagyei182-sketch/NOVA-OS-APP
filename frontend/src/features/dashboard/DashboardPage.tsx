import { SummaryCards } from './SummaryCards';
import { RecentActivity } from './RecentActivity';
import { TrendChart } from './TrendChart';
import { SalesDistribution } from './SalesDistribution';

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <SummaryCards />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:items-start">
        <div className="xl:col-span-2">
          <TrendChart />
        </div>
        <div className="flex flex-col gap-6">
          <SalesDistribution />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
