'use server';

import { db } from '@/db';
import { analysisSessions, sensitivityHistory, playerProfiles } from '@/db/schema';
import { auth } from '@/auth';
import type { AnalysisResult } from '@/types/engine';
import { eq } from 'drizzle-orm';

export async function saveAnalysisResult(
    result: AnalysisResult,
    weaponId: string,
    scopeId: string,
    distance: number
) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Não autenticado.');
    }

    try {
        // Enforce user has a profile
        const profile = await db
            .select({ id: playerProfiles.id })
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, session.user.id))
            .limit(1);

        if (!profile[0]) {
            throw new Error('Perfil incompleto.');
        }

        const metrics = result.metrics;
        const diagnoses = result.diagnoses.map(d => d.type);

        // 1. Insert the session
        const insertedSession = await db.insert(analysisSessions).values({
            userId: session.user.id,
            weaponId,
            scopeId,
            distance,
            stabilityScore: metrics.stabilityScore,
            verticalControl: metrics.verticalControlIndex,
            horizontalNoise: metrics.horizontalNoiseIndex,
            recoilResponseMs: metrics.initialRecoilResponseMs,
            driftBias: metrics.driftDirectionBias,
            consistencyScore: metrics.consistencyScore,
            diagnoses,
            // Only keeping limited JSON to avoid large payloads if needed, but we can store everything
            coachingData: result.coaching as unknown as Record<string, unknown>[],
        }).returning({ id: analysisSessions.id });

        const sessionId = insertedSession[0]!.id;

        // 2. Insert sensitivity history for each recommended profile
        const historyRows = result.sensitivity.profiles.map(p => ({
            userId: session.user!.id!,
            sessionId: sessionId,
            profileType: p.type,
            generalSens: (p.general as any).value ?? p.general,
            adsSens: (p.ads as any).value ?? p.ads,
            scopeSens: Array.isArray(p.scopes) ? p.scopes.reduce((acc: any, s: any) => ({ ...acc, [s.scopeId]: s.value }), {}) : p.scopes,
            applied: p.type === result.sensitivity.recommended, // mark recommended as auto-applied conceptually
        }));

        await db.insert(sensitivityHistory).values(historyRows);

        return { success: true, sessionId };
    } catch (err) {
        console.error('[saveAnalysisResult] Error:', err);
        return { success: false, error: 'Erro ao salvar histórico.' };
    }
}
