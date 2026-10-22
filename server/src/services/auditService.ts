import { AuditLog } from '../models';
import type { UserDoc } from '../models/User';

/** Records important administrative actions. Failure to log must never fail the action itself. */
export async function audit(
  actor: UserDoc,
  action: string,
  entityType: string,
  entityId: unknown,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await AuditLog.create({ actorId: actor._id, actorName: actor.name, action, entityType, entityId: String(entityId), meta });
  } catch (e) {
    console.error('audit log write failed', e instanceof Error ? e.message : e);
  }
}
