import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import type {
  Company,
  Product,
  ShopStockItem,
  StockMovement,
  StockRequest,
  StockRequestStatus,
  StockTransfer,
  WarehouseStockItem,
} from '../../lib/types';

export { useProducts } from '../../lib/queries';

export function useActiveCompanies() {
  return useQuery({
    queryKey: ['companies', 'active'],
    queryFn: () => api.get<Pick<Company, 'id' | 'name'>[]>('/companies/active'),
  });
}

export function useShopStock() {
  return useQuery({
    queryKey: ['inventory', 'shop'],
    queryFn: () => api.get<ShopStockItem[]>('/inventory/shop'),
  });
}

// Manager-only on the backend — callers must pass enabled: false for a
// Counter so this never fires a doomed request or renders warehouse data.
export function useWarehouseStock(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['inventory', 'warehouse'],
    queryFn: () => api.get<WarehouseStockItem[]>('/inventory/warehouse'),
    enabled: options.enabled ?? true,
  });
}

// Manager-only on the backend — callers must pass enabled: false for a
// Counter so this never fires a doomed request or renders warehouse data.
export function useMovements(productId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['inventory', 'movements', productId ?? ''],
    queryFn: () =>
      api.get<StockMovement[]>(`/inventory/movements${productId ? `?productId=${productId}` : ''}`),
    enabled: options.enabled ?? true,
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
  companyId?: string;
  newCompanyName?: string;
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

export function useCreateProductsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: ProductInput[]) => api.post<{ count: number; products: Product[] }>('/products/bulk', { rows }),
    onSuccess: (result) => {
      invalidateInventory(queryClient);
      toast.success(`Successfully added ${result.count} product${result.count === 1 ? '' : 's'}.`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add the batch.'),
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

export type CorrectStockInput = { warehouseQty?: number; shopQty?: number; reason: string };

export function useCorrectStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CorrectStockInput }) =>
      api.patch<Product>(`/products/${id}/correct-stock`, data),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Stock corrected.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not correct stock.'),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      invalidateInventory(queryClient);
      toast.success('Product permanently deleted.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not delete product.'),
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

export function useAddWarehouseStockBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: { productId: string; quantity: number }[]) =>
      api.post<{ count: number }>('/inventory/warehouse-stock/bulk', { rows }),
    onSuccess: (result) => {
      invalidateInventory(queryClient);
      toast.success(`Successfully recorded ${result.count} stock-in ${result.count === 1 ? 'entry' : 'entries'}.`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not record the batch.'),
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

function invalidateStockTransfers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
  invalidateInventory(queryClient);
}

export function usePendingStockTransfers() {
  return useQuery({
    queryKey: ['stock-transfers', 'pending'],
    queryFn: () => api.get<StockTransfer[]>('/stock-transfers/pending'),
  });
}

export function useDispatchStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; assignedToId: string }) =>
      api.post<StockTransfer>('/stock-transfers', data),
    onSuccess: () => {
      invalidateStockTransfers(queryClient);
      toast.success('Stock dispatched — awaiting acceptance.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not dispatch stock.'),
  });
}

export function useAcceptStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post(`/stock-transfers/${id}/accept`),
    onSuccess: () => {
      invalidateStockTransfers(queryClient);
      toast.success('Stock accepted and added to shop inventory.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not accept stock.'),
  });
}

export function useAllStockTransfers(filters: {
  status?: 'PENDING' | 'ACCEPTED';
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assignedToId) params.set('assignedToId', filters.assignedToId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString();

  return useQuery({
    queryKey: ['stock-transfers', 'all', filters],
    queryFn: () => api.get<StockTransfer[]>(`/stock-transfers${qs ? `?${qs}` : ''}`),
  });
}

function invalidateStockRequests(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
}

/** A Counter's own stock requests, any status. */
export function useMyStockRequests() {
  return useQuery({
    queryKey: ['stock-requests', 'mine'],
    queryFn: () => api.get<StockRequest[]>('/stock-requests/mine'),
  });
}

/** Manager's queue of requests awaiting a decision. */
export function usePendingStockRequests() {
  return useQuery({
    queryKey: ['stock-requests', 'pending'],
    queryFn: () => api.get<StockRequest[]>('/stock-requests/pending'),
  });
}

export function useAllStockRequests(filters: { status?: StockRequestStatus; requestedById?: string }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.requestedById) params.set('requestedById', filters.requestedById);
  const qs = params.toString();

  return useQuery({
    queryKey: ['stock-requests', 'all', filters],
    queryFn: () => api.get<StockRequest[]>(`/stock-requests${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateStockRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; note?: string }) =>
      api.post<StockRequest>('/stock-requests', data),
    onSuccess: () => {
      invalidateStockRequests(queryClient);
      toast.success('Stock request sent.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not send stock request.'),
  });
}

export function useFulfillStockRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity?: number }) =>
      api.post<StockRequest>(`/stock-requests/${id}/fulfill`, { quantity }),
    onSuccess: () => {
      invalidateStockRequests(queryClient);
      invalidateStockTransfers(queryClient);
      toast.success('Stock request fulfilled — dispatched to the Counter.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not fulfill stock request.'),
  });
}

export function useCancelStockRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<StockRequest>(`/stock-requests/${id}/cancel`),
    onSuccess: () => {
      invalidateStockRequests(queryClient);
      toast.success('Stock request cancelled.');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not cancel stock request.'),
  });
}
