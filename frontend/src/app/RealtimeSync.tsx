import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/AuthContext';
import { getSocket } from '../lib/socket';
import { ConnectionStatusContext } from './ConnectionStatusContext';

// Every backend realtime.emit() call is mapped here to the query-key
// prefixes it can affect. Payloads only ever carry ids (never the changed
// data itself) — the actual refetch still goes through the normal
// authenticated REST endpoints, so role-based access stays enforced exactly
// as it is for a manual page load; realtime only decides *when* to refetch.
const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  'sale:created': [['sales'], ['reports']],
  'inventory:updated': [['inventory'], ['products'], ['reports']],
  'customer:created': [['customers']],
  'customer:updated': [['customers']],
  'reseller:created': [['resellers'], ['reports']],
  'reseller:updated': [['resellers'], ['reports']],
  'product:created': [['products'], ['inventory'], ['reports']],
  'product:updated': [['products'], ['inventory'], ['reports']],
  'company:created': [['companies'], ['products']],
  'company:updated': [['companies'], ['products']],
  'day:closed': [['business-day'], ['calculations'], ['reports']],
  'day:reopened': [['business-day'], ['calculations'], ['reports']],
  'session:created': [['sessions']],
  'stock-transfer:dispatched': [['stock-transfers'], ['inventory'], ['counters'], ['reports']],
  'stock-transfer:accepted': [['stock-transfers'], ['inventory'], ['counters'], ['reports']],
  'stock-request:created': [['stock-requests']],
  'stock-request:fulfilled': [['stock-requests'], ['stock-transfers'], ['inventory'], ['reports']],
  'stock-request:cancelled': [['stock-requests']],
  'user:created': [['staff'], ['counters']],
  'user:updated': [['staff'], ['counters']],
  'settings:updated': [['settings']],
};

export function RealtimeSync({ children }: { children: ReactNode }) {
  const { user, clearSession } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    let hasConnectedBefore = false;
    socket.connect();

    const unsubscribers = Object.entries(EVENT_TO_QUERY_KEYS).map(([event, keys]) => {
      const handler = () => {
        keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      };
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });

    function handleSessionEnded(payload: { userId?: string; reason?: string }) {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (payload.userId === user?.id && payload.reason === 'ADMIN_DROP') {
        clearSession('Your session has been ended by an administrator.');
        navigate('/login', { replace: true });
      }
    }
    socket.on('session:ended', handleSessionEnded);

    // Targeted, per-user notifications layered on top of the generic cache
    // invalidation above — only the person the event actually concerns sees
    // a toast, instead of broadcasting it to everyone who happens to be online.
    function handleStockDispatched(payload: { transferId?: string; assignedToId?: string }) {
      if (payload.assignedToId === user?.id) {
        toast.info('New stock has been dispatched to you — check Receiving in Inventory.');
      }
    }
    function handleRequestFulfilled(payload: { requestId?: string; requestedById?: string }) {
      if (payload.requestedById === user?.id) {
        toast.success('Your stock request was approved and dispatched — check Receiving.');
      }
    }
    function handleRequestCreated() {
      if (user?.role === 'MANAGER') {
        toast.info('New stock request received from a Counter.');
      }
    }
    socket.on('stock-transfer:dispatched', handleStockDispatched);
    socket.on('stock-request:fulfilled', handleRequestFulfilled);
    socket.on('stock-request:created', handleRequestCreated);

    // A dropped connection means every event that fired while it was down
    // was missed. Resync everything currently on screen the moment the
    // socket comes back — not just whatever the reconnect happens to catch
    // going forward — instead of leaving stale data until the user notices.
    function handleConnect() {
      setIsConnected(true);
      if (hasConnectedBefore) {
        queryClient.invalidateQueries();
      }
      hasConnectedBefore = true;
    }
    function handleDisconnect() {
      setIsConnected(false);
    }
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsConnected(socket.connected);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      socket.off('session:ended', handleSessionEnded);
      socket.off('stock-transfer:dispatched', handleStockDispatched);
      socket.off('stock-request:fulfilled', handleRequestFulfilled);
      socket.off('stock-request:created', handleRequestCreated);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [user, queryClient, navigate, clearSession]);

  return <ConnectionStatusContext.Provider value={isConnected}>{children}</ConnectionStatusContext.Provider>;
}
