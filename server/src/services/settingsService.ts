import { Setting, type ISetting } from '../models/Setting';
import { localMinutesOfDay, parseHHmm } from '../utils/time';

export type SettingLean = ISetting & { _id: unknown };

export async function getSettings(): Promise<SettingLean> {
  const doc = await Setting.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return doc as SettingLean;
}

/** Hours are only enforced when the owner turns it on AND both times are configured. */
export function isSalonOpen(s: Pick<ISetting, 'enforceHours' | 'openTime' | 'closeTime'>, now: Date = new Date()): boolean {
  if (!s.enforceHours) return true;
  const open = parseHHmm(s.openTime);
  const close = parseHHmm(s.closeTime);
  if (open === null || close === null) return true;
  const t = localMinutesOfDay(now);
  // Supports hours that cross midnight (e.g. 14:00–02:00).
  return open <= close ? t >= open && t < close : t >= open || t < close;
}
