import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { normalizePatchVersion } from '@/game/pubg';
import type {
    AnalysisResult,
    ProfileType,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
} from '@/types/engine';

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

function normalizeHistoryAnalysisResult(result: AnalysisResult): AnalysisResult {
    const trajectory = result.trajectory as AnalysisResult['trajectory'] | undefined;
    const normalizedSubSessions = result.subSessions?.map(normalizeHistoryAnalysisResult);

    if (!trajectory || typeof trajectory !== 'object') {
        return {
            ...result,
            ...(result.sensitivity ? { sensitivity: normalizeSensitivityRecommendation(result)! } : {}),
            ...(normalizedSubSessions ? { subSessions: normalizedSubSessions } : {}),
        };
    }

    return {
        ...result,
        ...(result.sensitivity ? { sensitivity: normalizeSensitivityRecommendation(result)! } : {}),
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
