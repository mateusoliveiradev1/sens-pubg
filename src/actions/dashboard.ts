'use server';

import { db } from '@/db';
import { analysisSessions, coachProtocolOutcomes, precisionEvolutionLines, weaponProfiles, weaponRegistry } from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql, gte, and, desc } from 'drizzle-orm';
import { hydrateAnalysisResultFromHistory } from '@/app/history/analysis-result-hydration';
import { buildDashboardActiveCoachLoop, type DashboardActiveCoachLoop } from './dashboard-active-coach-loop';
import type {
    AnalysisResult,
    CoachDecisionTier,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    SprayActionState,
    SprayMastery,
} from '@/types/engine';

export type DashboardTrendEvidenceState = 'strong' | 'moderate' | 'weak' | 'missing';

export interface DashboardLatestMastery {
    readonly actionState: SprayActionState;
    readonly actionLabel: string;
    readonly actionableScore: number;
    readonly mechanicalScore: number;
    readonly mechanicalLevelLabel: string;
    readonly pillars: SprayMastery['pillars'];
    readonly evidence: SprayMastery['evidence'];
    readonly reasons: readonly string[];
    readonly blockedRecommendations: readonly string[];
    readonly weaponId: string;
    readonly patchVersion: string;
    readonly createdAt: string;
}

export interface DashboardLatestCoachNextBlock {
    readonly tier: CoachDecisionTier;
    readonly title: string;
    readonly durationMinutes: number;
    readonly steps: readonly string[];
    readonly validationTarget: string | null;
    readonly validationSuccessCondition: string | null;
}

export interface DashboardTrendEvidence {
    readonly evidenceState: DashboardTrendEvidenceState;
    readonly coverage: number;
    readonly confidence: number;
    readonly sampleSize: number;
    readonly sessionCount: number;
    readonly delta: number;
    readonly canClaimProgress: boolean;
}

export interface DashboardPrincipalPrecisionTrend {
    readonly label: PrecisionTrendLabel;
    readonly compatibleCount: number;
    readonly evidenceLevel: PrecisionTrendSummary['evidenceLevel'];
    readonly coverage: number;
    readonly confidence: number;
    readonly actionableDelta: number | null;
    readonly nextValidationHint: string;
    readonly blockerReasons: readonly string[];
    readonly updatedAt: string;
}

export interface DashboardStats {
    totalSessions: number;
    avgStabilityScore: number;
    bestStabilityScore: number;
    avgSprayScore: number;
    bestSprayScore: number;
    lastSessionDelta: number; // diff between last 2 sessions
    weeklyTrend: { date: string; avgScore: number; peakScore: number }[];
    weaponStats: { weaponId: string; weaponName: string; weaponCategory: string | null; avgScore: number; count: number }[];
    latestMastery: DashboardLatestMastery | null;
    latestCoachNextBlock: DashboardLatestCoachNextBlock | null;
    trendEvidence: DashboardTrendEvidence;
    principalPrecisionTrend: DashboardPrincipalPrecisionTrend | null;
    activeCoachLoop: DashboardActiveCoachLoop | null;
}

