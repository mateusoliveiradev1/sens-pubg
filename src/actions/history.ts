'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { hydrateAnalysisResultFromHistory } from '@/app/history/analysis-result-hydration';
import { auth } from '@/auth';
import { enrichAnalysisResultCoaching } from '@/core/analysis-result-coach-enrichment';
import { buildCoachMemorySnapshot, type CoachMemoryHistorySession } from '@/core/coach-memory';
import {
    detectCoachOutcomePrecisionConflict,
    normalizeCoachProtocolOutcomeInput,
    resolveCoachOutcomeEvidence,
} from '@/core/coach-outcomes';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import { resolveMeasurementTruth } from '@/core/measurement-truth';
import { buildPrecisionCompatibilityKey, formatPrecisionTrendLabel, resolvePrecisionTrend } from '@/core/precision-loop';
import {
    applySensitivityHistoryConvergence,
    type HistoricalSensitivitySignal,
} from '@/core/sensitivity-history-convergence';
import { db } from '@/db';
import {
    analysisSessions,
    coachProtocolOutcomes,
    playerProfiles,
    precisionCheckpoints,
    precisionEvolutionLines,
    sensitivityHistory,
    weaponProfiles,
    type CoachProtocolOutcomeRow,
} from '@/db/schema';
import { normalizePatchVersion } from '@/game/pubg';
import { createGroqCoachClient } from '@/server/coach/groq-coach-client';
import type {
    AnalysisResult,
    CoachDecisionSnapshot,
    CoachFocusArea,
    CoachProtocolOutcome,
    CoachProtocolOutcomeCoachSnapshot,
    CoachProtocolOutcomeReasonCode,
    CoachProtocolOutcomeStatus,
    PrecisionCheckpointState,
    PrecisionCompatibilityKey,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    PrecisionVariableInTest,
    ProfileType,
    RecommendationEvidenceTier,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
    SensitivityRecommendationTier,
    WeaponLoadout,
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

export interface PrecisionHistoryCheckpointSummary {
    readonly id: string;
    readonly lineId: string;
    readonly analysisSessionId: string | null;
    readonly state: PrecisionCheckpointState;
    readonly stateLabel: string;
    readonly variableInTest: PrecisionVariableInTest;
    readonly nextValidation: string;
    readonly blockerReasons: readonly string[];
    readonly createdAt: Date;
}

export interface PrecisionHistoryLineSummary {
    readonly id: string;
    readonly compatibilityKey: string;
    readonly contextLabel: string;
    readonly status: PrecisionCheckpointState;
    readonly statusLabel: string;
    readonly variableInTest: PrecisionVariableInTest;
    readonly nextValidation: string;
    readonly validClipCount: number;
    readonly blockedClipCount: number;
    readonly latestTrendLabel: PrecisionTrendLabel | null;
    readonly latestTrendText: string;
    readonly blockerReasons: readonly string[];
    readonly baselineSessionId: string | null;
    readonly currentSessionId: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly checkpoints: readonly PrecisionHistoryCheckpointSummary[];
}

export interface RecordCoachProtocolOutcomeInput {
    readonly sessionId: string;
    readonly coachPlanId: string;
    readonly protocolId: string;
    readonly focusArea: CoachFocusArea;
    readonly status: CoachProtocolOutcomeStatus;
    readonly reasonCodes?: readonly CoachProtocolOutcomeReasonCode[];
    readonly note?: string;
    readonly revisionOfOutcomeId?: string;
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

function normalizeHistoryAcceptanceOutcome(
    value: unknown,
): SensitivityAcceptanceOutcome | undefined {
    return value === 'improved' || value === 'same' || value === 'worse'
        ? value
        : undefined;
}

function normalizeStoredAcceptanceFeedback(
    value: unknown,
): SensitivityAcceptanceFeedback | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const feedback = value as Partial<SensitivityAcceptanceFeedback>;
    const outcome = normalizeHistoryAcceptanceOutcome(feedback.outcome);
    const testedProfile = feedback.testedProfile;
    const recordedAt = feedback.recordedAt;

    if (
        outcome === undefined
        || (testedProfile !== 'low' && testedProfile !== 'balanced' && testedProfile !== 'high')
        || typeof recordedAt !== 'string'
    ) {
        return undefined;
    }

    return {
        outcome,
        testedProfile: testedProfile as ProfileType,
        recordedAt,
    };
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
    const acceptanceFeedback = normalizeStoredAcceptanceFeedback(storedSensitivity.acceptanceFeedback);
    let evidenceTier = normalizeHistoryEvidenceTier(storedSensitivity.evidenceTier);
    const clipCount = Array.isArray(fullResult?.subSessions)
        ? fullResult.subSessions.length
        : 1;
    let adjustedConfidenceScore = confidenceScore;

    if (acceptanceFeedback?.outcome === 'improved') {
        adjustedConfidenceScore = Math.min(0.98, adjustedConfidenceScore + 0.06);
    } else if (acceptanceFeedback?.outcome === 'same') {
        adjustedConfidenceScore = Math.min(0.96, adjustedConfidenceScore + 0.02);
    } else if (acceptanceFeedback?.outcome === 'worse') {
        adjustedConfidenceScore = Math.max(0.35, adjustedConfidenceScore - 0.3);
        evidenceTier = 'weak';
    }

    let tier = normalizeHistoryTier(storedSensitivity.tier, evidenceTier, adjustedConfidenceScore, clipCount);
    if (acceptanceFeedback?.outcome === 'worse') {
        tier = 'capture_again';
    }

    return {
        sessionId: session.id,
        createdAt: session.createdAt,
        recommendedProfile,
        tier,
        evidenceTier,
        confidenceScore: adjustedConfidenceScore,
        ...(acceptanceFeedback ? { acceptanceOutcome: acceptanceFeedback.outcome } : {}),
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

function normalizeStoredPlayerStance(value: string): WeaponLoadout['stance'] | undefined {
    return value === 'standing' || value === 'crouching' || value === 'prone'
        ? value
        : undefined;
}

function toCoachMemoryHistorySession(
    session: StoredSensitivityHistorySession,
): CoachMemoryHistorySession {
    const attachments = normalizeStoredAttachments(session.attachments);
    const stance = normalizeStoredPlayerStance(session.stance);

    return {
        id: session.id,
        createdAt: session.createdAt,
        patchVersion: session.patchVersion,
        distance: session.distance,
        ...(stance ? {
            loadout: {
                stance,
                muzzle: attachments.muzzle,
                grip: attachments.grip,
                stock: attachments.stock,
            } as WeaponLoadout,
        } : {}),
        fullResult: session.fullResult,
    };
}

function withSaveAnalysisContext(
    result: AnalysisResult,
    input: {
        readonly patchVersion: string;
        readonly scopeId: string;
        readonly distance: number;
    },
): AnalysisResult {
    return {
        ...result,
        patchVersion: input.patchVersion,
        analysisContext: result.analysisContext ?? createAnalysisContext({
            patchVersion: input.patchVersion,
            scopeId: input.scopeId,
            distanceMeters: input.distance,
            distanceMode: 'exact',
        }),
    };
}

function toPrecisionHistoryResult(
    session: StoredSensitivityHistorySession,
): AnalysisResult | null {
    if (!session.fullResult) {
        return null;
    }

    try {
        return hydrateAnalysisResultFromHistory({
            fullResult: session.fullResult,
            recordPatchVersion: session.patchVersion,
            scopeId: session.scopeId,
            distanceMeters: session.distance,
        });
    } catch {
        return null;
    }
}

function serializePrecisionCompatibilityKey(key: PrecisionCompatibilityKey): string {
    return JSON.stringify({
        patchVersion: key.patchVersion,
        weaponId: key.weaponId,
        scopeId: key.scopeId,
        opticStateId: key.opticStateId ?? null,
        stance: key.stance,
        muzzle: key.muzzle,
        grip: key.grip,
        stock: key.stock,
        distanceMeters: key.distanceMeters,
        sprayProtocolKey: key.sprayProtocolKey,
        sensitivityProfile: key.sensitivityProfile ?? null,
        sensitivitySignature: key.sensitivitySignature ?? null,
    });
}

function checkpointStateForTrend(label: PrecisionTrendLabel): PrecisionCheckpointState {
    switch (label) {
        case 'baseline':
            return 'baseline_created';
        case 'initial_signal':
            return 'initial_signal';
        case 'in_validation':
            return 'in_validation';
        case 'validated_progress':
            return 'validated_progress';
        case 'validated_regression':
            return 'validated_regression';
        case 'oscillation':
            return 'oscillation';
        case 'not_comparable':
            return 'not_comparable';
        case 'consolidated':
            return 'consolidated';
    }
}

function variableForFocus(area: CoachFocusArea | undefined): PrecisionVariableInTest {
    switch (area) {
        case 'sensitivity':
            return 'sensitivity';
        case 'vertical_control':
            return 'vertical_control';
        case 'horizontal_control':
            return 'horizontal_noise';
        case 'consistency':
            return 'consistency';
        case 'capture_quality':
            return 'capture_quality';
        case 'loadout':
            return 'loadout';
        case 'timing':
        case 'validation':
        case undefined:
            return 'validation';
    }
}

function resolvePrecisionVariableInTest(result: AnalysisResult, trend: PrecisionTrendSummary): PrecisionVariableInTest {
    const blockerCodes = new Set(trend.blockerSummaries.map((summary) => summary.code));

    if (blockerCodes.has('capture_quality_unusable') || blockerCodes.has('capture_quality_weak')) {
        return 'capture_quality';
    }

    if (blockerCodes.has('sensitivity_change')) {
        return 'sensitivity';
    }

    if (
        blockerCodes.has('stance_mismatch')
        || blockerCodes.has('muzzle_mismatch')
        || blockerCodes.has('grip_mismatch')
        || blockerCodes.has('stock_mismatch')
    ) {
        return 'loadout';
    }

    if (trend.label === 'baseline' || trend.label === 'initial_signal' || trend.label === 'not_comparable') {
        return 'validation';
    }

    return variableForFocus(result.coachPlan?.primaryFocus.area);
}

function buildResultIdToSessionIdMap(
    priorSessions: readonly StoredSensitivityHistorySession[],
    current: {
        readonly resultId: string;
        readonly sessionId: string;
    },
): Map<string, string> {
    const map = new Map<string, string>([[current.resultId, current.sessionId]]);

    for (const session of priorSessions) {
        map.set(session.id, session.id);

        const fullResultId = session.fullResult?.id;
        if (typeof fullResultId === 'string') {
            map.set(fullResultId, session.id);
        }
    }

    return map;
}

async function persistPrecisionEvolution(input: {
    readonly userId: string;
    readonly sessionId: string;
    readonly result: AnalysisResult;
    readonly trend: PrecisionTrendSummary;
    readonly priorSessions: readonly StoredSensitivityHistorySession[];
}): Promise<void> {
    const compatibility = buildPrecisionCompatibilityKey(input.result);
    const state = checkpointStateForTrend(input.trend.label);
    const variableInTest = resolvePrecisionVariableInTest(input.result, input.trend);
    const resultIdToSessionId = buildResultIdToSessionIdMap(input.priorSessions, {
        resultId: input.result.id,
        sessionId: input.sessionId,
    });
    const compatibilityKey = compatibility.key
        ? serializePrecisionCompatibilityKey(compatibility.key)
        : `blocked:${input.sessionId}`;
    const baselineSessionId = input.trend.baseline
        ? resultIdToSessionId.get(input.trend.baseline.resultId) ?? null
        : null;
    const blockedClipCount = Math.max(
        input.trend.blockedClips.length,
        input.trend.label === 'not_comparable' ? 1 : 0,
    );
    const payload = {
        trend: input.trend,
        nextValidationHint: input.trend.nextValidationHint,
        blockedClips: input.trend.blockedClips,
        validResultIds: [
            ...(input.trend.recentWindow?.resultIds ?? []),
            input.trend.current?.resultId,
        ].filter((value): value is string => typeof value === 'string'),
        metadata: {
            compatibilityBlocked: !compatibility.compatible,
        },
    };

    const lineRows = await db
        .insert(precisionEvolutionLines)
        .values({
            userId: input.userId,
            compatibilityKey,
            status: state,
            variableInTest,
            baselineSessionId,
            currentSessionId: input.sessionId,
            validClipCount: input.trend.label === 'not_comparable' ? 0 : input.trend.compatibleCount,
            blockedClipCount,
            payload,
        })
        .onConflictDoUpdate({
            target: [
                precisionEvolutionLines.userId,
                precisionEvolutionLines.compatibilityKey,
            ],
            set: {
                status: state,
                variableInTest,
                baselineSessionId,
                currentSessionId: input.sessionId,
                validClipCount: input.trend.label === 'not_comparable' ? 0 : input.trend.compatibleCount,
                blockedClipCount,
                payload,
                updatedAt: new Date(),
            },
        })
        .returning({ id: precisionEvolutionLines.id });

    const lineId = lineRows[0]?.id;
    if (!lineId) {
        return;
    }

    await db.insert(precisionCheckpoints).values({
        lineId,
        analysisSessionId: input.sessionId,
        state,
        variableInTest,
        payload: {
            trend: input.trend,
            nextValidationHint: input.trend.nextValidationHint,
            blockerReasons: input.trend.blockerSummaries,
            metadata: {
                compatibilityKey,
            },
        },
    });
}

function checkpointStateLabel(state: PrecisionCheckpointState): string {
    switch (state) {
        case 'baseline_created':
            return 'Baseline criado';
        case 'initial_signal':
            return 'Sinal inicial';
        case 'in_validation':
            return 'Em validacao';
        case 'validated_progress':
            return 'Progresso validado';
        case 'validated_regression':
            return 'Regressao validada';
        case 'oscillation':
            return 'Oscilacao';
        case 'consolidated':
            return 'Consolidado';
        case 'not_comparable':
            return 'Nao comparavel';
    }
}

function extractPrecisionTrendFromPayload(payload: { readonly trend?: PrecisionTrendSummary } | null | undefined): PrecisionTrendSummary | null {
    return payload?.trend && typeof payload.trend.label === 'string'
        ? payload.trend
        : null;
}

function extractPrecisionBlockerReasons(trend: PrecisionTrendSummary | null): readonly string[] {
    if (!trend) {
        return [];
    }

    return Array.from(new Set([
        ...trend.blockerSummaries.map((summary) => summary.message),
        ...trend.blockedClips.flatMap((clip) => clip.blockers.map((blocker) => blocker.message)),
    ].filter((message) => message.trim().length > 0)));
}

function formatPrecisionContextLabel(compatibilityKey: string): string {
    if (compatibilityKey.startsWith('blocked:')) {
        return 'Clip bloqueado sem linha compativel';
    }

    try {
        const key = JSON.parse(compatibilityKey) as Partial<PrecisionCompatibilityKey>;
        const loadout = [
            key.stance,
            key.muzzle,
            key.grip,
            key.stock,
        ].filter(Boolean).join('/');

        return [
            key.weaponId,
            key.scopeId,
            key.patchVersion ? `patch ${key.patchVersion}` : null,
            typeof key.distanceMeters === 'number' ? `${key.distanceMeters}m` : null,
            loadout || null,
        ].filter(Boolean).join(' | ') || 'Contexto de precisao';
    } catch {
        return 'Contexto de precisao';
    }
}

function precisionNextValidation(payload: { readonly nextValidationHint?: string } | null | undefined, trend: PrecisionTrendSummary | null): string {
    return payload?.nextValidationHint
        ?? trend?.nextValidationHint
        ?? 'Gravar validacao compativel mantendo as variaveis fixas.';
}

function resolveCoachOutcomeEvidenceState(
    outcomeMemory: CoachDecisionSnapshot['outcomeMemory'],
): CoachDecisionSnapshot['outcomeEvidenceState'] {
    if (outcomeMemory.conflictCount > 0) {
        return 'conflict';
    }

    if (outcomeMemory.confirmedCount > 0) {
        return 'confirmed_by_compatible_clip';
    }

    if (outcomeMemory.invalidCount > 0) {
        return 'invalid';
    }

    if (outcomeMemory.pendingCount > 0 || outcomeMemory.neutralCount > 0) {
        return 'neutral';
    }

    return 'none';
}

function compactCoachOutcomeMemory(
    outcomeMemory: CoachDecisionSnapshot['outcomeMemory'],
): CoachDecisionSnapshot['outcomeMemory'] {
    const compactLayer = (
        layer: CoachDecisionSnapshot['outcomeMemory']['strictCompatible'],
    ): CoachDecisionSnapshot['outcomeMemory']['strictCompatible'] => ({
        source: layer.source,
        outcomeCount: layer.outcomeCount,
        pendingCount: layer.pendingCount,
        neutralCount: layer.neutralCount,
        weakSelfReportCount: layer.weakSelfReportCount,
        confirmedCount: layer.confirmedCount,
        invalidCount: layer.invalidCount,
        conflictCount: layer.conflictCount,
        repeatedFailureCount: layer.repeatedFailureCount,
        staleOutcomeCount: layer.staleOutcomeCount,
        technicalEvidenceCount: layer.technicalEvidenceCount,
        focusAreas: layer.focusAreas,
        confidence: layer.confidence,
        summary: layer.summary,
    });

    return {
        activeLayer: outcomeMemory.activeLayer,
        strictCompatible: compactLayer(outcomeMemory.strictCompatible),
        globalFallback: compactLayer(outcomeMemory.globalFallback),
        pendingCount: outcomeMemory.pendingCount,
        neutralCount: outcomeMemory.neutralCount,
        confirmedCount: outcomeMemory.confirmedCount,
        invalidCount: outcomeMemory.invalidCount,
        conflictCount: outcomeMemory.conflictCount,
        repeatedFailureCount: outcomeMemory.repeatedFailureCount,
        staleOutcomeCount: outcomeMemory.staleOutcomeCount,
        confidence: outcomeMemory.confidence,
        summary: outcomeMemory.summary,
    };
}

function buildCoachDecisionSnapshot(input: {
    readonly coachPlan: NonNullable<AnalysisResult['coachPlan']>;
    readonly memorySnapshot: ReturnType<typeof buildCoachMemorySnapshot>;
    readonly precisionTrend: PrecisionTrendSummary;
    readonly protocolOutcomes: readonly CoachProtocolOutcome[];
    readonly createdAt: Date;
}): CoachDecisionSnapshot {
    const protocol = input.coachPlan.actionProtocols[0];
    const validationCheck = input.coachPlan.nextBlock.checks[0];
    const conflicts = input.protocolOutcomes
        .map((outcome) => outcome.conflict)
        .filter((conflict): conflict is NonNullable<CoachProtocolOutcome['conflict']> => conflict !== undefined);
    const visiblePriorities = [
        input.coachPlan.primaryFocus,
        ...input.coachPlan.secondaryFocuses,
    ];
    const blockerReasons = Array.from(new Set([
        ...visiblePriorities.flatMap((priority) => priority.blockedBy),
        ...input.memorySnapshot.conflictingFocusAreas.map((area) => `memory_conflict:${area}`),
        ...input.memorySnapshot.signals
            .filter((signal) => (
                signal.key.includes('conflict')
                || signal.key.includes('failure')
                || signal.key.includes('pending')
                || signal.key.includes('invalid_capture')
            ))
            .map((signal) => signal.key),
        ...input.precisionTrend.blockerSummaries.map((summary) => summary.message),
    ].filter((reason) => reason.trim().length > 0)));

    return {
        tier: input.coachPlan.tier,
        primaryFocusArea: input.coachPlan.primaryFocus.area,
        primaryFocusTitle: input.coachPlan.primaryFocus.title,
        secondaryFocusAreas: input.coachPlan.secondaryFocuses.map((focus) => focus.area),
        protocolId: protocol?.id ?? 'validation-block-protocol',
        validationTarget: validationCheck?.target ?? input.precisionTrend.nextValidationHint,
        memorySummary: input.memorySnapshot.summary,
        outcomeMemory: compactCoachOutcomeMemory(input.memorySnapshot.outcomeMemory),
        outcomeEvidenceState: resolveCoachOutcomeEvidenceState(input.memorySnapshot.outcomeMemory),
        conflicts,
        blockerReasons,
        precisionTrendLabel: input.precisionTrend.label,
        createdAt: input.createdAt.toISOString(),
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

        const protocolOutcomeRows = await db
            .select()
            .from(coachProtocolOutcomes)
            .where(eq(coachProtocolOutcomes.userId, session.user.id))
            .orderBy(desc(coachProtocolOutcomes.createdAt)) as CoachProtocolOutcomeRow[];
        const protocolOutcomes = protocolOutcomeRows.map(toCoachProtocolOutcome);

        const compatiblePriorSessions = priorSessions.filter((storedSession) => (
            storedSession.fullResult !== null
            && storedSession.patchVersion === patchVersion
            && storedSession.weaponId === weaponId
            && storedSession.scopeId === scopeId
        ));

        const resultWithHistory = enrichResultWithSensitivityHistory(
            withSaveAnalysisContext(result, {
                patchVersion,
                scopeId,
                distance,
            }),
            distance,
            compatiblePriorSessions,
        );
        const coachMemoryHistorySessions = priorSessions.map(toCoachMemoryHistorySession);
        const precisionHistoryResults = priorSessions
            .map(toPrecisionHistoryResult)
            .filter((historyResult): historyResult is AnalysisResult => historyResult !== null);

        const resultWithCoaching = await enrichAnalysisResultCoaching(
            resultWithHistory,
            createGroqCoachClient()
        );
        const initialCoachMemorySnapshot = buildCoachMemorySnapshot({
            currentResult: resultWithCoaching,
            historySessions: coachMemoryHistorySessions,
            protocolOutcomes,
        });
        const initialCoachPlan = buildCoachPlan({
            analysisResult: resultWithCoaching,
            memorySnapshot: initialCoachMemorySnapshot,
        });
        const resultWithTruth = {
            ...resultWithCoaching,
            coachPlan: initialCoachPlan,
            mastery: resolveMeasurementTruth({
                ...resultWithCoaching,
                coachPlan: initialCoachPlan,
            }),
        };
        const precisionTrend = resolvePrecisionTrend({
            current: resultWithTruth,
            history: precisionHistoryResults,
        });
        const resultWithPrecision = {
            ...resultWithTruth,
            precisionTrend,
        };
        const precisionCoachMemorySnapshot = buildCoachMemorySnapshot({
            currentResult: resultWithPrecision,
            historySessions: coachMemoryHistorySessions,
            protocolOutcomes,
        });
        const coachPlan = buildCoachPlan({
            analysisResult: resultWithPrecision,
            memorySnapshot: precisionCoachMemorySnapshot,
        });
        const coachDecisionSnapshot = buildCoachDecisionSnapshot({
            coachPlan,
            memorySnapshot: precisionCoachMemorySnapshot,
            precisionTrend,
            protocolOutcomes,
            createdAt: resultWithPrecision.timestamp,
        });
        enrichedResult = {
            ...resultWithPrecision,
            coachPlan,
            coachDecisionSnapshot,
            mastery: resolveMeasurementTruth({
                ...resultWithPrecision,
                coachPlan,
            }),
        };

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

        await persistPrecisionEvolution({
            userId: session.user.id,
            sessionId,
            result: enrichedResult,
            trend: enrichedResult.precisionTrend!,
            priorSessions,
        });

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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown> | undefined, key: string): string | undefined {
    const property = value?.[key];
    return typeof property === 'string' && property.trim().length > 0
        ? property.trim()
        : undefined;
}

function isCoachDecisionTier(value: unknown): value is CoachProtocolOutcomeCoachSnapshot['tier'] {
    return value === 'capture_again'
        || value === 'test_protocol'
        || value === 'stabilize_block'
        || value === 'apply_protocol';
}

function isStoredPrecisionTrendLabel(value: unknown): value is PrecisionTrendLabel {
    return value === 'baseline'
        || value === 'initial_signal'
        || value === 'in_validation'
        || value === 'validated_progress'
        || value === 'validated_regression'
        || value === 'oscillation'
        || value === 'not_comparable'
        || value === 'consolidated';
}

function readPrecisionTrendForOutcome(
    fullResult: Record<string, unknown>,
): Pick<PrecisionTrendSummary, 'label' | 'evidenceLevel' | 'nextValidationHint'> | null {
    const trend = fullResult.precisionTrend;

    if (!isRecord(trend) || !isStoredPrecisionTrendLabel(trend.label)) {
        return null;
    }

    return {
        label: trend.label,
        evidenceLevel: typeof trend.evidenceLevel === 'string'
            ? trend.evidenceLevel as PrecisionTrendSummary['evidenceLevel']
            : 'blocked',
        nextValidationHint: typeof trend.nextValidationHint === 'string'
            ? trend.nextValidationHint
            : 'Grave uma validacao compativel antes de avancar.',
    };
}

function buildCoachOutcomeCoachSnapshot(
    fullResult: Record<string, unknown>,
    input: {
        readonly protocolId: string;
        readonly focusArea: CoachFocusArea;
    },
): { readonly ok: true; readonly value: CoachProtocolOutcomeCoachSnapshot } | { readonly ok: false; readonly error: string } {
    const coachPlan = isRecord(fullResult.coachPlan) ? fullResult.coachPlan : undefined;
    const primaryFocus = isRecord(coachPlan?.primaryFocus) ? coachPlan.primaryFocus : undefined;
    const nextBlock = isRecord(coachPlan?.nextBlock) ? coachPlan.nextBlock : undefined;
    const protocols = Array.isArray(coachPlan?.actionProtocols)
        ? coachPlan.actionProtocols.filter(isRecord)
        : [];
    const protocol = protocols.find((candidate) => candidate.id === input.protocolId);
    const tier = coachPlan?.tier;
    const primaryFocusArea = primaryFocus?.area;
    const primaryFocusTitle = readString(primaryFocus, 'title');

    if (!coachPlan || !isCoachDecisionTier(tier)) {
        return { ok: false, error: 'Sessao sem plano de coach valido.' };
    }

    if (primaryFocusArea !== input.focusArea) {
        return { ok: false, error: 'O foco informado nao corresponde ao foco principal salvo.' };
    }

    if (!protocol) {
        return { ok: false, error: 'Protocolo nao encontrado no plano salvo.' };
    }

    const validationCheck = Array.isArray(nextBlock?.checks)
        ? nextBlock.checks.find(isRecord)
        : undefined;
    const precisionTrend = readPrecisionTrendForOutcome(fullResult);
    const validationTarget = readString(validationCheck, 'target')
        ?? precisionTrend?.nextValidationHint
        ?? readString(protocol, 'applyWhen')
        ?? 'Gravar validacao compativel mantendo o contexto controlado.';

    return {
        ok: true,
        value: {
            tier,
            primaryFocusArea: input.focusArea,
            primaryFocusTitle: primaryFocusTitle ?? input.focusArea,
            protocolId: input.protocolId,
            validationTarget,
            ...(precisionTrend ? { precisionTrendLabel: precisionTrend.label } : {}),
        },
    };
}

function toCoachProtocolOutcome(row: CoachProtocolOutcomeRow): CoachProtocolOutcome {
    const conflictPayload = row.conflictPayload ?? undefined;
    const coachSnapshot = row.payload.coachSnapshot;

    return {
        id: row.id,
        sessionId: row.analysisSessionId,
        coachPlanId: row.coachPlanId,
        protocolId: row.protocolId,
        focusArea: row.focusArea,
        status: row.status,
        reasonCodes: row.reasonCodes,
        ...(row.note ? { note: row.note } : {}),
        recordedAt: row.createdAt.toISOString(),
        ...(row.revisionOfId ? { revisionOfOutcomeId: row.revisionOfId } : {}),
        evidenceStrength: row.evidenceStrength,
        ...(conflictPayload ? { conflict: conflictPayload } : {}),
        ...(coachSnapshot ? { coachSnapshot } : {}),
    };
}

export async function recordCoachProtocolOutcome(
    input: RecordCoachProtocolOutcomeInput,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    const normalized = normalizeCoachProtocolOutcomeInput({
        sessionId: input.sessionId,
        coachPlanId: input.coachPlanId,
        protocolId: input.protocolId,
        focusArea: input.focusArea,
        status: input.status,
        reasonCodes: input.reasonCodes,
        note: input.note,
        revisionOfOutcomeId: input.revisionOfOutcomeId,
    });

    if (!normalized.ok) {
        return {
            success: false as const,
            error: normalized.errors[0] ?? 'Resultado do protocolo invalido.',
        };
    }

    try {
        const [storedSession] = await db
            .select({
                id: analysisSessions.id,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, normalized.value.sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        if (normalized.value.revisionOfOutcomeId) {
            const [previousOutcome] = await db
                .select({ id: coachProtocolOutcomes.id })
                .from(coachProtocolOutcomes)
                .where(
                    and(
                        eq(coachProtocolOutcomes.id, normalized.value.revisionOfOutcomeId),
                        eq(coachProtocolOutcomes.userId, session.user.id),
                        eq(coachProtocolOutcomes.analysisSessionId, normalized.value.sessionId),
                    ),
                )
                .limit(1);

            if (!previousOutcome) {
                return {
                    success: false as const,
                    error: 'Resultado original nao encontrado para revisao.',
                };
            }
        }

        const fullResult = isRecord(storedSession.fullResult)
            ? storedSession.fullResult
            : {};
        const coachSnapshot = buildCoachOutcomeCoachSnapshot(fullResult, normalized.value);

        if (!coachSnapshot.ok) {
            return {
                success: false as const,
                error: coachSnapshot.error,
            };
        }

        const outcomeId = randomUUID();
        const recordedAt = new Date();
        const precisionTrend = readPrecisionTrendForOutcome(fullResult);
        const conflict = detectCoachOutcomePrecisionConflict({
            outcomeId,
            status: normalized.value.status,
            precisionTrend,
        });
        const evidence = resolveCoachOutcomeEvidence({
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            precisionTrend,
        });
        const evidenceStrength = conflict ? 'conflict' : evidence.evidenceStrength;
        const payload = {
            coachSnapshot: coachSnapshot.value,
            ...(precisionTrend ? { precisionTrendLabel: precisionTrend.label } : {}),
            validationTarget: coachSnapshot.value.validationTarget,
            recordedBy: 'user' as const,
            metadata: {
                countsAsTechnicalEvidence: evidence.countsAsTechnicalEvidence,
                pendingClosure: evidence.pendingClosure,
                needsCompatibleValidation: conflict ? true : evidence.needsCompatibleValidation,
                invalidBecauseOfExecutionOrCapture: evidence.invalidBecauseOfExecutionOrCapture,
            },
        };

        await db.insert(coachProtocolOutcomes).values({
            id: outcomeId,
            userId: session.user.id,
            analysisSessionId: normalized.value.sessionId,
            coachPlanId: normalized.value.coachPlanId,
            protocolId: normalized.value.protocolId,
            focusArea: normalized.value.focusArea,
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            ...(normalized.value.note ? { note: normalized.value.note } : {}),
            ...(normalized.value.revisionOfOutcomeId ? { revisionOfId: normalized.value.revisionOfOutcomeId } : {}),
            evidenceStrength,
            ...(conflict ? { conflictPayload: conflict } : {}),
            payload,
            createdAt: recordedAt,
            updatedAt: recordedAt,
        });

        revalidatePath('/history');
        revalidatePath(`/history/${normalized.value.sessionId}`);
        revalidatePath('/dashboard');

        const outcome: CoachProtocolOutcome = {
            id: outcomeId,
            sessionId: normalized.value.sessionId,
            coachPlanId: normalized.value.coachPlanId,
            protocolId: normalized.value.protocolId,
            focusArea: normalized.value.focusArea,
            status: normalized.value.status,
            reasonCodes: normalized.value.reasonCodes,
            ...(normalized.value.note ? { note: normalized.value.note } : {}),
            recordedAt: recordedAt.toISOString(),
            ...(normalized.value.revisionOfOutcomeId ? { revisionOfOutcomeId: normalized.value.revisionOfOutcomeId } : {}),
            evidenceStrength,
            ...(conflict ? { conflict } : {}),
            coachSnapshot: coachSnapshot.value,
        };

        return {
            success: true as const,
            outcome,
        };
    } catch (err) {
        console.error('[recordCoachProtocolOutcome] Error:', err);
        return {
            success: false as const,
            error: 'Nao foi possivel registrar o resultado.',
        };
    }
}

export async function getCoachProtocolOutcomesForSession(
    sessionId: string,
): Promise<readonly CoachProtocolOutcome[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const [storedSession] = await db
            .select({ id: analysisSessions.id })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return [];
        }

        const rows = await db
            .select()
            .from(coachProtocolOutcomes)
            .where(
                and(
                    eq(coachProtocolOutcomes.analysisSessionId, sessionId),
                    eq(coachProtocolOutcomes.userId, session.user.id),
                ),
            )
            .orderBy(coachProtocolOutcomes.createdAt);

        return rows.map(toCoachProtocolOutcome);
    } catch (err) {
        console.error('[getCoachProtocolOutcomesForSession] Error:', err);
        return [];
    }
}

export async function recordSensitivityAcceptance(
    sessionId: string,
    outcome: SensitivityAcceptanceOutcome,
) {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            success: false as const,
            error: 'Nao autenticado.',
        };
    }

    try {
        const [storedSession] = await db
            .select({
                id: analysisSessions.id,
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            )
            .limit(1);

        if (!storedSession) {
            return {
                success: false as const,
                error: 'Sessao nao encontrada.',
            };
        }

        const fullResult: Record<string, unknown> = storedSession.fullResult && typeof storedSession.fullResult === 'object'
            ? storedSession.fullResult
            : {};
        const sensitivity = fullResult.sensitivity;

        if (!sensitivity || typeof sensitivity !== 'object') {
            return {
                success: false as const,
                error: 'Sessao sem recomendacao de sens.',
            };
        }

        const storedSensitivity = sensitivity as Record<string, unknown>;
        const testedProfile = storedSensitivity.recommended;

        if (testedProfile !== 'low' && testedProfile !== 'balanced' && testedProfile !== 'high') {
            return {
                success: false as const,
                error: 'Perfil de sensibilidade invalido no historico.',
            };
        }

        const acceptanceFeedback: SensitivityAcceptanceFeedback = {
            outcome,
            testedProfile,
            recordedAt: new Date().toISOString(),
        };

        await db.update(analysisSessions)
            .set({
                fullResult: {
                    ...fullResult,
                    sensitivity: {
                        ...storedSensitivity,
                        acceptanceFeedback,
                    },
                },
            })
            .where(
                and(
                    eq(analysisSessions.id, sessionId),
                    eq(analysisSessions.userId, session.user.id),
                ),
            );

        await db.update(sensitivityHistory)
            .set({ applied: false })
            .where(eq(sensitivityHistory.sessionId, sessionId));

        await db.update(sensitivityHistory)
            .set({ applied: true })
            .where(
                and(
                    eq(sensitivityHistory.sessionId, sessionId),
                    eq(sensitivityHistory.profileType, testedProfile),
                ),
            );

        revalidatePath('/history');
        revalidatePath(`/history/${sessionId}`);

        return {
            success: true as const,
            acceptanceFeedback,
        };
    } catch (err) {
        console.error('[recordSensitivityAcceptance] Error:', err);
        return {
            success: false as const,
            error: 'Erro ao salvar o resultado do teste da sens.',
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
                fullResult: analysisSessions.fullResult,
            })
            .from(analysisSessions)
            .leftJoin(
                weaponProfiles,
                sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
            )
            .where(eq(analysisSessions.userId, session.user.id))
            .orderBy(analysisSessions.createdAt);

        return result.map(({ fullResult, ...historySession }) => {
            const sensitivity = fullResult && typeof fullResult === 'object'
                ? (fullResult as Record<string, unknown>).sensitivity
                : undefined;
            const storedSensitivity = sensitivity && typeof sensitivity === 'object'
                ? sensitivity as Record<string, unknown>
                : undefined;
            const recommendedProfile = storedSensitivity?.recommended;
            const acceptanceFeedback = normalizeStoredAcceptanceFeedback(storedSensitivity?.acceptanceFeedback);

            return {
                ...historySession,
                ...(recommendedProfile === 'low' || recommendedProfile === 'balanced' || recommendedProfile === 'high'
                    ? { recommendedProfile }
                    : {}),
                ...(acceptanceFeedback ? { acceptanceFeedback } : {}),
            };
        });
    } catch (err) {
        console.error('[getHistorySessions] Error:', err);
        return [];
    }
}

export async function getPrecisionHistoryLines(): Promise<readonly PrecisionHistoryLineSummary[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const lineRows = await db
            .select({
                id: precisionEvolutionLines.id,
                compatibilityKey: precisionEvolutionLines.compatibilityKey,
                status: precisionEvolutionLines.status,
                variableInTest: precisionEvolutionLines.variableInTest,
                baselineSessionId: precisionEvolutionLines.baselineSessionId,
                currentSessionId: precisionEvolutionLines.currentSessionId,
                validClipCount: precisionEvolutionLines.validClipCount,
                blockedClipCount: precisionEvolutionLines.blockedClipCount,
                payload: precisionEvolutionLines.payload,
                createdAt: precisionEvolutionLines.createdAt,
                updatedAt: precisionEvolutionLines.updatedAt,
            })
            .from(precisionEvolutionLines)
            .where(eq(precisionEvolutionLines.userId, session.user.id))
            .orderBy(desc(precisionEvolutionLines.updatedAt));

        const lineIds = lineRows.map((line) => line.id);
        const checkpointRows = lineIds.length === 0
            ? []
            : await db
                .select({
                    id: precisionCheckpoints.id,
                    lineId: precisionCheckpoints.lineId,
                    analysisSessionId: precisionCheckpoints.analysisSessionId,
                    state: precisionCheckpoints.state,
                    variableInTest: precisionCheckpoints.variableInTest,
                    payload: precisionCheckpoints.payload,
                    createdAt: precisionCheckpoints.createdAt,
                })
                .from(precisionCheckpoints)
                .where(inArray(precisionCheckpoints.lineId, lineIds))
                .orderBy(precisionCheckpoints.createdAt);

        const checkpointsByLine = new Map<string, PrecisionHistoryCheckpointSummary[]>();

        for (const checkpoint of checkpointRows) {
            const trend = extractPrecisionTrendFromPayload(checkpoint.payload);
            const summary: PrecisionHistoryCheckpointSummary = {
                id: checkpoint.id,
                lineId: checkpoint.lineId,
                analysisSessionId: checkpoint.analysisSessionId,
                state: checkpoint.state,
                stateLabel: checkpointStateLabel(checkpoint.state),
                variableInTest: checkpoint.variableInTest,
                nextValidation: precisionNextValidation(checkpoint.payload, trend),
                blockerReasons: extractPrecisionBlockerReasons(trend),
                createdAt: checkpoint.createdAt,
            };

            checkpointsByLine.set(checkpoint.lineId, [
                ...(checkpointsByLine.get(checkpoint.lineId) ?? []),
                summary,
            ]);
        }

        return lineRows.map((line): PrecisionHistoryLineSummary => {
            const trend = extractPrecisionTrendFromPayload(line.payload);
            const blockerReasons = extractPrecisionBlockerReasons(trend);

            return {
                id: line.id,
                compatibilityKey: line.compatibilityKey,
                contextLabel: formatPrecisionContextLabel(line.compatibilityKey),
                status: line.status,
                statusLabel: trend ? formatPrecisionTrendLabel(trend.label) : checkpointStateLabel(line.status),
                variableInTest: line.variableInTest,
                nextValidation: precisionNextValidation(line.payload, trend),
                validClipCount: line.validClipCount,
                blockedClipCount: line.blockedClipCount,
                latestTrendLabel: trend?.label ?? null,
                latestTrendText: trend ? formatPrecisionTrendLabel(trend.label) : checkpointStateLabel(line.status),
                blockerReasons,
                baselineSessionId: line.baselineSessionId,
                currentSessionId: line.currentSessionId,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
                checkpoints: checkpointsByLine.get(line.id) ?? [],
            };
        });
    } catch (err) {
        console.error('[getPrecisionHistoryLines] Error:', err);
        return [];
    }
}
