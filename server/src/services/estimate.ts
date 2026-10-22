import type { TokenLean } from '../models/Token';
import type { UserLean } from '../models/User';

export interface Estimates {
  /** tokenId -> minutes until the token is expected to start; null when it cannot be estimated reliably. */
  byToken: Map<string, number | null>;
  /** Minutes until a brand-new "first available" token would start; null if no barber is available. */
  forNewToken: number | null;
}

const minutesBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 60_000;

/**
 * Deterministic queue simulation.
 *  - Only barbers currently "available" take part (on break / offline barbers are excluded).
 *  - Each available barber becomes free after the REMAINING time of their current service
 *    (planned duration minus elapsed, never below 0), or immediately if idle.
 *  - Waiting tokens are walked in queue order. A token goes to its preferred barber if set,
 *    otherwise to whichever eligible barber frees up first; that barber is then busy for the
 *    token's snapshot duration.
 *  - A token whose preferred barber is unavailable, or that no available barber can serve, gets
 *    `null` ("cannot be estimated") instead of an invented number.
 * It is an approximation: real service times vary.
 */
export function computeEstimates(
  waiting: TokenLean[],
  inService: TokenLean[],
  barbers: UserLean[],
  now: Date = new Date(),
): Estimates {
  const free = new Map<string, number>();
  const caps = new Map<string, Set<string>>();
  for (const b of barbers) {
    if (b.barber?.availability !== 'available') continue;
    const id = String(b._id);
    const current = inService.find((t) => String(t.barberId) === id);
    let remaining = 0;
    if (current?.startedAt) {
      remaining = Math.max(0, current.durationMinutesAtBooking - minutesBetween(now, current.startedAt));
    }
    free.set(id, remaining);
    caps.set(id, new Set((b.barber.serviceIds ?? []).map(String)));
  }

  const byToken = new Map<string, number | null>();
  if (free.size === 0) {
    for (const t of waiting) byToken.set(String(t._id), null);
    return { byToken, forNewToken: null };
  }

  for (const t of waiting) {
    const sid = String(t.serviceId);
    const eligible = [...free.keys()].filter((id) => {
      if (t.barberId && String(t.barberId) !== id) return false;
      const c = caps.get(id)!;
      return c.size === 0 || c.has(sid);
    });
    if (eligible.length === 0) {
      byToken.set(String(t._id), null);
      continue;
    }
    eligible.sort((a, b) => free.get(a)! - free.get(b)! || a.localeCompare(b));
    const pick = eligible[0];
    const start = free.get(pick)!;
    byToken.set(String(t._id), Math.ceil(start));
    free.set(pick, start + t.durationMinutesAtBooking);
  }

  return { byToken, forNewToken: Math.ceil(Math.min(...free.values())) };
}
