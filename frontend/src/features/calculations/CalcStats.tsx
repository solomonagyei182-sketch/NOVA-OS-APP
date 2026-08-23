import type { ProductRangeCalculations } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CalcStats({ data }: { data: ProductRangeCalculations }) {
  const items = [
    { label: 'Quantity sold', value: data.totalQuantitySold },
    { label: 'Sales amount', value: formatMoney(data.totalSalesAmount) },
    { label: 'Transactions', value: data.transactionCount },
    { label: 'Commission earned', value: formatMoney(data.totalCommission) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-fg-subtle">{item.label}</div>
          <div className="mt-0.5 text-lg font-semibold text-fg">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
