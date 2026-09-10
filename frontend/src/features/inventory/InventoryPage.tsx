import { useAuth } from '../auth/AuthContext';
import { WarehouseInventoryPage } from './WarehouseInventoryPage';
import { ShopInventoryPage } from './ShopInventoryPage';

// Role split happens here, not just in the UI: a Counter never mounts (and
// therefore never fetches data for) any warehouse component, regardless of
// what URL they land on — and the underlying warehouse endpoints reject a
// Counter's requests server-side too, so this is defense in depth, not the
// only line of defense.
export function InventoryPage() {
  const { user } = useAuth();
  return user?.role === 'MANAGER' ? <WarehouseInventoryPage /> : <ShopInventoryPage />;
}
