import { createContext, useContext } from 'react';

// Defaults to "connected" so nothing renders before RealtimeSync's first
// socket event — matches the common case and avoids a flash of "offline".
export const ConnectionStatusContext = createContext(true);

export function useConnectionStatus() {
  return useContext(ConnectionStatusContext);
}
