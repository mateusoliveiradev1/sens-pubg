'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: string) {
    const session = await auth();

    // Safety check: Only admins can change roles
    if (session?.user?.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change roles');
    }

    try {
        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, userId));

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to update user role:', error);
        return { success: false, error: 'Failed to update role' };
    }
}
