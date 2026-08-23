import { SalesSummarySection } from './SalesSummarySection';
import { InventoryStatusSection } from './InventoryStatusSection';
import { StaffPerformanceSection } from './StaffPerformanceSection';
import { ResellerPerformanceSection } from './ResellerPerformanceSection';

export function ReportsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Reports</h1>
        <p className="text-sm text-fg-muted">
          Sales summaries, inventory status, staff performance, and reseller activity.
        </p>
      </div>
      <SalesSummarySection />
      <InventoryStatusSection />
      <StaffPerformanceSection />
      <ResellerPerformanceSection />
    </div>
  );
}
