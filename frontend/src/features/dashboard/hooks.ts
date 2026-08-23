import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type TrendPoint = { date: string; totalSales: number };

export function useSalesTrend(days: number) {
  return useQuery({
    queryKey: ['sales', 'trend', days],
    queryFn: () => api.get<TrendPoint[]>(`/sales/trend?days=${days}`),
  });
}
