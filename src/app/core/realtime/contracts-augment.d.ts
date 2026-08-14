// Temporal: el backend añadió los eventos de cursor (Fase 3) y de fase/timer/votos/kick
// (Fase 4: Facilitación y votación) en collabforge-api#develop, pero esos commits todavía
// no están pusheados a GitHub, así que el paquete @collabforge/contracts instalado
// (dependencia git) aún no los declara. Eliminar este archivo cuando se reinstale el
// paquete con los tipos ya publicados.
import '@collabforge/contracts';
import type { Ack, BoardPhase } from '@collabforge/contracts';

declare module '@collabforge/contracts' {
  interface ClientEvents {
    'cursor:move': { x: number; y: number };
    'vote:cast': { noteId: string };
    'vote:retract': { noteId: string };
    'session:change-phase': { phase: BoardPhase };
    'session:start-timer': { durationSeconds: number };
    'session:pause-timer': void;
    'session:cancel-timer': void;
    'session:reveal': void;
    'member:kick': { userId: string };
  }

  interface ServerEvents {
    'cursor:moved': { userId: string; x: number; y: number };
    'session:phase-changed': { phase: BoardPhase; revealed: boolean };
    'session:timer-updated': { endsAt: string | null; paused: boolean; remainingMs?: number };
    'board:revealed': { revealed: true };
    'board:kicked': { reason: 'KICKED_BY_OWNER' };
    'vote:tally': { tally: Record<string, number> };
    'vote:my-update': { noteId: string; count: number; remaining: number };
  }

  export type CastVoteAck = Ack<{ remaining: number }>;
  export type RetractVoteAck = Ack<{ remaining: number }>;
  export type StartTimerAck = Ack<{ endsAt: string }>;
}
