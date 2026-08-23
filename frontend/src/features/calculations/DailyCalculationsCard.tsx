import { DataTable, type Column } from '../../components/DataTable';
import { useDailyCalculations } from './hooks';
import type { DailyCalculations } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DailyCalculationsCard() {
  const { data } = useDailyCalculations();

  const columns: Column<DailyCalculations['products'][number]>[] = [
    { key: 'productName', header: 'Product', render: (r) => <span className="font-medium text-fg">{r.productName}</span> },
    { key: 'numberSold', header: 'Number sold', render: (r) => r.numberSold },
    { key: 'totalAmount', header: 'Total amount', render: (r) => formatMoney(r.totalAmount) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Today's calculations</h2>
        <div className="rounded-xl bg-brand-tint px-4 py-2 text-right">
          <div className="text-xs text-brand-tint-fg">Total sales today</div>
          <div className="text-lg font-semibold text-brand-tint-fg">{formatMoney(data?.totalSalesToday ?? 0)}</div>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.products ?? []}
        keyField={(r) => r.productId}
        emptyMessage="No sales recorded yet today."
      />
    </div>
  );
}
