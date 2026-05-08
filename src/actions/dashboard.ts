'use server';

import { db } from '@/db';
import {
    analysisSessions,
    coachProtocolOutcomes,
    precisionEvolutionLines,
    sprayLabBenchmarkSnapshots,
    sprayLabSessions,
    sprayLabValidationLinks,
    weaponProfiles,
    weaponRegistry,
} from '@/db/schema';
import { auth } from '@/auth';
import { eq, sql, gte, and, desc, inArray } from 'drizzle-orm';
import { hydrateAnalysisResultFromHistory } from '@/app/history/analysis-result-hydration';
import { buildDashboardActiveCoachLoop, type DashboardActiveCoachLoop } from './dashboard-active-coach-loop';
import { getActiveTrainingProgramCycleAction } from './training-programs';
import { buildSprayLabCoachHandoff } from '@/core/spray-lab-coach-handoff';
import { trainingProgramReasonCopy } from '@/core/training-programs';
import { createPremiumProjectionSummary } from '@/lib/premium-projection';
import { resolveProductAccess, type ProductAccessResolution } from '@/lib/product-entitlements';
import {
    projectTrainingProgramForAccess,
    type TrainingProgramProjectedMission,
    type TrainingProgramProjection,
} from '@/lib/training-program-projection';
import {
    createDrizzleQuotaLedgerRepository,
    resolveAnalysisSaveAccessWithResolution,
} from '@/lib/quota-ledger';
import type { PremiumProjectionSummary } from '@/types/monetization';
import type {
    AnalysisResult,
    CoachDecisionTier,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    SprayActionState,
    SprayMastery,
} from '@/types/engine';
import type {
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramKind,
    TrainingProgramMissionCategory,
    TrainingProgramReasonCode,
    TrainingProgramState,
} from '@/types/training-programs';

export type DashboardTrendEvidenceState = 'strong' | 'moderate' | 'weak' | 'missing';
export type DashboardTrainingProgramEvidenceStatus = 'missing' | 'repair' | 'validation_pending' | 'usable' | 'strong';
export type DashboardTrainingProgramLockState = 'free_basic' | 'pro_full' | 'locked';

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

