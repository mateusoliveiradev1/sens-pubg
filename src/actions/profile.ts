/**
 * Profile Server Actions — Salvar e atualizar perfil do jogador.
 * Validação Zod em todas as entradas.
 */

'use server';

import { db } from '@/db';
import { playerProfiles, analysisSessions, sessions as authSessions, users } from '@/db/schema';
import { auth } from '@/auth';
import { playerProfileSchema } from '@/types/schemas';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface ProfileActionResult {
    readonly success: boolean;
    readonly error?: string;
}

import { authActionClient } from '@/lib/safe-action';

export const saveProfile = authActionClient
    .schema(playerProfileSchema)
    .action(async ({ parsedInput: data, ctx: { session } }) => {
        if (!session?.user?.id) {
            throw new Error('Você precisa estar logado para salvar o perfil.');
        }

        try {
            // Check if profile exists
            const existing = await db
                .select({ id: playerProfiles.id })
                .from(playerProfiles)
                .where(eq(playerProfiles.userId, session.user.id))
                .limit(1);

            const profileData = {
                userId: session.user.id,
                mouseModel: data.mouse.model,
                mouseSensor: data.mouse.sensor,
                mouseDpi: data.mouse.dpi,
                mousePollingRate: data.mouse.pollingRate,
                mouseWeight: data.mouse.weightGrams,
                mouseLod: data.mouse.liftOffDistance,
                mousepadModel: data.mousepad.model,
                mousepadWidth: data.mousepad.widthCm,
                mousepadHeight: data.mousepad.heightCm,
                mousepadType: data.mousepad.type,
                mousepadMaterial: data.mousepad.material,
                gripStyle: data.gripStyle,
                playStyle: data.playStyle,
                monitorResolution: data.monitor.resolution,
                monitorRefreshRate: data.monitor.refreshRate,
                monitorPanel: data.monitor.panelType,
                generalSens: data.pubgSettings.generalSens,
                adsSens: data.pubgSettings.adsSens,
                scopeSens: data.pubgSettings.scopeSens,
                fov: data.pubgSettings.fov,
                verticalMultiplier: data.pubgSettings.verticalMultiplier,
                mouseAcceleration: data.pubgSettings.mouseAcceleration,
                armLength: data.physical.armLength,
                deskSpace: data.physical.deskSpaceCm,
                bio: data.identity?.bio ?? null,
                twitter: data.identity?.twitter ?? null,
                twitch: data.identity?.twitch ?? null,
                updatedAt: new Date(),
            };

            if (existing[0]) {
                await db
                    .update(playerProfiles)
                    .set(profileData)
                    .where(eq(playerProfiles.userId, session.user.id));
            } else {
                await db.insert(playerProfiles).values(profileData);
            }

            revalidatePath('/profile');
            return { success: true };
        } catch (err) {
            console.error('[saveProfile] CRITICAL ERROR:', err);
            // If it's a database error, Drizzle/Postgres usually has a detailed message
            let detail = 'Unknown error';
            if (err instanceof Error) {
                const dbError = err as Error & { detail?: string };
                detail = dbError.detail || err.message;
            }
            throw new Error(`Erro ao salvar no banco: ${detail}`);
        }
    });

export async function getProfile() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const result = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        with: {
            profile: true,
        }
    });

    return result ?? null;
}

export async function deleteUserAccount(): Promise<ProfileActionResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Você precisa estar logado para realizar esta ação.' };
    }

    try {
        const userId = session.user.id;

        // Execute sequentially to respect foreign constraints or lack thereof.
        // First delete analysis sessions
        await db.delete(analysisSessions).where(eq(analysisSessions.userId, userId));

        // Then delete the player profile
        await db.delete(playerProfiles).where(eq(playerProfiles.userId, userId));

        // Ensure any Auth.js sessions attached to this user are terminated
        await db.delete(authSessions).where(eq(authSessions.userId, userId));

        // Finally delete the Auth.js core user object
        await db.delete(users).where(eq(users.id, userId));

        return { success: true };
    } catch (err) {
        console.error('[deleteUserAccount] Error:', err);
        return { success: false, error: 'Falha crítica ao deletar conta. Contate o suporte.' };
    }
}
