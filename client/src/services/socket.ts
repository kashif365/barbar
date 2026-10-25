import { io, type Socket } from 'socket.io-client';

type Transport = 'websocket' | 'polling';

let socket: Socket | null = null;

/**
 * WebSocket first, HTTP long-polling only if the WebSocket cannot be opened.
 *
 * Polling-first (the Socket.IO default) depends on every follow-up HTTP request reaching the same
 * Node process that issued the session id. Behind cPanel/Passenger that breaks whenever the app is
 * restarted, scaled to a second process or idles out, and shows up as "400 Session ID unknown".
 * A WebSocket is one long-lived connection, so it has no such dependency.
 *
 * Override in config.js on the server, e.g. `socketTransports: ['polling']` if a host blocks
 * WebSocket upgrades entirely.
 */
function transports(): Transport[] {
  const fromConfig = window.SB_CONFIG?.socketTransports?.filter((t): t is Transport => t === 'websocket' || t === 'polling');
  return fromConfig?.length ? fromConfig : ['websocket', 'polling'];
}

/** One shared connection for the whole app. Reconnects automatically with backoff. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.SB_CONFIG?.socketUrl || import.meta.env.VITE_SOCKET_URL || undefined, {
      withCredentials: true,
      transports: transports(),
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });
  }
  return socket;
}

/**
 * The server decides which rooms a socket joins from the session cookie at handshake time,
 * so after login/logout we reconnect to pick up (or drop) staff-room membership.
 * A connection that is still being established is left to finish first: tearing it down
 * mid-handshake is what produces "WebSocket is closed before the connection is established".
 */
export function refreshSocketAuth(): void {
  if (!socket) return;
  const s = socket;
  const reconnect = () => {
    s.disconnect();
    s.connect();
  };
  if (s.connected) reconnect();
  else if (s.active) s.once('connect', reconnect);
  else s.connect();
}
