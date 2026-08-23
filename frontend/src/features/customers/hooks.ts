import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { Customer, CustomerTier } from '../../lib/types';

export function useCustomers(filters: { search?: string; tier?: CustomerTier | 'ALL'; enabled?: boolean }) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.tier && filters.tier !== 'ALL') params.set('tier', filters.tier);
  const qs = params.toString();

  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => api.get<Customer[]>(`/customers${qs ? `?${qs}` : ''}`),
    enabled: filters.enabled ?? true,
  });
}

export type CustomerInput = {
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tier: CustomerTier;
};

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerInput) => api.post<Customer>('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add customer.'),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerInput }) =>
      api.patch<Customer>(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update customer.'),
  });
}
