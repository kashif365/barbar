import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import type { TokenLean } from '../models/Token';
import { SESSION_COOKIE } from '../middleware/auth';

let io: Server | null = null;

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.allowedOrigins, credentials: true },
  });

  // Everyone joins the public room. Authenticated staff additionally join the private "staff" room.
  io.use(async (socket, next) => {
    try {
      const raw = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      if (raw) {
        const payload = jwt.verify(raw, env.SESSION_SECRET) as { sub: string };
        const user = await User.findById(payload.sub);
        if (user && user.isActive) socket.data.isStaff = true;
      }
    } catch {
      /* invalid/expired cookie: treat as public visitor */
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join('public');
    if (socket.data.isStaff) socket.join('staff');
  });

  return io;
}

export type QueueEvent = 'token:created' | 'token:called' | 'token:completed' | 'token:skipped' | 'token:cancelled' | 'token:requeued';

/**
 * Call ONLY after the database write has succeeded. Public payloads carry the token number and
 * status only — never names, phones or ids. Clients treat events as a hint to refetch;
 * MongoDB stays the source of truth.
 */
export function emitQueueEvent(event: QueueEvent, token: Pick<TokenLean, '_id' | 'tokenNumber' | 'status'>): void {
  if (!io) return;
  const pub = { tokenNumber: token.tokenNumber, status: token.status };
  io.to('public').emit(event, pub);
  io.to('staff').emit(event, { ...pub, tokenId: String(token._id) });
  const stamp = { at: new Date().toISOString() };
  io.to('public').emit('queue:updated', stamp);
  io.to('staff').emit('queue:updated', stamp);
}

/** Generic refresh hint (e.g. availability or reassignment changed). */
export function emitQueueUpdated(): void {
  if (!io) return;
  const stamp = { at: new Date().toISOString() };
  io.to('public').emit('queue:updated', stamp);
  io.to('staff').emit('queue:updated', stamp);
}

export async function closeSocket(): Promise<void> {
  if (io) await io.close();
  io = null;
}
