import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { normalizePatchVersion } from '@/game/pubg';
import type { AnalysisResult } from '@/types/engine';

export interface HydrateAnalysisResultFromHistoryInput {
    readonly fullResult: Record<string, unknown>;
    readonly recordPatchVersion: string;
    readonly scopeId: string;
    readonly distanceMeters: number;
}

export function hydrateAnalysisResultFromHistory(
    input: HydrateAnalysisResultFromHistoryInput
): AnalysisResult {
    const patchVersion = normalizePatchVersion(
        typeof input.fullResult.patchVersion === 'string'
            ? input.fullResult.patchVersion
            : input.recordPatchVersion
    );

    return {
        ...input.fullResult,
        patchVersion,
        analysisContext: input.fullResult.analysisContext ?? createAnalysisContext({
            patchVersion,
            scopeId: input.scopeId,
            distanceMeters: input.distanceMeters,
        }),
    } as AnalysisResult;
}
