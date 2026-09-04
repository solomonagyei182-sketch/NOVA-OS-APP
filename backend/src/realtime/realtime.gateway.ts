import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export type RealtimeEvent =
  | 'sale:created'
  | 'inventory:updated'
  | 'customer:created'
  | 'customer:updated'
  | 'reseller:created'
  | 'reseller:updated'
  | 'product:created'
  | 'product:updated'
  | 'day:closed'
  | 'day:reopened'
  | 'session:created'
  | 'session:ended'
  | 'stock-transfer:dispatched'
  | 'stock-transfer:accepted';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  emit(event: RealtimeEvent, payload?: Record<string, unknown>) {
    this.server?.emit(event, payload ?? {});
  }
}
