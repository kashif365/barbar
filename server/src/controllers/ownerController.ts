import type { FilterQuery } from 'mongoose';
import { AuditLog, Service, Setting, Token, User } from '../models';
import type { ServiceLean } from '../models/Service';
import type { IToken, TokenLean } from '../models/Token';
import type { UserLean } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError, notFound } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { businessDateOf } from '../utils/time';
import {
  barberCreateSchema,
  barberUpdateSchema,
  dailyReportQuery,
  idParam,
  monthlyReportQuery,
  rangeReportQuery,
  ownerTokensQuery,
  reassignSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
  settingsUpdateSchema,
} from '../validators';
import { getQueueSnapshot } from '../services/queueService';
import { buildReport } from '../services/reportService';
import { audit } from '../services/auditService';
import { reassignToken } from '../services/queueActions';
import { getSettings } from '../services/settingsService';
import { emitQueueUpdated } from '../sockets';
import { decorate } from './staffController';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serviceView = (s: ServiceLean) => ({
  id: String(s._id),
  name: s.name,
  description: s.description,
  price: s.price,
  currency: s.currency,
  durationMinutes: s.durationMinutes,
  isActive: s.isActive,
  isDemoPrice: s.isDemoPrice,
  sortOrder: s.sortOrder,
});

const barberView = (u: UserLean, completedToday = 0, busy = false) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  availability: u.barber?.availability ?? 'offline',
  serviceIds: (u.barber?.serviceIds ?? []).map(String),
  completedToday,
  busy,
});

// ---------- Dashboard & reports ----------

export const dashboard = asyncHandler(async (_req, res) => {
  const today = businessDateOf();
  const [snap, report] = await Promise.all([getQueueSnapshot(), buildReport(today, today)]);
  res.json({
    businessDate: today,
    totalTokens: report.totalTokens,
    waiting: snap.waiting.length,
    inService: snap.inService.length,
    completed: report.byStatus.completed,
    cancelled: report.byStatus.cancelled,
    skipped: report.byStatus.skipped,
    /** Booked price of services completed today. Customers pay the barber in person; nothing is recorded in the app. */
    earnings: report.earnings,
    currency: 'PKR',
    popularServices: report.popularServices.slice(0, 5),
    bySource: report.bySource,
    barbers: snap.barbers.map((b) => ({
      id: String(b._id),
      name: b.name,
      availability: b.barber?.availability ?? 'offline',
      busy: snap.inService.some((t) => String(t.barberId) === String(b._id)),
      completedToday: report.byBarber.find((x) => x.barberId === String(b._id))?.completed ?? 0,
    })),
  });
});

export const dailyReport = asyncHandler(async (req, res) => {
  const { date } = dailyReportQuery.parse(req.query);
  const d = date ?? businessDateOf();
  res.json({ report: await buildReport(d, d) });
});

export const rangeReport = asyncHandler(async (req, res) => {
  const { from, to } = rangeReportQuery.parse(req.query);
  res.json({ report: await buildReport(from, to) });
});

export const monthlyReport = asyncHandler(async (req, res) => {
  const { month } = monthlyReportQuery.parse(req.query);
  const m = month ?? businessDateOf().slice(0, 7);
  // YYYY-MM-DD strings compare lexicographically, so "-31" safely bounds every month.
  res.json({ report: await buildReport(`${m}-01`, `${m}-31`) });
});

// ---------- Tokens ----------

export const listTokens = asyncHandler(async (req, res) => {
  const q = ownerTokensQuery.parse(req.query);
  const filter: FilterQuery<IToken> = { businessDate: q.date ?? businessDateOf() };
  if (q.status) filter.status = q.status;
  if (q.source) filter.source = q.source;
  if (q.barberId) filter.barberId = q.barberId;
  if (q.q) filter.tokenNumber = { $regex: escapeRegex(q.q), $options: 'i' };

  const [total, items, snap] = await Promise.all([
    Token.countDocuments(filter),
    Token.find(filter)
      .sort({ queuedAt: 1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<TokenLean[]>(),
    getQueueSnapshot(),
  ]);
  res.json({ items: await decorate(items, snap), page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) });
});

export const reassign = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { barberId } = reassignSchema.parse(req.body);
  const token = await reassignToken(id, barberId);
  await audit(req.user!, 'token.reassign', 'Token', id, { tokenNumber: token.tokenNumber, barberId });
  emitQueueUpdated();
  const snap = await getQueueSnapshot();
  res.json({ token: (await decorate([token], snap))[0] });
});

// ---------- Services ----------

export const listServicesOwner = asyncHandler(async (_req, res) => {
  const items = await Service.find().sort({ sortOrder: 1, name: 1 }).lean<ServiceLean[]>();
  res.json({ items: items.map(serviceView) });
});