interface RecentTruthSession {
    readonly id: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly patchVersion: string;
    readonly distance: number;
    readonly createdAt: Date;
    readonly sprayScore: number;
    readonly fullResult: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hydrateRecentSession(row: RecentTruthSession): AnalysisResult | null {
    if (!isRecord(row.fullResult)) {
        return null;
    }

    try {
        return hydrateAnalysisResultFromHistory({
            fullResult: row.fullResult,
            recordPatchVersion: row.patchVersion,
            scopeId: row.scopeId,
            distanceMeters: row.distance,
        });
    } catch {
        return null;
    }
}

function buildLatestMastery(
    row: RecentTruthSession,
    result: AnalysisResult,
): DashboardLatestMastery | null {
    if (!result.mastery) {
        return null;
    }

    return {
        actionState: result.mastery.actionState,
        actionLabel: result.mastery.actionLabel,
        actionableScore: result.mastery.actionableScore,
        mechanicalScore: result.mastery.mechanicalScore,
        mechanicalLevelLabel: result.mastery.mechanicalLevelLabel,
        pillars: result.mastery.pillars,
        evidence: result.mastery.evidence,
        reasons: result.mastery.reasons,
        blockedRecommendations: result.mastery.blockedRecommendations,
        weaponId: row.weaponId,
        patchVersion: row.patchVersion,
        createdAt: row.createdAt.toISOString(),
    };
}

function buildLatestCoachNextBlock(result: AnalysisResult | null): DashboardLatestCoachNextBlock | null {
    const coachPlan = result?.coachPlan;
    const nextBlock = coachPlan?.nextBlock;
    const validation = nextBlock?.checks[0];

    if (!coachPlan || !nextBlock) {
        return null;
    }

    return {
        tier: coachPlan.tier,
        title: nextBlock.title,
        durationMinutes: nextBlock.durationMinutes,
        steps: nextBlock.steps.slice(0, 3),
        validationTarget: validation?.target ?? null,
        validationSuccessCondition: validation?.successCondition ?? null,
    };
}

function resolveTrendEvidenceState(input: {
    readonly coverage: number;
    readonly confidence: number;
    readonly sessionCount: number;
}): DashboardTrendEvidenceState {
    if (input.sessionCount === 0) {
        return 'missing';
    }

    if (input.sessionCount >= 2 && input.coverage >= 0.8 && input.confidence >= 0.8) {
        return 'strong';
    }

    if (input.sessionCount >= 2 && input.coverage >= 0.6 && input.confidence >= 0.6) {
        return 'moderate';
    }

    return 'weak';
}

function buildTrendEvidence(
    recentRows: readonly RecentTruthSession[],
    hydratedResults: readonly (AnalysisResult | null)[],
    fallbackDelta: number,
): DashboardTrendEvidence {
    const masterySamples = hydratedResults
        .map((result) => result?.mastery)
        .filter((mastery): mastery is SprayMastery => Boolean(mastery))
        .slice(0, 6);

    if (masterySamples.length === 0) {
        return {
            evidenceState: 'missing',
            coverage: 0,
            confidence: 0,
            sampleSize: 0,
            sessionCount: 0,
            delta: fallbackDelta,
            canClaimProgress: false,
        };
    }

    const coverage = masterySamples.reduce((sum, mastery) => sum + mastery.evidence.coverage, 0) / masterySamples.length;
    const confidence = masterySamples.reduce((sum, mastery) => sum + mastery.evidence.confidence, 0) / masterySamples.length;
    const sampleSize = masterySamples.reduce((sum, mastery) => sum + mastery.evidence.sampleSize, 0);
    const delta = recentRows.length >= 2
        ? Number(recentRows[0]!.sprayScore) - Number(recentRows[1]!.sprayScore)
        : fallbackDelta;
    const evidenceState = resolveTrendEvidenceState({
        coverage,
        confidence,
        sessionCount: masterySamples.length,
    });

    return {
        evidenceState,
        coverage,
        confidence,
        sampleSize,
        sessionCount: masterySamples.length,
        delta,
        canClaimProgress: delta > 0 && (evidenceState === 'strong' || evidenceState === 'moderate'),
    };
}

function isPrecisionTrendSummary(value: unknown): value is PrecisionTrendSummary {
    return isRecord(value)
        && typeof value.label === 'string'
        && typeof value.compatibleCount === 'number'
        && typeof value.nextValidationHint === 'string';
}

function buildPrincipalPrecisionTrend(
    trend: PrecisionTrendSummary | null,
    updatedAt: Date | string | null,
): DashboardPrincipalPrecisionTrend | null {
    if (!trend) {
        return null;
    }

    return {
        label: trend.label,
        compatibleCount: trend.compatibleCount,
        evidenceLevel: trend.evidenceLevel,
        coverage: trend.coverage,
        confidence: trend.confidence,
        actionableDelta: trend.actionableDelta?.delta ?? null,
        nextValidationHint: trend.nextValidationHint,
        blockerReasons: Array.from(new Set([
            ...trend.blockerSummaries.map((summary) => summary.message),
            ...trend.blockedClips.flatMap((clip) => clip.blockers.map((blocker) => blocker.message)),
        ].filter((message) => message.trim().length > 0))),
        updatedAt: updatedAt instanceof Date
            ? updatedAt.toISOString()
            : updatedAt ?? new Date().toISOString(),
    };
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // 1. Basic Stats — use COALESCE to fallback sprayScore → stabilityScore
        const scoreExpr = sql`COALESCE(NULLIF(${analysisSessions.sprayScore}, 0), ${analysisSessions.stabilityScore}::integer, 0)`;

        const basicStats = await db
            .select({
                count: sql<number>`count(*)`,
                avgScore: sql<number>`ROUND(avg(${analysisSessions.stabilityScore}))`,
                maxScore: sql<number>`ROUND(max(${analysisSessions.stabilityScore}))`,
                avgSpray: sql<number>`ROUND(avg(${scoreExpr}))`,
                maxSpray: sql<number>`ROUND(max(${scoreExpr}))`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId));

        // 2. Last 2 sessions for delta calculation
        const lastTwo = await db
            .select({
                score: sql<number>`${scoreExpr}`,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId))
            .orderBy(desc(analysisSessions.createdAt))
            .limit(2);

        const delta = lastTwo.length >= 2
            ? Number(lastTwo[0]!.score) - Number(lastTwo[1]!.score)
            : 0;

        // 3. Daily Trend (30 days) — avg + peak per day
        const trend = await db
            .select({
                date: sql<string>`DATE(${analysisSessions.createdAt})`,
                avgScore: sql<number>`ROUND(avg(${scoreExpr}))`,
                peakScore: sql<number>`ROUND(max(${scoreExpr}))`,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.userId, userId),
                    gte(analysisSessions.createdAt, thirtyDaysAgo)
                )
            )
            .groupBy(sql`DATE(${analysisSessions.createdAt})`)
            .orderBy(sql`DATE(${analysisSessions.createdAt})`);

