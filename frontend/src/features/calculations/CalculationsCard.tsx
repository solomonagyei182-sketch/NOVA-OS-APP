import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { DataTable, type Column } from '../../components/DataTable';
import { useCalculationsSummary, useDailyCalculations } from './hooks';

type Period = 'day' | 'week' | 'month';
type ProductRow = { productId: string; productName: string; numberSold: number; totalAmount: number };

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const periods: { key: Period; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export function CalculationsCard() {
  const [period, setPeriod] = useState<Period>('day');
  const today = useMemo(() => new Date(), []);
  const weekRange = useMemo(
    () => ({ dateFrom: toDateInput(startOfWeek(today)), dateTo: toDateInput(today) }),
    [today],
  );
  const monthRange = useMemo(
    () => ({ dateFrom: toDateInput(startOfMonth(today)), dateTo: toDateInput(today) }),
    [today],
  );

  const daily = useDailyCalculations();
  const weekly = useCalculationsSummary(weekRange.dateFrom, weekRange.dateTo);
  const monthly = useCalculationsSummary(monthRange.dateFrom, monthRange.dateTo);

  const active =
    period === 'day'
      ? { products: daily.data?.products ?? [], totalSales: daily.data?.totalSalesToday ?? 0, transactionCount: daily.data?.transactionCount ?? 0, totalCommission: daily.data?.totalCommission ?? 0, isLoading: daily.isLoading }
      : period === 'week'
        ? { products: weekly.data?.products ?? [], totalSales: weekly.data?.totalSales ?? 0, transactionCount: weekly.data?.transactionCount ?? 0, totalCommission: weekly.data?.totalCommission ?? 0, isLoading: weekly.isLoading }
        : { products: monthly.data?.products ?? [], totalSales: monthly.data?.totalSales ?? 0, transactionCount: monthly.data?.transactionCount ?? 0, totalCommission: monthly.data?.totalCommission ?? 0, isLoading: monthly.isLoading };

  const columns: Column<ProductRow>[] = [
    { key: 'productName', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.productName}</span> },
    { key: 'numberSold', header: 'Number sold', render: (r) => r.numberSold },
    { key: 'totalAmount', header: 'Total amount', render: (r) => formatMoney(r.totalAmount) },
  ];

  const periodLabel = period === 'day' ? "Today's" : period === 'week' ? "This week's" : "This month's";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Calculations</h2>
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-brand-tint px-4 py-3">
          <div className="text-xs text-brand-tint-fg">{periodLabel} total sales</div>
          <div className="mt-0.5 text-lg font-semibold text-brand-tint-fg">{formatMoney(active.totalSales)}</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-fg-subtle">Transactions</div>
          <div className="mt-0.5 text-lg font-semibold text-fg">{active.transactionCount}</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-fg-subtle">Commission earned</div>
          <div className="mt-0.5 text-lg font-semibold text-fg">{formatMoney(active.totalCommission)}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={active.products}
        keyField={(r) => r.productId}
        emptyMessage={`No sales recorded ${period === 'day' ? 'yet today' : `this ${period}`}.`}
      />
    </div>
  );
}
