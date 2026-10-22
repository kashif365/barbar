import { Token, User } from '../models';

/**
 * EARNINGS RULE (documented in README):
 *   Customers pay the barber in person, so the app records no payments. Earnings = sum of the price
 *   snapshotted at booking (priceAtBooking) for tokens COMPLETED in the period. Waiting, in-service,
 *   skipped and cancelled tokens contribute 0. Everything is attributed to the token's businessDate.
 */
export async function buildReport(from: string, to: string) {
  const tokenMatch = { businessDate: { $gte: from, $lte: to } };
  const completedMatch = { ...tokenMatch, status: 'completed' };

  const [byStatusRaw, bySourceRaw, byServiceRaw, byBarberRaw, perDay] = await Promise.all([
    Token.aggregate<{ _id: string; n: number }>([{ $match: tokenMatch }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Token.aggregate<{ _id: string; n: number }>([{ $match: tokenMatch }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
    Token.aggregate<{ _id: string; n: number; earnings: number }>([
      { $match: completedMatch },
      { $group: { _id: '$serviceName', n: { $sum: 1 }, earnings: { $sum: '$priceAtBooking' } } },
      { $sort: { n: -1, _id: 1 } },
    ]),
    Token.aggregate<{ _id: unknown; n: number; earnings: number }>([
      { $match: { ...completedMatch, barberId: { $ne: null } } },
      { $group: { _id: '$barberId', n: { $sum: 1 }, earnings: { $sum: '$priceAtBooking' } } },
    ]),
    Token.aggregate<{ _id: string; total: number; completed: number; earnings: number }>([
      { $match: tokenMatch },
      {
        $group: {
          _id: '$businessDate',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          earnings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$priceAtBooking', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byStatus: Record<string, number> = { waiting: 0, in_service: 0, completed: 0, skipped: 0, cancelled: 0 };
  for (const r of byStatusRaw) byStatus[r._id] = r.n;
  const bySource: Record<string, number> = { online: 0, 'walk-in': 0 };
  for (const r of bySourceRaw) bySource[r._id] = r.n;

  const barberIds = byBarberRaw.map((r) => r._id);
  const barbers = await User.find({ _id: { $in: barberIds } }).select('name').lean();
  const nameOf = new Map(barbers.map((b) => [String(b._id), b.name]));
  const byBarber = byBarberRaw
    .map((r) => ({ barberId: String(r._id), name: nameOf.get(String(r._id)) ?? 'Unknown', completed: r.n, earnings: r.earnings }))
    .sort((a, b) => b.completed - a.completed);

  return {
    from,
    to,
    currency: 'PKR',
    totalTokens: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byStatus,
    bySource,
    popularServices: byServiceRaw.map((r) => ({ name: r._id, completed: r.n, earnings: r.earnings })),
    byBarber,
    earnings: perDay.reduce((sum, d) => sum + d.earnings, 0),
    days: perDay.map((d) => ({ date: d._id, tokens: d.total, completed: d.completed, earnings: d.earnings })),
  };
}
