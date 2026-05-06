import { createAnalysisContext } from '@/app/analyze/analysis-context';
import {
    isCoachProtocolOutcomeReasonCode,
    isCoachProtocolOutcomeStatus,
} from '@/core/coach-outcomes';
import { localizeStoredCoachPlanPtBr } from '@/core/coach-plan-builder';
import { resolveMeasurementTruth } from '@/core/measurement-truth';
import { normalizePatchVersion } from '@/game/pubg';
import type {
    AnalysisResult,
    CoachOutcomeConflict,
    CoachOutcomeEvidenceStrength,
    ProfileType,
    CoachProtocolOutcome,
    CoachProtocolOutcomeCoachSnapshot,
    CoachProtocolOutcomeSnapshot,
    PrecisionEvidenceLevel,
    PrecisionPillarDeltaStatus,
    PrecisionPillarKey,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
    SprayActionLabel,
    SprayActionState,
    SprayMastery,
    SprayMechanicalLevel,
    SprayMechanicalLevelLabel,
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

function isCoachOutcomeEvidenceStrength(value: unknown): value is CoachOutcomeEvidenceStrength {
    return value === 'none'
        || value === 'weak_self_report'
        || value === 'neutral'
        || value === 'invalid'
        || value === 'conflict'
        || value === 'confirmed_by_compatible_clip';
}

function isCoachOutcomeConflict(value: unknown): value is CoachOutcomeConflict {
    return isRecord(value)
        && typeof value.userOutcomeId === 'string'
        && isPrecisionTrendLabel(value.precisionTrendLabel)
        && typeof value.reason === 'string'
        && typeof value.nextValidationCopy === 'string';
}

function isCoachProtocolOutcomeCoachSnapshot(value: unknown): value is CoachProtocolOutcomeCoachSnapshot {
    return isRecord(value)
        && isCoachDecisionTier(value.tier)
        && isCoachFocusArea(value.primaryFocusArea)
        && typeof value.primaryFocusTitle === 'string'
        && typeof value.protocolId === 'string'
        && typeof value.validationTarget === 'string'
        && (value.precisionTrendLabel === undefined || isPrecisionTrendLabel(value.precisionTrendLabel));
}

function isCoachProtocolOutcome(value: unknown): value is CoachProtocolOutcome {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.sessionId === 'string'
        && typeof value.coachPlanId === 'string'
        && typeof value.protocolId === 'string'
        && isCoachFocusArea(value.focusArea)
        && isCoachProtocolOutcomeStatus(value.status)
        && Array.isArray(value.reasonCodes)
        && value.reasonCodes.every(isCoachProtocolOutcomeReasonCode)
        && (value.note === undefined || typeof value.note === 'string')
        && typeof value.recordedAt === 'string'
        && (value.revisionOfOutcomeId === undefined || typeof value.revisionOfOutcomeId === 'string')
        && isCoachOutcomeEvidenceStrength(value.evidenceStrength)
        && (value.conflict === undefined || isCoachOutcomeConflict(value.conflict))
        && (value.coachSnapshot === undefined || isCoachProtocolOutcomeCoachSnapshot(value.coachSnapshot));
}

function normalizeCoachOutcomeSnapshot(value: unknown): CoachProtocolOutcomeSnapshot | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const latest = value.latest;
    const revisions = value.revisions;
    const conflicts = value.conflicts;

    if (
        latest !== null && !isCoachProtocolOutcome(latest)
        || !Array.isArray(revisions)
        || !revisions.every(isCoachProtocolOutcome)
        || typeof value.pending !== 'boolean'
        || typeof value.validationCta !== 'string'
        || !Array.isArray(conflicts)
        || !conflicts.every(isCoachOutcomeConflict)
    ) {
        return undefined;
    }

    return {
        latest,
        revisions,
        pending: value.pending,
        validationCta: value.validationCta,
        conflicts,
    };
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

function isPrecisionTrendLabel(value: unknown): value is PrecisionTrendLabel {
    return value === 'baseline'
        || value === 'initial_signal'
        || value === 'in_validation'
        || value === 'validated_progress'
        || value === 'validated_regression'
        || value === 'oscillation'
        || value === 'not_comparable'
        || value === 'consolidated';
}

function isPrecisionEvidenceLevel(value: unknown): value is PrecisionEvidenceLevel {
    return value === 'blocked'
        || value === 'baseline'
        || value === 'initial'
        || value === 'weak'
        || value === 'sufficient'
        || value === 'strong';
}

function isPrecisionPillarKey(value: unknown): value is PrecisionPillarKey {
    return value === 'control'
        || value === 'consistency'
        || value === 'confidence'
        || value === 'clipQuality';
}

function isPrecisionPillarDeltaStatus(value: unknown): value is PrecisionPillarDeltaStatus {
    return value === 'improved' || value === 'declined' || value === 'stable';
}

function isPrecisionClipSummary(value: unknown): boolean {
    return value === null || (
        isRecord(value)
        && typeof value.resultId === 'string'
        && typeof value.timestamp === 'string'
        && isFiniteNumber(value.actionableScore)
        && isFiniteNumber(value.mechanicalScore)
        && isFiniteNumber(value.coverage)
        && isFiniteNumber(value.confidence)
        && isFiniteNumber(value.clipQuality)
    );
}

function isPrecisionRecentWindow(value: unknown): boolean {
    return value === null || (
        isRecord(value)
        && isFiniteNumber(value.count)
        && isStringArray(value.resultIds)
        && isFiniteNumber(value.actionableAverage)
        && isFiniteNumber(value.mechanicalAverage)
        && isFiniteNumber(value.coverageAverage)
        && isFiniteNumber(value.confidenceAverage)
        && isFiniteNumber(value.clipQualityAverage)
    );
}

function isPrecisionScoreDelta(value: unknown): boolean {
    return value === null || (
        isRecord(value)
        && isFiniteNumber(value.baseline)
        && isFiniteNumber(value.current)
        && isFiniteNumber(value.delta)
        && isFiniteNumber(value.recentWindowAverage)
        && isFiniteNumber(value.recentWindowDelta)
    );
}

function isPrecisionPillarDelta(value: unknown): boolean {
    return isRecord(value)
        && isPrecisionPillarKey(value.pillar)
        && isFiniteNumber(value.baseline)
        && isFiniteNumber(value.current)
        && isFiniteNumber(value.delta)
        && isFiniteNumber(value.recentWindowAverage)
        && isFiniteNumber(value.recentWindowDelta)
        && isPrecisionPillarDeltaStatus(value.status);
}

function isPrecisionRecurringDiagnosis(value: unknown): boolean {
    return isRecord(value)
        && typeof value.type === 'string'
        && typeof value.label === 'string'
        && isFiniteNumber(value.count)
        && isFiniteNumber(value.supportRatio);
}

function isPrecisionBlockerSummary(value: unknown): boolean {
    return isRecord(value)
        && typeof value.code === 'string'
        && isFiniteNumber(value.count)
        && typeof value.message === 'string'
        && isStringArray(value.resultIds);
}

function isPrecisionBlockedClip(value: unknown): boolean {
    return isRecord(value)
        && typeof value.resultId === 'string'
        && Array.isArray(value.blockers);
}

function isPrecisionTrendSummary(value: unknown): value is PrecisionTrendSummary {
    return isRecord(value)
        && isPrecisionTrendLabel(value.label)
        && isPrecisionEvidenceLevel(value.evidenceLevel)
        && isFiniteNumber(value.compatibleCount)
        && isPrecisionClipSummary(value.baseline)
        && isPrecisionClipSummary(value.current)
        && isPrecisionRecentWindow(value.recentWindow)
        && isPrecisionScoreDelta(value.actionableDelta)
        && isPrecisionScoreDelta(value.mechanicalDelta)
        && Array.isArray(value.pillarDeltas)
        && value.pillarDeltas.every(isPrecisionPillarDelta)
        && Array.isArray(value.recurringDiagnoses)
        && value.recurringDiagnoses.every(isPrecisionRecurringDiagnosis)
        && Array.isArray(value.blockerSummaries)
        && value.blockerSummaries.every(isPrecisionBlockerSummary)
        && Array.isArray(value.blockedClips)
        && value.blockedClips.every(isPrecisionBlockedClip)
        && isFiniteNumber(value.confidence)
        && isFiniteNumber(value.coverage)
        && typeof value.nextValidationHint === 'string';
}

function normalizePrecisionTrend(value: unknown): PrecisionTrendSummary | undefined {
    return isPrecisionTrendSummary(value) ? value : undefined;
}

function isSprayActionState(value: unknown): value is SprayActionState {
    return value === 'capture_again'
        || value === 'inconclusive'
        || value === 'testable'
        || value === 'ready';
}

function isSprayActionLabel(value: unknown): value is SprayActionLabel {
    return value === 'Capturar de novo'
        || value === 'Incerto'
        || value === 'Testavel'
        || value === 'Pronto';
}

function isSprayMechanicalLevel(value: unknown): value is SprayMechanicalLevel {
    return value === 'initial'
        || value === 'intermediate'
        || value === 'advanced'
        || value === 'elite';
}

function isSprayMechanicalLevelLabel(value: unknown): value is SprayMechanicalLevelLabel {
    return value === 'Inicial'
        || value === 'Intermediario'
        || value === 'Avancado'
        || value === 'Elite';
}

function isSprayMastery(value: unknown): value is SprayMastery {
    if (!isRecord(value)) {
        return false;
    }

    return isSprayActionState(value.actionState)
        && isSprayActionLabel(value.actionLabel)
        && isSprayMechanicalLevel(value.mechanicalLevel)
        && isSprayMechanicalLevelLabel(value.mechanicalLevelLabel)
        && isFiniteNumber(value.actionableScore)
        && isFiniteNumber(value.mechanicalScore)
        && isRecord(value.pillars)
        && isFiniteNumber(value.pillars.control)
        && isFiniteNumber(value.pillars.consistency)
        && isFiniteNumber(value.pillars.confidence)
        && isFiniteNumber(value.pillars.clipQuality)
        && isRecord(value.evidence)
        && isFiniteNumber(value.evidence.coverage)
        && isFiniteNumber(value.evidence.confidence)
        && isFiniteNumber(value.evidence.visibleFrames)
        && isFiniteNumber(value.evidence.lostFrames)
        && isFiniteNumber(value.evidence.framesProcessed)
        && isFiniteNumber(value.evidence.sampleSize)
        && isFiniteNumber(value.evidence.qualityScore)
        && typeof value.evidence.usableForAnalysis === 'boolean'
        && isStringArray(value.reasons)
        && isStringArray(value.blockedRecommendations);
}

function normalizeMastery(result: AnalysisResult): SprayMastery | undefined {
    if (isSprayMastery(result.mastery)) {
        return result.mastery;
    }

    if (!result.metrics || !result.trajectory || !result.sensitivity) {
        return undefined;
    }

    try {
        return resolveMeasurementTruth(result);
    } catch {
        return undefined;
    }
}

function normalizeHistoryAnalysisResult(result: AnalysisResult): AnalysisResult {
    const trajectory = result.trajectory as AnalysisResult['trajectory'] | undefined;
    const normalizedSubSessions = result.subSessions?.map(normalizeHistoryAnalysisResult);
    const normalizedCoachPlan = normalizeCoachPlan(result.coachPlan);
    const normalizedCoachOutcomeSnapshot = normalizeCoachOutcomeSnapshot(result.coachOutcomeSnapshot);
    const normalizedPrecisionTrend = normalizePrecisionTrend(result.precisionTrend);
    const resultWithoutCoachPlan = { ...result };
    delete resultWithoutCoachPlan.coachPlan;
    delete resultWithoutCoachPlan.coachOutcomeSnapshot;
    delete resultWithoutCoachPlan.mastery;
    delete resultWithoutCoachPlan.precisionTrend;
    const normalizedSensitivity = result.sensitivity
        ? normalizeSensitivityRecommendation(result)!
        : undefined;
    const baseResult = {
        ...resultWithoutCoachPlan,
        ...(normalizedSensitivity ? { sensitivity: normalizedSensitivity } : {}),
        ...(normalizedCoachPlan ? { coachPlan: normalizedCoachPlan } : {}),
        ...(normalizedCoachOutcomeSnapshot ? { coachOutcomeSnapshot: normalizedCoachOutcomeSnapshot } : {}),
        ...(normalizedPrecisionTrend ? { precisionTrend: normalizedPrecisionTrend } : {}),
        ...(normalizedSubSessions ? { subSessions: normalizedSubSessions } : {}),
    } as AnalysisResult;

    if (!trajectory || typeof trajectory !== 'object') {
        const normalizedMastery = normalizeMastery(baseResult);

        return {
            ...baseResult,
            ...(normalizedMastery ? { mastery: normalizedMastery } : {}),
        };
    }

    const normalizedResult = {
        ...baseResult,
        trajectory: {
            ...trajectory,
            statusCounts: normalizeTrackingStatusCounts(trajectory),
        },
    };
    const normalizedMastery = normalizeMastery(normalizedResult);

    return {
        ...normalizedResult,
        ...(normalizedMastery ? { mastery: normalizedMastery } : {}),
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
