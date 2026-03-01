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
            stance: result.loadout.stance,
            attachments: {
                muzzle: result.loadout.muzzle,
                grip: result.loadout.grip,
                stock: result.loadout.stock,
            },
            stabilityScore: metrics.stabilityScore,
            verticalControl: metrics.verticalControlIndex,
            horizontalNoise: metrics.horizontalNoiseIndex,
            recoilResponseMs: metrics.initialRecoilResponseMs,
            driftBias: metrics.driftDirectionBias,
            consistencyScore: metrics.consistencyScore,
            sprayScore: metrics.sprayScore || 0,
            diagnoses,
            // Only keeping limited JSON to avoid large payloads if needed, but we can store everything
            coachingData: result.coaching as unknown as Record<string, unknown>[],
            fullResult: result as unknown as Record<string, unknown>, // Save the entire diagnostic payload for 1:1 identical historic viewing
        }).returning({ id: analysisSessions.id });

        const sessionId = insertedSession[0]!.id;

        // 2. Insert sensitivity history for each recommended profile
        const historyRows = result.sensitivity.profiles.map(p => ({
            userId: session.user!.id!,
            sessionId: sessionId,
            profileType: p.type,
            generalSens: p.general as number,
            adsSens: p.ads as number,
            scopeSens: Array.isArray(p.scopes)
                ? p.scopes.reduce((acc: Record<string, number>, s) => ({ ...acc, [s.scopeName]: s.recommended as number }), {})
                : p.scopes,
            applied: p.type === result.sensitivity.recommended, // mark recommended as auto-applied conceptually
        }));

        await db.insert(sensitivityHistory).values(historyRows);

        return { success: true, sessionId };
    } catch (err) {
        console.error('[saveAnalysisResult] Error:', err);
        return { success: false, error: 'Erro ao salvar histórico.' };
    }
}

export async function getHistorySessions() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const result = await db
            .select({
                id: analysisSessions.id,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                stabilityScore: analysisSessions.stabilityScore,
                verticalControl: analysisSessions.verticalControl,
                horizontalNoise: analysisSessions.horizontalNoise,
                createdAt: analysisSessions.createdAt,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, session.user.id))
            .orderBy(analysisSessions.createdAt);

        return result;
    } catch (err) {
        console.error('[getHistorySessions] Error:', err);
        return [];
    }
}
