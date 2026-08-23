import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { InventoryStatusReport, ResellerPerformance, SalesSummary, StaffPerformance } from '../../lib/types';

export function useSalesSummary() {
  return useQuery({
    queryKey: ['reports', 'sales-summary'],
    queryFn: () => api.get<SalesSummary>('/reports/sales-summary'),
  });
}

export function useInventoryStatusReport() {
  return useQuery({
    queryKey: ['reports', 'inventory-status'],
    queryFn: () => api.get<InventoryStatusReport>('/reports/inventory-status'),
  });
}

export function useStaffPerformance(month: number, year: number) {
  return useQuery({
    queryKey: ['reports', 'staff-performance', month, year],
    queryFn: () => api.get<StaffPerformance[]>(`/reports/staff-performance?month=${month}&year=${year}`),
  });
}

export type ResellerPerformanceFilters = {
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  resellerId?: string;
};

export function useResellerPerformance(filters: ResellerPerformanceFilters) {
  const params = new URLSearchParams();
  if (filters.dateFrom && filters.dateTo) {
    params.set('dateFrom', filters.dateFrom);
    params.set('dateTo', filters.dateTo);
  } else {
    if (filters.month) params.set('month', String(filters.month));
    if (filters.year) params.set('year', String(filters.year));
  }
  if (filters.resellerId) params.set('resellerId', filters.resellerId);

  return useQuery({
    queryKey: ['reports', 'reseller-performance', filters],
    queryFn: () => api.get<ResellerPerformance[]>(`/reports/reseller-performance?${params.toString()}`),
  });
}
