import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Product, Reseller } from './types';

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ['products', search ?? ''],
    queryFn: () => api.get<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.get<Product[]>('/products?status=ACTIVE'),
  });
}

export function useActiveResellers() {
  return useQuery({
    queryKey: ['resellers', 'active'],
    queryFn: () => api.get<Pick<Reseller, 'id' | 'fullName'>[]>('/resellers/active'),
  });
}
