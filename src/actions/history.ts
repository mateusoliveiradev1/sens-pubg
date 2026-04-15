'use server';

import { eq, sql } from 'drizzle-orm';

import { auth } from '@/auth';
import { enrichAnalysisResultCoaching } from '@/core/analysis-result-coach-enrichment';
import { db } from '@/db';
import { analysisSessions, playerProfiles, sensitivityHistory, weaponProfiles } from '@/db/schema';
import { normalizePatchVersion } from '@/game/pubg';
import { createGroqCoachClient } from '@/server/coach/groq-coach-client';
import type { AnalysisResult } from '@/types/engine';

export async function saveAnalysisResult(
    result: AnalysisResult,
    weaponId: string,
    scopeId: string,
    distance: number
) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Nao autenticado.');
    }

    let enrichedResult = result;

    try {
        const profile = await db
            .select({ id: playerProfiles.id })
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, session.user.id))
            .limit(1);

        if (!profile[0]) {
            throw new Error('Perfil incompleto.');
        }

        enrichedResult = await enrichAnalysisResultCoaching(
            result,
            createGroqCoachClient()
        );

        const metrics = enrichedResult.metrics;
        const diagnoses = enrichedResult.diagnoses.map((diagnosis) => diagnosis.type);
        const patchVersion = normalizePatchVersion(enrichedResult.patchVersion);

        const insertedSession = await db.insert(analysisSessions).values({
            userId: session.user.id,
            weaponId,
            scopeId,
            patchVersion,
            distance,
            stance: enrichedResult.loadout.stance,
            attachments: {
                muzzle: enrichedResult.loadout.muzzle,
                grip: enrichedResult.loadout.grip,
                stock: enrichedResult.loadout.stock,
            },
            stabilityScore: metrics.stabilityScore,
            verticalControl: metrics.verticalControlIndex,
            horizontalNoise: metrics.horizontalNoiseIndex,
            recoilResponseMs: metrics.initialRecoilResponseMs,
            driftBias: metrics.driftDirectionBias,
            consistencyScore: metrics.consistencyScore,
            sprayScore: metrics.sprayScore || 0,
            diagnoses,
            coachingData: enrichedResult.coaching as unknown as Record<string, unknown>[],
            fullResult: {
                ...enrichedResult,
                patchVersion,
            } as unknown as Record<string, unknown>,
        }).returning({ id: analysisSessions.id });

        const sessionId = insertedSession[0]!.id;

        const historyRows = enrichedResult.sensitivity.profiles.map((profileItem) => ({
            userId: session.user.id,
            sessionId,
            profileType: profileItem.type,
            generalSens: profileItem.general as number,
            adsSens: profileItem.ads as number,
            scopeSens: Array.isArray(profileItem.scopes)
                ? profileItem.scopes.reduce(
                    (accumulator: Record<string, number>, scope) => ({
                        ...accumulator,
                        [scope.scopeName]: scope.recommended as number,
                    }),
                    {}
                )
                : profileItem.scopes,
            applied: profileItem.type === enrichedResult.sensitivity.recommended,
        }));

        await db.insert(sensitivityHistory).values(historyRows);

        return { success: true as const, sessionId, result: enrichedResult };
    } catch (err) {
        console.error('[saveAnalysisResult] Error:', err);
        return {
            success: false as const,
            error: 'Erro ao salvar historico.',
            result: enrichedResult,
        };
    }
}

export async function getHistorySessions() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const result = await db
            .select({
                id: analysisSessions.id,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                patchVersion: analysisSessions.patchVersion,
                stabilityScore: analysisSessions.stabilityScore,
                verticalControl: analysisSessions.verticalControl,
                horizontalNoise: analysisSessions.horizontalNoise,
                createdAt: analysisSessions.createdAt,
                weaponName: weaponProfiles.name,
                weaponCategory: weaponProfiles.category,
            })
            .from(analysisSessions)
            .leftJoin(
                weaponProfiles,
                sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
            )
            .where(eq(analysisSessions.userId, session.user.id))
            .orderBy(analysisSessions.createdAt);

        return result;
    } catch (err) {
        console.error('[getHistorySessions] Error:', err);
        return [];
    }
}
