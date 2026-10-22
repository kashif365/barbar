import { Service } from './Service';
import { User } from './User';
import { Customer } from './Customer';
import { Token } from './Token';
import { DailyCounter } from './DailyCounter';
import { AuditLog } from './AuditLog';
import { Setting } from './Setting';

export { Service, User, Customer, Token, DailyCounter, AuditLog, Setting };

/** Build all indexes (unique constraints are part of the correctness story, so wait for them). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([Service, User, Customer, Token, DailyCounter, AuditLog, Setting].map((m) => m.init()));
}
