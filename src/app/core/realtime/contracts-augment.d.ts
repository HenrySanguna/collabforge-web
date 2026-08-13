// Temporal: el backend añadió los eventos de cursor en collabforge-api#develop, pero ese
// commit todavía no está pusheado a GitHub, así que el paquete @collabforge/contracts
// instalado (dependencia git) aún no los declara. Eliminar este archivo cuando se
// reinstale el paquete con los tipos de cursor ya publicados.
import '@collabforge/contracts';

declare module '@collabforge/contracts' {
  interface ClientEvents {
    'cursor:move': { x: number; y: number };
  }

  interface ServerEvents {
    'cursor:moved': { userId: string; x: number; y: number };
  }
}