export interface DashboardActiveTrainingProgram {
    readonly cycleId: string;
    readonly kind: TrainingProgramKind;
    readonly kindLabel: string;
    readonly state: TrainingProgramState;
    readonly stateLabel: string;
    readonly currentWeekLabel: string;
    readonly currentMissionTitle: string;
    readonly currentMissionCategory: TrainingProgramMissionCategory;
    readonly currentMissionCategoryLabel: string;
    readonly visibleAdaptationReason: string;
    readonly blockerCount: number;
    readonly evidenceStatus: DashboardTrainingProgramEvidenceStatus;
    readonly evidenceLabel: string;
    readonly primaryCtaLabel: string;
    readonly primaryCtaHref: string;
    readonly programCtaLabel: 'Abrir Ciclo Pro';
    readonly programHref: '/ciclo-pro';
    readonly lockState: DashboardTrainingProgramLockState;
    readonly lockLabel: string;
    readonly lockBody: string | null;
    readonly lockCtaHref: '/pricing' | '/billing' | null;
    readonly lockCtaLabel: 'Ver Pro' | 'Abrir billing' | null;
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
    activeTrainingProgram: DashboardActiveTrainingProgram | null;
    premiumProjection: PremiumProjectionSummary;
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

function formatTrainingProgramKind(kind: TrainingProgramKind): string {
    switch (kind) {
        case 'ciclo_pro':
            return 'Ciclo Pro';
        case 'ciclo_reparo':
            return 'Ciclo de Reparo';
    }
}

function formatTrainingProgramState(state: TrainingProgramState): string {
    switch (state) {
        case 'preparando':
            return 'Preparando';
        case 'ativo':
            return 'Ativo';
        case 'reparando':
            return 'Reparo';
        case 'consolidando':
            return 'Consolidacao';
        case 'validacao_pendente':
            return 'Validacao pendente';
        case 'progresso_validado':
            return 'Progresso validado';
        case 'sem_mudanca_clara':
            return 'Sem mudanca clara';
        case 'regressao_validada':
            return 'Regressao validada';
        case 'inconclusivo':
            return 'Inconclusivo';
        case 'linha_reiniciada':
            return 'Linha reiniciada';
        case 'concluido':
            return 'Concluido';
        case 'pausado':
            return 'Pausado';
        case 'contexto_desatualizado':
            return 'Contexto desatualizado';
    }
}

function formatTrainingProgramMissionCategory(category: TrainingProgramMissionCategory): string {
    switch (category) {
        case 'execution':
            return 'Execucao';
        case 'validation':
            return 'Validacao';
        case 'repair':
            return 'Reparo';
        case 'preparation':
            return 'Preparacao';
        case 'transfer':
            return 'Transferencia pratica';
    }
}

function findTrainingProgramEvidenceRef(
    projection: TrainingProgramProjection,
    mission: TrainingProgramProjectedMission,
    kind: TrainingProgramEvidenceReference['kind'],
): TrainingProgramEvidenceReference | null {
    return mission.evidenceRefs.find((ref) => ref.kind === kind)
        ?? projection.evidence?.evidenceRefs.find((ref) => ref.kind === kind)
        ?? null;
}

function buildTrainingProgramHref(
    projection: TrainingProgramProjection,
    mission: TrainingProgramProjectedMission,
): string {
    const analysisId = findTrainingProgramEvidenceRef(projection, mission, 'analysis')?.id ?? null;
    const protocolId = findTrainingProgramEvidenceRef(projection, mission, 'protocol')?.id ?? null;
    const labSessionId = findTrainingProgramEvidenceRef(projection, mission, 'spray_lab_session')?.id ?? null;
    const validationLinkId = findTrainingProgramEvidenceRef(projection, mission, 'validation_link')?.id ?? null;

    if (mission.category === 'validation') {
        if (validationLinkId) {
            return `/analyze?mode=validation&validationLinkId=${encodeURIComponent(validationLinkId)}`;
        }

        if (labSessionId && protocolId) {
            return `/analyze?mode=validation&labSessionId=${encodeURIComponent(labSessionId)}&protocolId=${encodeURIComponent(protocolId)}`;
        }

        const params = new URLSearchParams({ mode: 'validation' });
        if (analysisId) {
            params.set('baseSessionId', analysisId);
        }
        if (protocolId) {
            params.set('protocolId', protocolId);
        }

        return `/analyze?${params.toString()}`;
    }

    if (mission.category === 'preparation' && mission.proximoCta.target === 'analyze_validation') {
        return analysisId && protocolId
            ? `/analyze?mode=validation&baseSessionId=${encodeURIComponent(analysisId)}&protocolId=${encodeURIComponent(protocolId)}`
            : '/analyze?mode=validation';
    }

    if (labSessionId) {
        return `/spray-lab?labSessionId=${encodeURIComponent(labSessionId)}`;
    }

    if (analysisId && protocolId) {
        return `/spray-lab?sourceSessionId=${encodeURIComponent(analysisId)}&protocolId=${encodeURIComponent(protocolId)}`;
    }

    if (analysisId) {
        return `/spray-lab?sourceSessionId=${encodeURIComponent(analysisId)}`;
    }

    return mission.proximoCta.href;
}

function resolveTrainingProgramEvidenceStatus(
    projection: TrainingProgramProjection,
    state: TrainingProgramState,
    blockerCount: number,
): DashboardTrainingProgramEvidenceStatus {
    if (!projection.evidence) {
        return 'missing';
    }

    if (
        blockerCount > 0
        || state === 'reparando'
        || state === 'inconclusivo'
        || state === 'linha_reiniciada'
        || state === 'contexto_desatualizado'
        || state === 'pausado'
    ) {
        return 'repair';
    }

    if (state === 'validacao_pendente') {
        return 'validation_pending';
    }

    return projection.evidence.confidence >= 0.8 && projection.evidence.coverage >= 0.8
        ? 'strong'
        : 'usable';
}

function formatTrainingProgramEvidenceStatus(status: DashboardTrainingProgramEvidenceStatus): string {
    switch (status) {
        case 'missing':
            return 'Evidencia ausente';
        case 'repair':
            return 'Reparo ou reencaixe';
        case 'validation_pending':
            return 'Validacao pendente';
        case 'usable':
            return 'Evidencia utilizavel';
        case 'strong':
            return 'Evidencia forte';
    }
}

function resolveTrainingProgramLockState(
    projection: TrainingProgramProjection,
): Pick<DashboardActiveTrainingProgram, 'lockState' | 'lockLabel' | 'lockBody' | 'lockCtaHref' | 'lockCtaLabel'> {
    if (projection.canSeeFullThirtyDayCycle) {
        return {
            lockState: 'pro_full',
            lockLabel: 'Pro: ciclo completo ativo',
            lockBody: null,
            lockCtaHref: null,
            lockCtaLabel: null,
        };
    }

    const lock = projection.locks[0] ?? null;
    const lockCtaLabel = lock?.ctaHref === '/pricing'
        ? 'Ver Pro'
        : lock?.ctaHref === '/billing'
            ? 'Abrir billing'
            : null;

    return {
        lockState: lock ? 'locked' : 'free_basic',
        lockLabel: 'Free: proximo passo visivel',
        lockBody: lock?.body ?? projection.proValueCopy,
        lockCtaHref: lock?.ctaHref ?? null,
        lockCtaLabel,
    };
}

function buildDashboardActiveTrainingProgram(
    projection: TrainingProgramProjection,
    cycle: TrainingProgramCycleSnapshot | null,
): DashboardActiveTrainingProgram | null {
    const mission = projection.basicMission;

    if (!cycle || !mission || !projection.evidence) {
        return null;
    }

    const reasonCodes = Array.from(new Set<TrainingProgramReasonCode>([
        ...projection.evidence.reasonCodes,
        ...projection.evidence.blockers,
        ...mission.reasonCodes,
    ]));
    const blockerCount = reasonCodes.length;
    const evidenceStatus = resolveTrainingProgramEvidenceStatus(projection, cycle.state, blockerCount);
    const lock = resolveTrainingProgramLockState(projection);

    return {
        cycleId: cycle.id,
        kind: cycle.kind,
        kindLabel: formatTrainingProgramKind(cycle.kind),
        state: cycle.state,
        stateLabel: formatTrainingProgramState(cycle.state),
        currentWeekLabel: `Semana ${mission.weekNumber} de 4`,
        currentMissionTitle: mission.title,
        currentMissionCategory: mission.category,
        currentMissionCategoryLabel: formatTrainingProgramMissionCategory(mission.category),
        visibleAdaptationReason: reasonCodes[0]
            ? trainingProgramReasonCopy(reasonCodes[0])
            : projection.evidence.summary,
        blockerCount,
        evidenceStatus,
        evidenceLabel: formatTrainingProgramEvidenceStatus(evidenceStatus),
        primaryCtaLabel: mission.proximoCta.label,
        primaryCtaHref: buildTrainingProgramHref(projection, mission),
        programCtaLabel: 'Abrir Ciclo Pro',
        programHref: '/ciclo-pro',
        ...lock,
    };
}

async function resolveDashboardAccess(userId: string): Promise<ProductAccessResolution> {
    try {
        return (await resolveAnalysisSaveAccessWithResolution({
            repository: createDrizzleQuotaLedgerRepository(db),
            userId,
        })).access;
    } catch {
        return resolveProductAccess({ userId });
    }
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const userId = session.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        const access = await resolveDashboardAccess(userId);
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
        const latestSprayLabRows = await db
            .select({
                snapshot: sprayLabSessions.snapshot,
            })
            .from(sprayLabSessions)
            .where(
                and(
                    eq(sprayLabSessions.userId, userId),
                    inArray(sprayLabSessions.status, ['draft', 'active', 'paused', 'blocked', 'completed']),
                ),
            )
            .orderBy(desc(sprayLabSessions.updatedAt))
            .limit(1);
        const latestSprayLabSession = latestSprayLabRows[0]?.snapshot ?? null;
        const latestSprayLabBenchmarkRows = latestSprayLabSession
            ? await db
                .select({
                    snapshot: sprayLabBenchmarkSnapshots.snapshot,
                })
                .from(sprayLabBenchmarkSnapshots)
                .where(
                    and(
                        eq(sprayLabBenchmarkSnapshots.userId, userId),
                        eq(sprayLabBenchmarkSnapshots.labSessionId, latestSprayLabSession.id),
                    ),
                )
                .orderBy(desc(sprayLabBenchmarkSnapshots.createdAt))
                .limit(1)
            : [];
        const latestSprayLabValidationRows = latestSprayLabSession
            ? await db
                .select({
                    payload: sprayLabValidationLinks.payload,
                })
                .from(sprayLabValidationLinks)
                .where(
                    and(
                        eq(sprayLabValidationLinks.userId, userId),
                        eq(sprayLabValidationLinks.labSessionId, latestSprayLabSession.id),
                    ),
                )
                .orderBy(desc(sprayLabValidationLinks.updatedAt))
                .limit(1)
            : [];
        const sprayLabHandoff = buildSprayLabCoachHandoff({
            session: latestSprayLabSession,
            benchmark: latestSprayLabBenchmarkRows[0]?.snapshot ?? null,
            validationLink: latestSprayLabValidationRows[0]?.payload ?? null,
        });
        const activeCoachLoop = buildDashboardActiveCoachLoop({
            sessionId: latestTruthRow?.id ?? null,
            result: latestTruthResult,
            latestOutcome: latestCoachOutcome,
            sprayLabHandoff,
        });
        const activeLoopVisible = access.features['coach.validation_loop'].granted
            || Boolean(activeCoachLoop?.sprayLab);
        const activeProgramResult = await getActiveTrainingProgramCycleAction();
        const activeProgramCycle = activeProgramResult.success ? activeProgramResult.value : null;
        const activeTrainingProgramProjection = projectTrainingProgramForAccess({
            access,
            cycle: activeProgramCycle,
        });
        const activeTrainingProgram = buildDashboardActiveTrainingProgram(
            activeTrainingProgramProjection,
            activeProgramCycle,
        );

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
            activeCoachLoop: activeLoopVisible ? activeCoachLoop : null,
            activeTrainingProgram,
            premiumProjection: createPremiumProjectionSummary(access, latestTruthResult ?? undefined),
        };
    } catch (err) {
        console.error('[getDashboardStats] Error:', err);
        return null;
    }
}
