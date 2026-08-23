import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Same split as lib/api.ts: relative + Vite's proxy locally, absolute backend
// origin in production (socket.io-client defaults to the /socket.io path
// against whatever host it's given, so no separate path override is needed).
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export function getSocket(): Socket {
  if (!socket) {
    socket = backendUrl
      ? io(backendUrl, { withCredentials: true, autoConnect: false })
      : io({ path: '/socket.io', withCredentials: true, autoConnect: false });
  }
  return socket;
}
