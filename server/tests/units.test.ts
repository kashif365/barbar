import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, canTransition } from '../src/services/queueActions';
import { businessDateOf, formatTokenNumber, localMinutesOfDay, parseHHmm } from '../src/utils/time';

describe('business date (Asia/Karachi, UTC+5)', () => {
  it('rolls over at local midnight, not UTC midnight', () => {
    expect(businessDateOf(new Date('2026-10-17T18:59:59Z'))).toBe('2026-10-17');
    expect(businessDateOf(new Date('2026-10-17T19:00:00Z'))).toBe('2026-10-18');
    expect(businessDateOf(new Date('2026-10-17T23:30:00Z'))).toBe('2026-10-18'); // 04:30 PKT next day
  });

  it('computes minutes since local midnight in salon time', () => {
    expect(localMinutesOfDay(new Date('2026-10-17T19:30:00Z'))).toBe(30); // 00:30 PKT
    expect(localMinutesOfDay(new Date('2026-10-17T04:00:00Z'))).toBe(9 * 60); // 09:00 PKT
  });

  it('parses HH:mm opening hours strictly', () => {
    expect(parseHHmm('09:30')).toBe(570);
    expect(parseHHmm('25:00')).toBeNull();
    expect(parseHHmm('9:30')).toBeNull();
    expect(parseHHmm(null)).toBeNull();
  });
});

describe('token number format', () => {
  it('zero-pads to three digits and grows past 999', () => {
    expect(formatTokenNumber(1)).toBe('A-001');
    expect(formatTokenNumber(42)).toBe('A-042');
    expect(formatTokenNumber(1000)).toBe('A-1000');
  });
});

describe('status transition policy', () => {
  it('allows the documented transitions', () => {
    expect(canTransition('waiting', 'in_service')).toBe(true);
    expect(canTransition('waiting', 'skipped')).toBe(true);
    expect(canTransition('waiting', 'cancelled')).toBe(true);
    expect(canTransition('in_service', 'completed')).toBe(true);
    expect(canTransition('skipped', 'waiting')).toBe(true);
  });

  it('forbids skipping steps and reopening finished tokens', () => {
    expect(canTransition('waiting', 'completed')).toBe(false);
    expect(canTransition('completed', 'waiting')).toBe(false);
    expect(canTransition('cancelled', 'waiting')).toBe(false);
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });
});
