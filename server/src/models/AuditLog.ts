import { Schema, model, Types } from 'mongoose';

export interface IAuditLog {
  actorId: Types.ObjectId;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: Date;
}

const auditSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditSchema);
