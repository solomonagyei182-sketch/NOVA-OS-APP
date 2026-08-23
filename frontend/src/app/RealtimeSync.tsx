import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getSocket } from '../lib/socket';

const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  'sale:created': [['sales'], ['dashboard']],
  'inventory:updated': [['inventory'], ['products'], ['dashboard']],
  'customer:created': [['customers'], ['dashboard']],
  'customer:updated': [['customers']],
  'day:closed': [['business-day'], ['calculations'], ['dashboard']],
  'day:reopened': [['business-day'], ['calculations'], ['dashboard']],
  'session:created': [['sessions']],
};

export function RealtimeSync() {
  const { user, clearSession } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
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

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      socket.off('session:ended', handleSessionEnded);
      socket.disconnect();
    };
  }, [user, queryClient, navigate, clearSession]);

  return null;
}
