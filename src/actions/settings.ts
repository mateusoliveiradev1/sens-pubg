'use server';

import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { auth } from '@/auth';
import { recordAuditLog } from '@/db/audit-log';
import { revalidatePath } from 'next/cache';

export async function toggleMaintenanceMode(enabled: boolean) {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    try {
        await db.insert(systemSettings)
            .values({
                key: 'maintenance_mode',
                value: { enabled },
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: {
                    value: { enabled },
                    updatedAt: new Date(),
                },
            });

        await recordAuditLog(
            'TOGGLE_MAINTENANCE',
            'global',
            { enabled }
        );

        revalidatePath('/admin/settings');
        revalidatePath('/'); // Revalidate root to apply middleware change if cached
        return { success: true };
    } catch (_error) {
        console.error('Failed to toggle maintenance mode:', _error);
        return { success: false };
    }
}
