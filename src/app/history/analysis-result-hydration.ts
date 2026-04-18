import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { localizeStoredCoachPlanPtBr } from '@/core/coach-plan-builder';
import { normalizePatchVersion } from '@/game/pubg';
import type {
    AnalysisResult,
    ProfileType,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
} from '@/types/engine';

type HistoryCoachPlan = NonNullable<AnalysisResult['coachPlan']>;
type HistoryCoachPriority = HistoryCoachPlan['primaryFocus'];
type HistoryCoachActionProtocol = HistoryCoachPlan['actionProtocols'][number];
type HistoryCoachBlockPlan = HistoryCoachPlan['nextBlock'];
type HistoryCoachValidationCheck = HistoryCoachBlockPlan['checks'][number];

export interface HydrateAnalysisResultFromHistoryInput {
    readonly fullResult: Record<string, unknown>;
    readonly recordPatchVersion: string;
    readonly scopeId: string;
    readonly distanceMeters: number;
}

function normalizeCount(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, value)
        : fallback;
}

function normalizeTrackingStatusCounts(
    trajectory: AnalysisResult['trajectory']
): AnalysisResult['trajectory']['statusCounts'] {
    const existing = trajectory.statusCounts;
    const framesProcessed = normalizeCount(trajectory.framesProcessed, 0);
    const framesLost = normalizeCount(trajectory.framesLost, 0);
    const visibleFrames = normalizeCount(trajectory.visibleFrames, trajectory.framesTracked);

    const tracked = normalizeCount(existing?.tracked, Math.min(visibleFrames, framesProcessed));
    const uncertain = normalizeCount(existing?.uncertain, 0);
    const lost = normalizeCount(existing?.lost, Math.min(framesLost, framesProcessed));
    const occludedFallback = Math.max(0, framesProcessed - tracked - uncertain - lost);
    const occluded = normalizeCount(existing?.occluded, occludedFallback);

    return {
        tracked,
        occluded,
        lost,
        uncertain,
    };
}

function normalizeSensitivityAcceptanceOutcome(
    value: unknown,
): SensitivityAcceptanceOutcome | undefined {
    return value === 'improved' || value === 'same' || value === 'worse'
        ? value
        : undefined;
}

function normalizeSensitivityAcceptanceFeedback(
    value: unknown,
): SensitivityAcceptanceFeedback | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const feedback = value as Partial<SensitivityAcceptanceFeedback>;
    const outcome = normalizeSensitivityAcceptanceOutcome(feedback.outcome);
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