        // 4. Weapon Stats — deduplicated: prefer ID match, group by weaponId only
        const weapons = await db
            .select({
                weaponId: analysisSessions.weaponId,
                weaponName: sql<string>`COALESCE(MAX(${weaponRegistry.name}), MAX(${weaponProfiles.name}))`,
                weaponCategory: sql<string | null>`COALESCE(MAX(${weaponRegistry.category}), MAX(${weaponProfiles.category}))`,
                avgScore: sql<number>`ROUND(avg(${scoreExpr}))`,
                count: sql<number>`count(*)`,
            })
            .from(analysisSessions)
            .leftJoin(
                weaponRegistry,
                sql`${analysisSessions.weaponId} = ${weaponRegistry.weaponId}`
            )
            .leftJoin(
                weaponProfiles,
                sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
            )
            .where(eq(analysisSessions.userId, userId))
            .groupBy(analysisSessions.weaponId)
            .orderBy(sql`avg(${scoreExpr}) DESC`);

        const recentTruthRows = await db
            .select({
                id: analysisSessions.id,
                weaponId: analysisSessions.weaponId,
                scopeId: analysisSessions.scopeId,
                patchVersion: analysisSessions.patchVersion,
                distance: analysisSessions.distance,
                createdAt: analysisSessions.createdAt,
                sprayScore: sql<number>`${scoreExpr}`,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, userId))
            .orderBy(desc(analysisSessions.createdAt))
            .limit(12);
        const recentTruthSessions = recentTruthRows.map((row): RecentTruthSession => ({
            id: row.id,
            weaponId: row.weaponId,
            scopeId: row.scopeId,
            patchVersion: row.patchVersion,
            distance: row.distance,
            createdAt: row.createdAt,
            sprayScore: Number(row.sprayScore),
            fullResult: isRecord(row.fullResult) ? row.fullResult : null,
        }));
        const hydratedRecentResults = recentTruthSessions.map(hydrateRecentSession);
        const latestTruthIndex = hydratedRecentResults.findIndex((result) => Boolean(result?.mastery));
        const latestTruthResult = latestTruthIndex >= 0 ? hydratedRecentResults[latestTruthIndex]! : null;
        const latestTruthRow = latestTruthIndex >= 0 ? recentTruthSessions[latestTruthIndex]! : null;
        const precisionLineRows = await db
            .select({
                payload: precisionEvolutionLines.payload,
                updatedAt: precisionEvolutionLines.updatedAt,
            })
            .from(precisionEvolutionLines)
            .where(eq(precisionEvolutionLines.userId, userId))
            .orderBy(desc(precisionEvolutionLines.updatedAt))
            .limit(6);
        const persistedPrecisionLine = precisionLineRows.find((line) => isPrecisionTrendSummary(line.payload.trend));
        const principalPrecisionTrend = buildPrincipalPrecisionTrend(
            isPrecisionTrendSummary(persistedPrecisionLine?.payload.trend)
                ? persistedPrecisionLine.payload.trend
                : latestTruthResult?.precisionTrend ?? null,
            persistedPrecisionLine?.updatedAt ?? latestTruthRow?.createdAt ?? null,
        );
        const latestCoachOutcomeRows = latestTruthRow
            ? await db
                .select({
                    status: coachProtocolOutcomes.status,
                    evidenceStrength: coachProtocolOutcomes.evidenceStrength,
                    conflictPayload: coachProtocolOutcomes.conflictPayload,
                    createdAt: coachProtocolOutcomes.createdAt,
                })
                .from(coachProtocolOutcomes)
                .where(
                    and(
                        eq(coachProtocolOutcomes.userId, userId),
                        eq(coachProtocolOutcomes.analysisSessionId, latestTruthRow.id),
                    ),
                )
                .orderBy(desc(coachProtocolOutcomes.createdAt))
                .limit(1)
            : [];
        const latestCoachOutcome = latestCoachOutcomeRows[0] ?? null;
        const activeCoachLoop = buildDashboardActiveCoachLoop({
            sessionId: latestTruthRow?.id ?? null,
            result: latestTruthResult,
            latestOutcome: latestCoachOutcome,
        });

