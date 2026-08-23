import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { BusinessDay, DailyCalculations, ProductRangeCalculations } from '../../lib/types';

export function useDailyCalculations() {
  return useQuery({
    queryKey: ['calculations', 'daily'],
    queryFn: () => api.get<DailyCalculations>('/calculations/daily'),
  });
}

export function useProductRangeCalculations(productId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['calculations', 'range', productId, dateFrom, dateTo],
    queryFn: () =>
      api.get<ProductRangeCalculations>(
        `/calculations/product-range?productId=${productId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: Boolean(productId && dateFrom && dateTo),
  });
}

export function useTodayBusinessDay() {
  return useQuery({
    queryKey: ['business-day', 'today'],
    queryFn: () => api.get<BusinessDay>('/business-days/today'),
  });
}

function invalidateDay(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['business-day'] });
  queryClient.invalidateQueries({ queryKey: ['calculations'] });
}

export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BusinessDay>('/business-days/close'),
    onSuccess: () => {
      invalidateDay(queryClient);
      toast.success("Today's transactions are now closed.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not close the day.'),
  });
}

export function useReopenDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => api.post<BusinessDay>(`/business-days/${dayId}/reopen`),
    onSuccess: () => {
      invalidateDay(queryClient);
      toast.success('Day reopened.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not reopen the day.'),
  });
}
