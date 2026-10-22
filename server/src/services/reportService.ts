import { Payment, Token, User } from '../models';

/**
 * Completed tokens with NO active (paid) payment. Voided payments do not count as paid.
 * Pass {} for "all dates" (outstanding balance) or a businessDate filter for a period.
 */
export async function unpaidCompleted(match: Record<string, unknown> = {}): Promise<{ count: number; amount: number }> {
  const r = await Token.aggregate<{ count: number; amount: number }>([
    { $match: { ...match, status: 'completed' } },
    {
      $lookup: {
        from: 'payments',
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$id'] }, { $eq: ['$status', 'paid'] }] } } },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: 'p',
      },
    },
    { $match: { p: { $size: 0 } } },
    { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$priceAtBooking' } } },
  ]);
  return { count: r[0]?.count ?? 0, amount: r[0]?.amount ?? 0 };
}

/**
 * ACCOUNTING RULE (documented in README):
 *   Revenue = sum of Payment.amount where status = "paid", attributed to the business date on which
 *   the payment was RECORDED. Completed-but-unpaid services and cancelled/skipped tokens contribute 0.
 *   Counts (tokens, services) are attributed to the token's businessDate.
 */
export async function buildReport(from: string, to: string) {
  const tokenMatch = { businessDate: { $gte: from, $lte: to } };

  const [byStatusRaw, bySourceRaw, byServiceRaw, byBarberRaw, perDayTokens, paymentTotals, perDayRevenue, unpaid] = await Promise.all([
    Token.aggregate<{ _id: string; n: number }>([{ $match: tokenMatch }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Token.aggregate<{ _id: string; n: number }>([{ $match: tokenMatch }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
    Token.aggregate<{ _id: string; n: number }>([
      { $match: { ...tokenMatch, status: 'completed' } },
      { $group: { _id: '$serviceName', n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
    ]),
    Token.aggregate<{ _id: unknown; n: number }>([
      { $match: { ...tokenMatch, status: 'completed', barberId: { $ne: null } } },
      { $group: { _id: '$barberId', n: { $sum: 1 } } },
    ]),
    Token.aggregate<{ _id: string; total: number; completed: number }>([
      { $match: tokenMatch },
      { $group: { _id: '$businessDate', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate<{ _id: null; total: number; count: number }>([
      { $match: { businessDate: { $gte: from, $lte: to }, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate<{ _id: string; total: number }>([
      { $match: { businessDate: { $gte: from, $lte: to }, status: 'paid' } },
      { $group: { _id: '$businessDate', total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    unpaidCompleted(tokenMatch),
  ]);

  const byStatus: Record<string, number> = { waiting: 0, in_service: 0, completed: 0, skipped: 0, cancelled: 0 };
  for (const r of byStatusRaw) byStatus[r._id] = r.n;
  const bySource: Record<string, number> = { online: 0, 'walk-in': 0 };
  for (const r of bySourceRaw) bySource[r._id] = r.n;

  const barberIds = byBarberRaw.map((r) => r._id);
  const barbers = await User.find({ _id: { $in: barberIds } }).select('name').lean();
  const nameOf = new Map(barbers.map((b) => [String(b._id), b.name]));
  const byBarber = byBarberRaw
    .map((r) => ({ barberId: String(r._id), name: nameOf.get(String(r._id)) ?? 'Unknown', completed: r.n }))
    .sort((a, b) => b.completed - a.completed);

  const revenueByDay = new Map(perDayRevenue.map((r) => [r._id, r.total]));
  const days = perDayTokens.map((d) => ({ date: d._id, tokens: d.total, completed: d.completed, revenue: revenueByDay.get(d._id) ?? 0 }));
  // Include payment-only days (payment recorded on a later day than the service).
  for (const [date, revenue] of revenueByDay) if (!days.some((d) => d.date === date)) days.push({ date, tokens: 0, completed: 0, revenue });
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    from,
    to,
    currency: 'PKR',
    totalTokens: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byStatus,
    bySource,
    popularServices: byServiceRaw.map((r) => ({ name: r._id, completed: r.n })),
    byBarber,
    revenue: { total: paymentTotals[0]?.total ?? 0, paymentsCount: paymentTotals[0]?.count ?? 0 },
    completedUnpaid: unpaid.count,
    /** Booked price of completed services in this period that have not been paid (never part of revenue). */
    completedUnpaidAmount: unpaid.amount,
    days,
  };
}
