import { db } from './index';
import { auditLogs } from './schema';
import { auth } from '@/auth';

export type AuditAction =
    | 'CHANGE_ROLE'
    | 'TOGGLE_MAINTENANCE'
    | 'DELETE_ANALYSIS'
    | 'EXPORT_DATA'
    | 'BOT_HEARTBEAT';

/**
 * Records an administrative action in the audit_logs table.
 * Must be called from a Server Action or Route Handler with an active session.
 */
export async function recordAuditLog(
    action: AuditAction,
    target?: string,
    details?: Record<string, unknown>
) {
    try {
        const session = await auth();
        const adminId = session?.user?.id;

        if (!adminId) {
            console.error('[AuditLog] No admin ID found in session.');
            return;
        }

        await db.insert(auditLogs).values({
            adminId,
            action,
            target: target ?? null,
            details: details ?? null,
        });
    } catch (error) {
        console.error('[AuditLog] Failed to record log:', error);
    }
}
