import { db } from '../db/client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'APPROVE'
  | 'REJECT';

export type AuditEntityType =
  | 'Composition'
  | 'Page'
  | 'Tag'
  | 'Media'
  | 'User'
  | 'ModerationQueue'
  | 'CorrectionSuggestion';

export interface RecordAuditLogInput {
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Records an immutable audit trail entry for an admin/editorial action.
 *
 * This is intentionally best-effort and non-throwing: a failure to write an
 * audit log entry must never block or roll back the underlying business
 * transaction it is documenting. Failures are logged loudly so they can be
 * investigated, per the project's observability requirements.
 *
 * When called inside a Prisma `$transaction`, pass the transaction client as
 * `client` so the audit entry is committed atomically with the change it
 * describes.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  client?: any
): Promise<void> {
  try {
    const target = client?.auditLog ?? (db as any)?.auditLog;
    if (target?.create) {
      await target.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before !== undefined ? JSON.stringify(input.before) : null,
        after: input.after !== undefined ? JSON.stringify(input.after) : null,
        metadata: input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
      },
    });
    } else {
      console.log(`[Audit] ${input.action} ${input.entityType}:${input.entityId} by actor:${input.actorId ?? 'system'}`);
    }
  } catch (err) {
    console.error(
      `🔴 [Audit] Failed to record audit log for ${input.action} ${input.entityType}:${input.entityId}`,
      err
    );
  }
}
