import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** One shared connection. Reconnects automatically with backoff. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.SB_CONFIG?.socketUrl || import.meta.env.VITE_SOCKET_URL || undefined, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

/**
 * The server decides which rooms a socket joins from the session cookie at handshake time,
 * so after login/logout we reconnect to pick up (or drop) staff-room membership.
 */
export function refreshSocketAuth(): void {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}
