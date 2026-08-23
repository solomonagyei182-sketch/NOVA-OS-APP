import { useState } from 'react';
import clsx from 'clsx';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { DataTable, type Column } from '../../components/DataTable';
import { useActiveResellers } from '../../lib/queries';
import { useResellerPerformance } from './hooks';
import type { ResellerPerformance } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Mode = 'month' | 'range';

export function ResellerPerformanceSection() {
  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resellerId, setResellerId] = useState('');

  const { data: resellers } = useActiveResellers();
  const [year, monthNum] = month.split('-').map(Number);

  const { data } = useResellerPerformance(
    mode === 'range' && dateFrom && dateTo
      ? { dateFrom, dateTo, resellerId: resellerId || undefined }
      : { month: monthNum, year, resellerId: resellerId || undefined },
  );

  const columns: Column<ResellerPerformance>[] = [
    { key: 'fullName', header: 'Reseller', render: (r) => <span className="font-medium text-fg">{r.fullName}</span> },
    { key: 'numberOfTransactions', header: 'Sales', render: (r) => r.numberOfTransactions },
    { key: 'totalSpent', header: 'Total Sales', render: (r) => formatMoney(r.totalSpent) },
    { key: 'totalCommission', header: 'Commission Earned', render: (r) => formatMoney(r.totalCommission) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-fg">Top resellers</h2>
        <p className="text-xs text-fg-subtle">
          Commission Earned is the sum of manually entered commission amounts — no percentage calculation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
          {(
            [
              ['month', 'By month'],
              ['range', 'Custom range'],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={clsx(
                'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                mode === value ? 'bg-brand-tint text-brand-tint-fg' : 'text-fg-muted hover:bg-surface-2',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'month' ? (
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        ) : (
          <>
            <Input type="date" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" aria-label="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </>
        )}

        <Select aria-label="Filter by reseller" value={resellerId} onChange={(e) => setResellerId(e.target.value)}>
          <option value="">All resellers</option>
          {resellers?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <DataTable
          columns={columns}
          rows={data ?? []}
          keyField={(r) => r.resellerId}
          emptyMessage="No reseller purchases recorded for this period."
        />
      </div>

      {data && data.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-fg">Commission earned by reseller</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="fullName" tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar dataKey="totalCommission" fill="var(--color-accent2-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
