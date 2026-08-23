import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, Receipt, Package, Percent } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { useSalesSummary } from './hooks';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalesSummarySection() {
  const { data } = useSalesSummary();
  if (!data) return null;

  const periods = [
    { key: 'today', label: 'Today', data: data.today },
    { key: 'thisWeek', label: 'This Week', data: data.thisWeek },
    { key: 'thisMonth', label: 'This Month', data: data.thisMonth },
  ];

  const chartData = periods.map((p) => ({ name: p.label, sales: p.data.totalSales }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-fg">Sales summary</h2>

      {periods.map((p) => (
        <div key={p.key} className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-fg">{p.label}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total sales" value={formatMoney(p.data.totalSales)} icon={DollarSign} tone="brand" />
            <StatCard label="Transactions" value={p.data.transactionCount} icon={Receipt} tone="success" />
            <StatCard label="Products sold" value={p.data.productsSold} icon={Package} tone="warning" />
            <StatCard label="Total commission" value={formatMoney(p.data.totalCommission)} icon={Percent} tone="danger" />
          </div>
        </div>
      ))}

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