export const createService = asyncHandler(async (req, res) => {
  const body = serviceCreateSchema.parse(req.body);
  const s = await Service.create(body);
  await audit(req.user!, 'service.create', 'Service', s._id, { name: s.name, price: s.price });
  res.status(201).json({ service: serviceView(s.toObject() as ServiceLean) });
});

export const updateService = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = serviceUpdateSchema.parse(req.body);
  // Existing tokens keep their price/name/duration snapshots, so editing a service is always safe.
  const s = await Service.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true }).lean<ServiceLean>();
  if (!s) throw notFound('Service');
  await audit(req.user!, 'service.update', 'Service', id, body);
  res.json({ service: serviceView(s) });
});

/** Soft delete: services referenced by historical tokens are never destroyed. */
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const s = await Service.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean<ServiceLean>();
  if (!s) throw notFound('Service');
  await audit(req.user!, 'service.deactivate', 'Service', id, { name: s.name });
  res.json({ service: serviceView(s) });
});

// ---------- Barbers / staff ----------

export const listBarbers = asyncHandler(async (_req, res) => {
  const today = businessDateOf();
  const [users, done, busy] = await Promise.all([
    User.find({ role: { $in: ['barber', 'staff'] } }).sort({ name: 1 }).lean<UserLean[]>(),
    Token.aggregate<{ _id: unknown; n: number }>([
      { $match: { businessDate: today, status: 'completed', barberId: { $ne: null } } },
      { $group: { _id: '$barberId', n: { $sum: 1 } } },
    ]),
    Token.find({ status: 'in_service' }).select('barberId').lean(),
  ]);
  const doneMap = new Map(done.map((d) => [String(d._id), d.n]));
  const busySet = new Set(busy.map((b) => String(b.barberId)));
  res.json({ items: users.map((u) => barberView(u, doneMap.get(String(u._id)) ?? 0, busySet.has(String(u._id)))) });
});

export const createBarber = asyncHandler(async (req, res) => {
  const b = barberCreateSchema.parse(req.body);
  const exists = await User.exists({ email: b.email });
  if (exists) throw new AppError(409, 'EMAIL_IN_USE', 'An account with that email already exists.');
  const u = await User.create({
    name: b.name,
    email: b.email,
    passwordHash: await hashPassword(b.password),
    role: b.role,
    barber: { availability: 'offline', serviceIds: b.serviceIds },
  });
  await audit(req.user!, 'user.create', 'User', u._id, { role: b.role, email: b.email });
  res.status(201).json({ barber: barberView(u.toObject() as UserLean) });
});

export const updateBarber = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const b = barberUpdateSchema.parse(req.body);
  const set: Record<string, unknown> = {};
  if (b.name !== undefined) set.name = b.name;
  if (b.isActive !== undefined) set.isActive = b.isActive;
  if (b.availability !== undefined) set['barber.availability'] = b.availability;
  if (b.serviceIds !== undefined) set['barber.serviceIds'] = b.serviceIds;
  if (b.password !== undefined) set.passwordHash = await hashPassword(b.password);

  // The owner can only manage barber/staff accounts here — never other owners.
  const u = await User.findOneAndUpdate({ _id: id, role: { $in: ['barber', 'staff'] } }, { $set: set }, { new: true }).lean<UserLean>();
  if (!u) throw notFound('Barber');

  if (b.isActive === false) {
    // Edge case: deactivated barber must not keep waiting tokens hostage -> return them to "first available".
    await Token.updateMany({ barberId: u._id, status: 'waiting' }, { $set: { barberId: null } });
    emitQueueUpdated();
  } else if (b.availability !== undefined || b.serviceIds !== undefined) {
    emitQueueUpdated();
  }
  const { password: _pw, ...logged } = b;
  await audit(req.user!, 'user.update', 'User', id, { ...logged, passwordReset: b.password !== undefined });
  res.json({ barber: barberView(u) });
});

// ---------- Settings & audit ----------

export const getOwnerSettings = asyncHandler(async (_req, res) => {
  res.json({ settings: await getSettings() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const body = settingsUpdateSchema.parse(req.body);
  await getSettings();
  const s = await Setting.findOneAndUpdate({ key: 'main' }, { $set: body }, { new: true, runValidators: true }).lean();
  await audit(req.user!, 'settings.update', 'Setting', 'main', body);
  res.json({ settings: s });
});

export const listAudit = asyncHandler(async (_req, res) => {
  const items = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ items: items.map((a) => ({ id: String(a._id), actorName: a.actorName, action: a.action, entityType: a.entityType, entityId: a.entityId, meta: a.meta, createdAt: a.createdAt })) });
});