function normalizeSensitivityRecommendation(
    result: AnalysisResult
): AnalysisResult['sensitivity'] | undefined {
    const sensitivity = result.sensitivity;

    if (!sensitivity || typeof sensitivity !== 'object') {
        return sensitivity;
    }

    const evidenceTier = sensitivity.evidenceTier ?? 'moderate';
    const confidenceScore = typeof sensitivity.confidenceScore === 'number'
        ? sensitivity.confidenceScore
        : 0.5;
    const clipCount = result.subSessions?.length ?? 1;
    const hasLegacyRecommendationMetadata = sensitivity.evidenceTier !== undefined || typeof sensitivity.confidenceScore === 'number';
    const {
        acceptanceFeedback: rawAcceptanceFeedback,
        ...restSensitivity
    } = sensitivity;
    const tier = sensitivity.tier
        ?? (!hasLegacyRecommendationMetadata
            ? 'test_profiles'
            : evidenceTier === 'weak' || confidenceScore < 0.58
            ? 'capture_again'
            : evidenceTier === 'strong' && confidenceScore >= 0.8 && clipCount >= 3
                ? 'apply_ready'
                : 'test_profiles');
    const acceptanceFeedback = normalizeSensitivityAcceptanceFeedback(rawAcceptanceFeedback);

    return {
        ...restSensitivity,
        evidenceTier,
        confidenceScore,
        tier,
        ...(acceptanceFeedback ? { acceptanceFeedback } : {}),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCoachDecisionTier(value: unknown): value is HistoryCoachPlan['tier'] {
    return value === 'capture_again'
        || value === 'test_protocol'
        || value === 'stabilize_block'
        || value === 'apply_protocol';
}

function isCoachFocusArea(value: unknown): value is HistoryCoachPriority['area'] {
    return value === 'capture_quality'
        || value === 'vertical_control'
        || value === 'horizontal_control'
        || value === 'timing'
        || value === 'consistency'
        || value === 'sensitivity'
        || value === 'loadout'
        || value === 'validation';
}

function isCoachSignalSource(value: unknown): value is HistoryCoachPriority['signals'][number]['source'] {
    return value === 'video_quality'
        || value === 'diagnosis'
        || value === 'sensitivity'
        || value === 'history'
        || value === 'context';
}

function isCoachProtocolKind(value: unknown): value is HistoryCoachActionProtocol['kind'] {
    return value === 'capture'
        || value === 'technique'
        || value === 'sens'
        || value === 'loadout'
        || value === 'drill';
}

function isCoachProtocolRisk(value: unknown): value is HistoryCoachActionProtocol['risk'] {
    return value === 'low' || value === 'medium' || value === 'high';
}

function isCoachSignal(value: unknown): value is HistoryCoachPriority['signals'][number] {
    return isRecord(value)
        && isCoachSignalSource(value.source)
        && isCoachFocusArea(value.area)
        && typeof value.key === 'string'
        && typeof value.summary === 'string'
        && isFiniteNumber(value.confidence)
        && isFiniteNumber(value.coverage)
        && isFiniteNumber(value.weight);
}

function isCoachPriority(value: unknown): value is HistoryCoachPriority {
    return isRecord(value)
        && typeof value.id === 'string'
        && isCoachFocusArea(value.area)
        && typeof value.title === 'string'
        && typeof value.whyNow === 'string'
        && isFiniteNumber(value.priorityScore)
        && isFiniteNumber(value.severity)
        && isFiniteNumber(value.confidence)
        && isFiniteNumber(value.coverage)
        && isStringArray(value.dependencies)
        && isStringArray(value.blockedBy)
        && Array.isArray(value.signals)
        && value.signals.every(isCoachSignal);
}

function isCoachActionProtocol(value: unknown): value is HistoryCoachActionProtocol {
    return isRecord(value)
        && typeof value.id === 'string'
        && isCoachProtocolKind(value.kind)
        && typeof value.instruction === 'string'
        && typeof value.expectedEffect === 'string'
        && isCoachProtocolRisk(value.risk)
        && typeof value.applyWhen === 'string'
        && (value.avoidWhen === undefined || typeof value.avoidWhen === 'string');
}

function isCoachValidationCheck(value: unknown): value is HistoryCoachValidationCheck {
    return isRecord(value)
        && typeof value.label === 'string'
        && typeof value.target === 'string'
        && isFiniteNumber(value.minimumCoverage)
        && isFiniteNumber(value.minimumConfidence)
        && typeof value.successCondition === 'string'
        && typeof value.failCondition === 'string';
}

function isCoachBlockPlan(value: unknown): value is HistoryCoachBlockPlan {
    return isRecord(value)
        && typeof value.title === 'string'
        && isFiniteNumber(value.durationMinutes)
        && isStringArray(value.steps)
        && Array.isArray(value.checks)
        && value.checks.every(isCoachValidationCheck);
}

function isCoachPlan(value: unknown): value is HistoryCoachPlan {
    return isRecord(value)
        && isCoachDecisionTier(value.tier)
        && typeof value.sessionSummary === 'string'
        && isCoachPriority(value.primaryFocus)
        && Array.isArray(value.secondaryFocuses)
        && value.secondaryFocuses.every(isCoachPriority)
        && Array.isArray(value.actionProtocols)
        && value.actionProtocols.every(isCoachActionProtocol)
        && isCoachBlockPlan(value.nextBlock)
        && isStringArray(value.stopConditions)
        && isFiniteNumber(value.adaptationWindowDays)
        && typeof value.llmRewriteAllowed === 'boolean';
}

function normalizeCoachPlan(value: unknown): HistoryCoachPlan | undefined {
    return isCoachPlan(value) ? localizeStoredCoachPlanPtBr(value) : undefined;
}

function normalizeHistoryAnalysisResult(result: AnalysisResult): AnalysisResult {
    const trajectory = result.trajectory as AnalysisResult['trajectory'] | undefined;
    const normalizedSubSessions = result.subSessions?.map(normalizeHistoryAnalysisResult);
    const normalizedCoachPlan = normalizeCoachPlan(result.coachPlan);
    const resultWithoutCoachPlan = { ...result };
    delete resultWithoutCoachPlan.coachPlan;

    if (!trajectory || typeof trajectory !== 'object') {
        return {
            ...resultWithoutCoachPlan,
            ...(result.sensitivity ? { sensitivity: normalizeSensitivityRecommendation(result)! } : {}),
            ...(normalizedCoachPlan ? { coachPlan: normalizedCoachPlan } : {}),
            ...(normalizedSubSessions ? { subSessions: normalizedSubSessions } : {}),
        };
    }

    return {
        ...resultWithoutCoachPlan,
        ...(result.sensitivity ? { sensitivity: normalizeSensitivityRecommendation(result)! } : {}),
        ...(normalizedCoachPlan ? { coachPlan: normalizedCoachPlan } : {}),
        trajectory: {
            ...trajectory,
            statusCounts: normalizeTrackingStatusCounts(trajectory),
        },
        ...(normalizedSubSessions ? { subSessions: normalizedSubSessions } : {}),
    };
}

export function hydrateAnalysisResultFromHistory(
    input: HydrateAnalysisResultFromHistoryInput
): AnalysisResult {
    const patchVersion = normalizePatchVersion(
        typeof input.fullResult.patchVersion === 'string'
            ? input.fullResult.patchVersion
            : input.recordPatchVersion
    );

    return normalizeHistoryAnalysisResult({
        ...input.fullResult,
        patchVersion,
        analysisContext: input.fullResult.analysisContext ?? createAnalysisContext({
            patchVersion,
            scopeId: input.scopeId,
            distanceMeters: input.distanceMeters,
        }),
    } as AnalysisResult);
}
