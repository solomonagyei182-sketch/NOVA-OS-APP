import { DayStatusCard } from './DayStatusCard';
import { DailyCalculationsCard } from './DailyCalculationsCard';
import { WeeklyCalculationsCard } from './WeeklyCalculationsCard';
import { MonthlyCalculationsCard } from './MonthlyCalculationsCard';

export function CalculationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Calculations</h1>
        <p className="text-sm text-fg-muted">Daily, weekly, and monthly product performance.</p>
      </div>
      <DayStatusCard />
      <DailyCalculationsCard />
      <WeeklyCalculationsCard />
      <MonthlyCalculationsCard />
    </div>
  );
}
