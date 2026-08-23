import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { Sale } from '../../lib/types';

export type SalesFilters = {
  search?: string;
  productId?: string;
  resellerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'price' | 'commission';
  sortDir?: 'asc' | 'desc';
};

function buildQuery(filters: SalesFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useSales(filters: SalesFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => api.get<Sale[]>(`/sales${buildQuery(filters)}`),
  });
}

export function useTodaySummary() {
  return useQuery({
    queryKey: ['sales', 'today-summary'],
    queryFn: () => api.get<{ totalSales: number; transactionCount: number; totalCommission: number }>(
      '/sales/today-summary',
    ),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productId: string;
      resellerId: string;
      quantity?: number;
      unitPrice: number;
      commission: number;
    }) => api.post<Sale>('/sales', data),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success(`Sale recorded — ${sale.transactionId}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not record sale.'),
  });
}
