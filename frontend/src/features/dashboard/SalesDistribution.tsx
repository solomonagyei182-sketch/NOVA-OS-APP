import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useDailyCalculations } from '../calculations/hooks';

const SLICE_COLORS = [
  'var(--color-brand-500)',
  'var(--color-accent2-500)',
  'var(--color-warning-500)',
  'var(--color-info-500)',
  'var(--color-success-500)',
  'var(--color-danger-500)',
];

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function SalesDistribution() {
  const { data, isLoading } = useDailyCalculations();
  const products = data?.products ?? [];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-fg">Today's sales by product</h2>
      <p className="mb-4 text-xs text-fg-subtle">Share of today's revenue</p>

      {isLoading && <Skeleton className="h-56 w-full rounded-full" />}

      {!isLoading && products.length === 0 && <EmptyState message="No sales recorded yet today." />}

      {!isLoading && products.length > 0 && (
        <>
          <div className="relative h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={products}
                  dataKey="totalAmount"
                  nameKey="productName"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {products.map((p, i) => (
                    <Cell key={p.productId} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-fg)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xs text-fg-subtle">Total</div>
              <div className="text-lg font-semibold text-fg">{formatMoney(data?.totalSalesToday ?? 0)}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {products.slice(0, 5).map((p, i) => (
              <div key={p.productId} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-fg-muted">{p.productName}</span>
                <span className="shrink-0 font-medium text-fg">{formatMoney(p.totalAmount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
