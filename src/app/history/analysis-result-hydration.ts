import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { normalizePatchVersion } from '@/game/pubg';
import type { AnalysisResult } from '@/types/engine';

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

function normalizeHistoryAnalysisResult(result: AnalysisResult): AnalysisResult {
    const trajectory = result.trajectory as AnalysisResult['trajectory'] | undefined;
    const normalizedSubSessions = result.subSessions?.map(normalizeHistoryAnalysisResult);

    if (!trajectory || typeof trajectory !== 'object') {
        return {
            ...result,
            ...(normalizedSubSessions ? { subSessions: normalizedSubSessions } : {}),
        };
    }

    return {
        ...result,
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
