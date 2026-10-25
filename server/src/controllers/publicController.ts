import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Service, Token, User } from '../models';
import type { ServiceLean } from '../models/Service';
import { asyncHandler } from '../utils/asyncHandler';
import { notFound } from '../utils/errors';
import { idParam } from '../validators';
import { getSettings, isSalonOpen } from '../services/settingsService';
import { getQueueSnapshot } from '../services/queueService';

export const toPublicService = (s: ServiceLean) => ({
  id: String(s._id),
  name: s.name,
  description: s.description,
  price: s.price,
  currency: s.currency,
  durationMinutes: s.durationMinutes,
  isDemoPrice: s.isDemoPrice,
});

export const health = asyncHandler(async (_req: Request, res: Response) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

export const listServices = asyncHandler(async (_req, res) => {
  const items = await Service.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<ServiceLean[]>();
  res.json({ items: items.map(toPublicService) });
});

export const getService = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const s = await Service.findOne({ _id: id, isActive: true }).lean<ServiceLean>();
  if (!s) throw notFound('Service');
  res.json({ service: toPublicService(s) });
});

export const listBarbers = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  if (!settings.allowBarberChoice) return res.json({ items: [] });
  const barbers = await User.find({ role: 'barber', isActive: true }).sort({ name: 1 }).lean();
  res.json({
    items: barbers.map((b) => ({
      id: String(b._id),
      name: b.name,
      photoUrl: b.photoUrl ?? null,
      availability: b.barber?.availability ?? 'offline',
      serviceIds: (b.barber?.serviceIds ?? []).map(String),
    })),
  });
});

export const publicSettings = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  res.json({
    settings: {
      salonName: s.salonName,
      address: s.address,
      phone: s.phone,
      instagramUrl: s.instagramUrl,
      openTime: s.openTime,
      closeTime: s.closeTime,
      enforceHours: s.enforceHours,
      isOpen: isSalonOpen(s),
      phoneRequired: s.phoneRequired,
      allowBarberChoice: s.allowBarberChoice,
      onlineBookingEnabled: s.onlineBookingEnabled,
      timezone: 'Asia/Karachi',
    },
  });
});

/** Privacy-safe queue: token numbers and counts only. No names, phones, services or ids. */
export const queueToday = asyncHandler(async (_req, res) => {
  const snap = await getQueueSnapshot();
  const counts = await Token.aggregate<{ _id: string; n: number }>([
    { $match: { businessDate: snap.businessDate } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const c: Record<string, number> = { waiting: 0, in_service: 0, completed: 0, skipped: 0, cancelled: 0 };
  for (const r of counts) c[r._id] = r.n;
  const settings = await getSettings();
  res.json({
    businessDate: snap.businessDate,
    isOpen: isSalonOpen(settings),
    counts: c,
    nowServing: snap.inService.map((t) => ({ tokenNumber: t.tokenNumber })),
    waiting: snap.waiting.map((t, i) => ({ tokenNumber: t.tokenNumber, position: i + 1 })),
    estimatedWaitForNewTokenMinutes: snap.estimates.forNewToken,
  });
});
