import { useState } from 'react';
import clsx from 'clsx';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, Receipt, Package, Percent } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useSalesSummary } from './hooks';

type PeriodKey = 'today' | 'thisWeek' | 'thisMonth';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalesSummarySection() {
  const { data } = useSalesSummary();
  const [period, setPeriod] = useState<PeriodKey>('today');
  if (!data) return null;

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: 'Day' },
    { key: 'thisWeek', label: 'Week' },
    { key: 'thisMonth', label: 'Month' },
  ];
  const active = data[period];
  const chartData = periods.map((p) => ({ name: p.label, sales: data[p.key].totalSales }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-fg">Sales summary</h2>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-fg">
            {period === 'today' ? "Today's" : period === 'thisWeek' ? "This week's" : "This month's"} summary
          </h3>
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface-2 p-1">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={clsx(
                  'whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  period === p.key ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total sales" value={formatMoney(active.totalSales)} icon={DollarSign} tone="brand" />
          <StatCard label="Transactions" value={active.transactionCount} icon={Receipt} tone="success" />
          <StatCard label="Products sold" value={active.productsSold} icon={Package} tone="warning" />
          <StatCard label="Total commission" value={formatMoney(active.totalCommission)} icon={Percent} tone="danger" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-fg">Sales by period</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Bar dataKey="sales" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
