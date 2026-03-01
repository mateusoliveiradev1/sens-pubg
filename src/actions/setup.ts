'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { setupWizardSchema } from '@/types/schemas';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';

export const updateUserSetup = authActionClient
    .schema(setupWizardSchema)
    .action(async ({ parsedInput: data, ctx: { session } }) => {
        const userId = session.user?.id;
        if (!userId) {
            throw new Error('Não autorizado');
        }

        try {
            await db
                .update(users)
                .set({
                    fov: data.fov,
                    resolution: data.resolution,
                    mouseDpi: data.mouseDpi,
                    sensGeneral: data.sensGeneral,
                    sens1x: data.sens1x,
                    sens3x: data.sens3x,
                    sens4x: data.sens4x,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));

            revalidatePath('/');
            revalidatePath('/setup');
            revalidatePath('/dashboard');

            return { success: true };
        } catch (error) {
            console.error('[updateUserSetup] Error:', error);
            throw new Error('Falha ao atualizar configurações de setup.');
        }
    });
