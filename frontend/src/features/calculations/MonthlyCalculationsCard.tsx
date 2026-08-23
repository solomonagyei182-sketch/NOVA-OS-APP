import { useState } from 'react';
import { Select } from '../../components/Select';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { useProducts } from '../../lib/queries';
import { useProductRangeCalculations } from './hooks';
import { CalcStats } from './CalcStats';

function currentMonthInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthToRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const dateFrom = `${monthValue}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${monthValue}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

export function MonthlyCalculationsCard() {
  const { data: products } = useProducts();
  const [productId, setProductId] = useState('');
  const [month, setMonth] = useState(currentMonthInput());

  const { dateFrom, dateTo } = monthToRange(month);
  const { data } = useProductRangeCalculations(productId, dateFrom, dateTo);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-fg">Monthly product calculations</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {!productId && <EmptyState message="Select a product to see its monthly performance." />}
      {productId && data && <CalcStats data={data} />}
    </div>
  );
}
