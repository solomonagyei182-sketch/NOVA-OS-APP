import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { Sale, SaleStatus } from '../../lib/types';

export type SalesFilters = {
  search?: string;
  productId?: string;
  resellerId?: string;
  /** Manager-only — a Counter's own requests always ignore this and see only their own sales (enforced server-side). */
  counterUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'price' | 'commission' | 'transactionDate';
  sortDir?: 'asc' | 'desc';
  /** Omitted = ACTIVE only (the default everywhere). 'ALL' includes deleted transactions — Transaction History only. */
  status?: SaleStatus | 'ALL';
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

export type CreateSaleInput = {
  productId: string;
  resellerId: string;
  quantity?: number;
  unitPrice: number;
  commission: number;
  /** Omitted = today (normal sale). A past date makes this a historical entry and requires reason. */
  transactionDate?: string;
  reason?: string;
};

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSaleInput) => api.post<Sale>('/sales', data),
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

export type CorrectSaleInput = {
  productId?: string;
  resellerId?: string;
  quantity?: number;
  unitPrice?: number;
  commission?: number;
  reason: string;
};

export function useCorrectSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CorrectSaleInput }) => api.patch<Sale>(`/sales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['calculations'] });
      toast.success('Sale corrected.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not correct sale.'),
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch<Sale>(`/sales/${id}/delete`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['calculations'] });
      toast.success('Transaction deleted.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not delete transaction.'),
  });
}
