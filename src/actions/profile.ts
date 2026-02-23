/**
 * Profile Server Actions — Salvar e atualizar perfil do jogador.
 * Validação Zod em todas as entradas.
 */

'use server';

import { db } from '@/db';
import { playerProfiles } from '@/db/schema';
import { auth } from '@/auth';
import { playerProfileSchema } from '@/types/schemas';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface ProfileActionResult {
    readonly success: boolean;
    readonly error?: string;
}

export async function saveProfile(
    formData: unknown
): Promise<ProfileActionResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Você precisa estar logado para salvar o perfil.' };
    }

    const parsed = playerProfileSchema.safeParse(formData);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return {
            success: false,
            error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Dados inválidos',
        };
    }

    const data = parsed.data;

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
        console.error('[saveProfile] Error:', err);
        return { success: false, error: 'Erro ao salvar o perfil. Tente novamente.' };
    }
}

export async function getProfile(): Promise<typeof playerProfiles.$inferSelect | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const results = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, session.user.id))
        .limit(1);

    return results[0] ?? null;
}
