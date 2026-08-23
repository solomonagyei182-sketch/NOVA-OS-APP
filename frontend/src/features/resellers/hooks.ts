import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { ResellerDetail, ResellerListItem, ResellerStatus } from '../../lib/types';

export function useResellers(filters: { search?: string; status?: ResellerStatus | 'ALL' }) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: ['resellers', filters],
    queryFn: () => api.get<ResellerListItem[]>(`/resellers${qs ? `?${qs}` : ''}`),
  });
}

export function useResellerDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['resellers', 'detail', id],
    queryFn: () => api.get<ResellerDetail>(`/resellers/${id}`),
    enabled: Boolean(id),
  });
}

export type ResellerInput = {
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export function useCreateReseller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ResellerInput) => api.post<ResellerListItem>('/resellers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Reseller added.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add reseller.'),
  });
}

export function useUpdateReseller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResellerInput> & { status?: ResellerStatus } }) =>
      api.patch<ResellerListItem>(`/resellers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Reseller updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update reseller.'),
  });
}
