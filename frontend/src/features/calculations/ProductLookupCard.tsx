import { useState } from 'react';
import { Select } from '../../components/Select';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { useProducts } from '../../lib/queries';
import { useProductRangeCalculations } from './hooks';
import { CalcStats } from './CalcStats';

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

export function ProductLookupCard() {
  const { data: products } = useProducts();
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState(toDateInput(startOfWeek(new Date())));
  const [dateTo, setDateTo] = useState(toDateInput(new Date()));

  const { data } = useProductRangeCalculations(productId, dateFrom, dateTo);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-fg">Product performance lookup</h2>
      <p className="mb-4 text-sm text-fg-muted">Look up any single product's performance over any date range.</p>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
      {!productId && <EmptyState message="Select a product to see its performance over this range." />}
      {productId && data && <CalcStats data={data} />}
    </div>
  );
}
