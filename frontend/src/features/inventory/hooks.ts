import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type { Product, ShopStockItem, StockMovement, WarehouseStockItem } from '../../lib/types';

export { useProducts } from '../../lib/queries';

export function useShopStock() {
  return useQuery({
    queryKey: ['inventory', 'shop'],
    queryFn: () => api.get<ShopStockItem[]>('/inventory/shop'),
  });
}

export function useWarehouseStock() {
  return useQuery({
    queryKey: ['inventory', 'warehouse'],
    queryFn: () => api.get<WarehouseStockItem[]>('/inventory/warehouse'),
  });
}

export function useMovements(productId?: string) {
  return useQuery({
    queryKey: ['inventory', 'movements', productId ?? ''],
    queryFn: () =>
      api.get<StockMovement[]>(`/inventory/movements${productId ? `?productId=${productId}` : ''}`),
  });
}

function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['products'] });
}

export type ProductInput = {
  name: string;
  sku?: string;
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  lowStockThreshold?: number;
};

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductInput) => api.post<Product>('/products', data),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Product added.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add product.'),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductInput> & { status?: 'ACTIVE' | 'INACTIVE' } }) =>
      api.patch<Product>(`/products/${id}`, data),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Product updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update product.'),
  });
}

export function useAddWarehouseStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number }) =>
      api.post('/inventory/warehouse-stock', data),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Warehouse stock updated.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add stock.'),
  });
}

export function useTransferToShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number }) => api.post('/inventory/transfer', data),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Stock transferred to shop.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not transfer stock.'),
  });
}
