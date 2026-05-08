'use server';

import { db } from '@/db';
import { playerProfiles, users } from '@/db/schema';
import { setupWizardSchema } from '@/types/schemas';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '@/lib/safe-action';
import {
    buildPlayerProfilePersistenceData,
    buildUserSetupPersistenceData,
} from '@/lib/player-profile-persistence';

export const updateUserSetup = authActionClient
    .schema(setupWizardSchema)
    .action(async ({ parsedInput: data, ctx: { session } }) => {
        const userId = session.user?.id;
        if (!userId) {
            throw new Error('Nao autorizado');
        }

        try {
            const profileData = buildPlayerProfilePersistenceData(userId, data);
            const userSetupData = buildUserSetupPersistenceData(data);
            const existingProfile = await db
                .select({ id: playerProfiles.id })
                .from(playerProfiles)
                .where(eq(playerProfiles.userId, userId))
                .limit(1);

            await db
                .update(users)
                .set(userSetupData)
                .where(eq(users.id, userId));

            if (existingProfile[0]) {
                await db
                    .update(playerProfiles)
                    .set(profileData)
                    .where(eq(playerProfiles.userId, userId));
            } else {
                await db.insert(playerProfiles).values(profileData);
            }

            revalidatePath('/');
            revalidatePath('/setup');
            revalidatePath('/profile');
            revalidatePath('/profile/settings');
            revalidatePath('/analyze');
            revalidatePath('/dashboard');

            return { success: true };
        } catch (error) {
            console.error('[updateUserSetup] Error:', error);
            throw new Error('Falha ao atualizar configuracoes de setup.');
        }
    });
