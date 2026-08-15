import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@collabforge/contracts';
import { environment } from '../config/environment';

type EventMap<T> = { [K in keyof T]: (payload: T[K]) => void };
export type BoardSocket = Socket<EventMap<ServerEvents>, EventMap<ClientEvents>>;

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const ACK_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: BoardSocket | null = null;
  private readonly _state = signal<ConnectionState>('idle');

  readonly state = this._state.asReadonly();

  connect(boardId: string, token: string, correlationId?: string): BoardSocket {
    this.disconnect();
    this._state.set('connecting');

    const socket: BoardSocket = io(`${environment.wsUrl}/board`, {
      auth: correlationId ? { token, correlationId } : { token },
      query: { boardId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => this._state.set('connected'));
    socket.on('disconnect', (reason) => {
      // 'io server disconnect' es el servidor cerrando la conexión explícitamente:
      // socket.io NO reintenta solo en ese caso, así que es un desconectado real.
      // Los demás motivos ('transport close', 'ping timeout', etc.) sí disparan
      // reintentos automáticos, cubiertos por 'reconnect_attempt' más abajo.
      this._state.set(reason === 'io server disconnect' ? 'disconnected' : 'reconnecting');
    });
    socket.io.on('reconnect_attempt', () => this._state.set('reconnecting'));
    socket.io.on('reconnect', () => this._state.set('connected'));
    socket.io.on('reconnect_failed', () => this._state.set('disconnected'));

    this.socket = socket;
    return socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._state.set('idle');
  }

  emitVolatile<E extends keyof ClientEvents>(event: E, payload: ClientEvents[E]): void {
    const socket = this.socket;
    if (!socket) return;

    // Igual que en emitWithAck: el mapa de eventos tipa emit() con la forma exacta
    // del payload, pero el genérico E no colapsa a un literal, así que se castea.
    (socket.volatile.emit as (event: string, payload: unknown) => void)(event, payload);
  }

  emitWithAck<E extends keyof ClientEvents, R>(event: E, payload: ClientEvents[E]): Promise<R> {
    const socket = this.socket;
    if (!socket) return Promise.reject(new Error('Not connected.'));

    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ACK_TIMEOUT')), ACK_TIMEOUT_MS);

      // socket.io tipa emit() sin el callback de ack en el mapa de eventos;
      // el ack se modela aquí vía el genérico R del llamador.
      (socket.emit as (event: string, payload: unknown, ack: (response: R) => void) => void)(
        event as string,
        payload,
        (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
      );
    });
  }
}
