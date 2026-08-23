import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '../../components/Skeleton';
import { useSalesTrend } from './hooks';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function TrendChart() {
  const { data, isLoading } = useSalesTrend(14);

  const chartData = (data ?? []).map((point) => ({ ...point, label: formatDay(point.date) }));
  const total = chartData.reduce((sum, p) => sum + p.totalSales, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-fg">Sales trend</h2>
          <p className="text-xs text-fg-subtle">Last 14 days</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-fg-subtle">Total</div>
          <div className="text-lg font-semibold text-fg">{formatMoney(total)}</div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-fg-subtle)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-fg-subtle)' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-fg)',
                }}
              />
              <Area
                type="monotone"
                dataKey="totalSales"
                stroke="var(--color-brand-500)"
                strokeWidth={2}
                fill="url(#salesTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
