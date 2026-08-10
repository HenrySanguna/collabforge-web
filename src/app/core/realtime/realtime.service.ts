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

  connect(boardId: string, token: string): BoardSocket {
    this.disconnect();
    this._state.set('connecting');

    const socket: BoardSocket = io(`${environment.wsUrl}/board`, {
      auth: { token },
      query: { boardId },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => this._state.set('connected'));
    socket.on('disconnect', () => this._state.set('reconnecting'));
    socket.io.on('reconnect_attempt', () => this._state.set('reconnecting'));
    socket.io.on('reconnect', () => this._state.set('connected'));

    this.socket = socket;
    return socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._state.set('idle');
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