        return {
            totalSessions: Number(basicStats[0]?.count || 0),
            avgStabilityScore: Number(basicStats[0]?.avgScore || 0),
            bestStabilityScore: Number(basicStats[0]?.maxScore || 0),
            avgSprayScore: Number(basicStats[0]?.avgSpray || 0),
            bestSprayScore: Number(basicStats[0]?.maxSpray || 0),
            lastSessionDelta: delta,
            weeklyTrend: trend.map(t => ({
                date: t.date,
                avgScore: Number(t.avgScore),
                peakScore: Number(t.peakScore),
            })),
            weaponStats: weapons.map(w => ({
                weaponId: w.weaponId,
                weaponName: w.weaponName || w.weaponId.toUpperCase(),
                weaponCategory: w.weaponCategory,
                avgScore: Number(w.avgScore),
                count: Number(w.count),
            })),
            latestMastery: latestTruthRow && latestTruthResult
                ? buildLatestMastery(latestTruthRow, latestTruthResult)
                : null,
            latestCoachNextBlock: buildLatestCoachNextBlock(latestTruthResult),
            trendEvidence: buildTrendEvidence(recentTruthSessions, hydratedRecentResults, delta),
            principalPrecisionTrend,
            activeCoachLoop,
        };
    } catch (err) {
        console.error('[getDashboardStats] Error:', err);
        return null;
    }
}
