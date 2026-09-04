import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type {
  ActiveSessionsResponse,
  AdminOverview,
  AuditLogEntry,
  BusinessSettings,
  CounterOverview,
  CounterProfile,
  Role,
  StaffUser,
} from '../../lib/types';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['reports', 'admin-overview'],
    queryFn: () => api.get<AdminOverview>('/reports/admin-overview'),
  });
}

export function useStaffList(filters: { search?: string; role?: Role | 'ALL' }) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role && filters.role !== 'ALL') params.set('role', filters.role);
  const qs = params.toString();

  return useQuery({
    queryKey: ['staff', filters],
    queryFn: () => api.get<StaffUser[]>(`/users${qs ? `?${qs}` : ''}`),
  });
}

export type CreateStaffInput = { name: string; email: string; password: string; role: Role };
export type UpdateStaffInput = Partial<{ name: string; email: string; role: Role; isActive: boolean; password: string }>;

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffInput) => api.post<StaffUser>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff account created.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not create staff account.'),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffInput }) =>
      api.patch<StaffUser>(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff account updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update staff account.'),
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () => api.get<ActiveSessionsResponse>('/sessions/active'),
    refetchInterval: 20_000,
  });
}

export function useDropSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/sessions/${id}/drop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session ended.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not end session.'),
  });
}

export function useCounters(filters: { search?: string; status?: 'ACTIVE' | 'INACTIVE' | 'ALL' }) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: ['counters', filters],
    queryFn: () => api.get<CounterOverview[]>(`/counters${qs ? `?${qs}` : ''}`),
  });
}

export function useCounterProfile(counterId: string | undefined, filters: { dateFrom?: string; dateTo?: string }) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString();

  return useQuery({
    queryKey: ['counters', counterId, 'profile', filters],
    queryFn: () => api.get<CounterProfile>(`/counters/${counterId}/profile${qs ? `?${qs}` : ''}`),
    enabled: Boolean(counterId),
  });
}

export function useAuditLogs(limit: number, offset: number) {
  return useQuery({
    queryKey: ['audit-logs', limit, offset],
    queryFn: () => api.get<{ logs: AuditLogEntry[]; total: number }>(`/audit-logs?limit=${limit}&offset=${offset}`),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettings>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<BusinessSettings, 'businessName' | 'currencySymbol' | 'defaultLowStockThreshold'>>) =>
      api.patch<BusinessSettings>('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not save settings.'),
  });
}
