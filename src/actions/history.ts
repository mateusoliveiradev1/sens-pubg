'use server';

import { eq, sql } from 'drizzle-orm';

import { auth } from '@/auth';
import { enrichAnalysisResultCoaching } from '@/core/analysis-result-coach-enrichment';
import {
    applySensitivityHistoryConvergence,
    type HistoricalSensitivitySignal,
} from '@/core/sensitivity-history-convergence';
import { db } from '@/db';
import { analysisSessions, playerProfiles, sensitivityHistory, weaponProfiles } from '@/db/schema';
import { normalizePatchVersion } from '@/game/pubg';
import { createGroqCoachClient } from '@/server/coach/groq-coach-client';
import type {
    AnalysisResult,
    RecommendationEvidenceTier,
    SensitivityRecommendationTier,
} from '@/types/engine';

interface StoredHistoryAttachments {
    readonly muzzle: string;
    readonly grip: string;
    readonly stock: string;
}

interface StoredSensitivityHistorySession {
    readonly id: string;
    readonly createdAt: Date;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly patchVersion: string;
    readonly distance: number;
    readonly stance: string;
    readonly attachments: StoredHistoryAttachments;
    readonly fullResult: Record<string, unknown> | null;
}

function normalizeStoredAttachments(
    value: unknown,
): StoredHistoryAttachments {
    const attachments = value && typeof value === 'object'
        ? value as Partial<StoredHistoryAttachments>
        : {};

    return {
        muzzle: typeof attachments.muzzle === 'string' ? attachments.muzzle : 'none',
        grip: typeof attachments.grip === 'string' ? attachments.grip : 'none',
        stock: typeof attachments.stock === 'string' ? attachments.stock : 'none',
    };
}

function resolveHistoryDistanceTolerance(distanceMeters: number): number {
    if (distanceMeters <= 35) {
        return 10;
    }

    if (distanceMeters <= 80) {
        return 15;
    }

    return 25;
}

function normalizeHistoryEvidenceTier(value: unknown): RecommendationEvidenceTier {
    return value === 'strong' || value === 'moderate' || value === 'weak'
        ? value
        : 'moderate';
}

function normalizeHistoryTier(
    value: unknown,
    evidenceTier: RecommendationEvidenceTier,
    confidenceScore: number,
    clipCount: number,
): SensitivityRecommendationTier {
    if (value === 'capture_again' || value === 'test_profiles' || value === 'apply_ready') {
        return value;
    }

    if (evidenceTier === 'weak' || confidenceScore < 0.58) {
        return 'capture_again';
    }

    if (evidenceTier === 'strong' && confidenceScore >= 0.8 && clipCount >= 3) {
        return 'apply_ready';
    }

    return 'test_profiles';
}

function extractHistoricalSensitivitySignal(
    session: StoredSensitivityHistorySession,
): HistoricalSensitivitySignal | null {
    const fullResult = session.fullResult;
    const sensitivity = fullResult?.sensitivity;

    if (!sensitivity || typeof sensitivity !== 'object') {
        return null;
    }

    const storedSensitivity = sensitivity as Record<string, unknown>;
    const recommendedProfile = storedSensitivity.recommended;
    if (recommendedProfile !== 'low' && recommendedProfile !== 'balanced' && recommendedProfile !== 'high') {
        return null;
    }

    const confidenceScore = typeof storedSensitivity.confidenceScore === 'number'
        ? storedSensitivity.confidenceScore
        : 0.5;
    const evidenceTier = normalizeHistoryEvidenceTier(storedSensitivity.evidenceTier);
    const clipCount = Array.isArray(fullResult?.subSessions)
        ? fullResult.subSessions.length
        : 1;

    return {
        sessionId: session.id,
        createdAt: session.createdAt,
        recommendedProfile,
        tier: normalizeHistoryTier(storedSensitivity.tier, evidenceTier, confidenceScore, clipCount),
        evidenceTier,
        confidenceScore,
    };
}

function enrichResultWithSensitivityHistory(
    result: AnalysisResult,
    distance: number,
    historySessions: readonly StoredSensitivityHistorySession[],
): AnalysisResult {
    const distanceTolerance = resolveHistoryDistanceTolerance(distance);
    const compatibleSignals = historySessions
        .filter((session) => {
            const attachments = normalizeStoredAttachments(session.attachments);

            return session.stance === result.loadout.stance
                && attachments.muzzle === result.loadout.muzzle
                && attachments.grip === result.loadout.grip
                && attachments.stock === result.loadout.stock
                && Math.abs(session.distance - distance) <= distanceTolerance;
        })
        .map(extractHistoricalSensitivitySignal)
        .filter((signal): signal is HistoricalSensitivitySignal => signal !== null);

    if (compatibleSignals.length === 0) {
        return result;
    }

    return {
        ...result,
        sensitivity: applySensitivityHistoryConvergence(result.sensitivity, compatibleSignals),
    };
}

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
        const patchVersion = normalizePatchVersion(result.patchVersion);
        const profile = await db
            .select({ id: playerProfiles.id })
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, session.user.id))
            .limit(1);

        if (!profile[0]) {
            throw new Error('Perfil incompleto.');
        }

        const priorSessions = await db
            .select({
                id: analysisSessions.id,
                createdAt: analysisSessions.createdAt,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                patchVersion: analysisSessions.patchVersion,
                distance: analysisSessions.distance,
                stance: analysisSessions.stance,
                attachments: analysisSessions.attachments,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, session.user.id))
            .limit(12) as StoredSensitivityHistorySession[];

        const resultWithHistory = enrichResultWithSensitivityHistory(
            {
                ...result,
                patchVersion,
            },
            distance,
            priorSessions.filter((storedSession) => (
                storedSession.fullResult !== null
                && storedSession.patchVersion === patchVersion
                && storedSession.weaponId === weaponId
                && storedSession.scopeId === scopeId
            )),
        );

        enrichedResult = await enrichAnalysisResultCoaching(
            resultWithHistory,
            createGroqCoachClient()
        );

        const metrics = enrichedResult.metrics;
        const diagnoses = enrichedResult.diagnoses.map((diagnosis) => diagnosis.type);

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
                videoQualityReport: enrichedResult.videoQualityReport,
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
