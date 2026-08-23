import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '../../components/Input';
import { DataTable, type Column } from '../../components/DataTable';
import { useStaffPerformance } from './hooks';
import type { StaffPerformance } from '../../lib/types';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function StaffPerformanceSection() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, monthNum] = month.split('-').map(Number);

  const { data } = useStaffPerformance(monthNum, year);

  const columns: Column<StaffPerformance>[] = [
    { key: 'name', header: 'Staff', render: (r) => <span className="font-medium text-fg">{r.name}</span> },
    { key: 'numberOfSales', header: 'Total sales', render: (r) => r.numberOfSales },
    { key: 'totalSalesValue', header: 'Sales value', render: (r) => formatMoney(r.totalSalesValue) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Staff performance</h2>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <p className="-mt-2 text-xs text-fg-subtle">
        Sales volume recorded per staff member. Commission is earned by the Reseller on each sale, not by staff — see Top resellers below.
      </p>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <DataTable
          columns={columns}
          rows={data ?? []}
          keyField={(r) => r.staffId}
          emptyMessage="No sales recorded for this month."
        />
      </div>

      {data && data.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-fg">Sales value by staff</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-fg-subtle)" />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar dataKey="totalSalesValue" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
