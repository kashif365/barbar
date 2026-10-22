import { Service } from './Service';
import { User } from './User';
import { Customer } from './Customer';
import { Token } from './Token';
import { DailyCounter } from './DailyCounter';
import { Payment } from './Payment';
import { AuditLog } from './AuditLog';
import { Setting } from './Setting';

export { Service, User, Customer, Token, DailyCounter, Payment, AuditLog, Setting };

/** Build all indexes (unique constraints are part of the correctness story, so wait for them). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([Service, User, Customer, Token, DailyCounter, Payment, AuditLog, Setting].map((m) => m.init()));
}
