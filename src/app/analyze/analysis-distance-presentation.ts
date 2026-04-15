import type { AnalysisDistanceMode } from '@/types/engine';

export interface AnalysisDistancePresentationInput {
    readonly targetDistanceMeters?: number | undefined;
    readonly distanceMode?: AnalysisDistanceMode | undefined;
    readonly distanceNote?: string | undefined;
}

export interface AnalysisDistancePresentation {
    readonly badgeLabel: string;
    readonly inlineLabel: string;
    readonly note?: string;
}

const DEFAULT_DISTANCE_METERS = 30;

function withOptionalNote(note: string | undefined): Pick<AnalysisDistancePresentation, 'note'> | Record<string, never> {
    return note ? { note } : {};
}

export function formatAnalysisDistancePresentation(
    input: AnalysisDistancePresentationInput
): AnalysisDistancePresentation {
    const targetDistanceMeters = input.targetDistanceMeters ?? DEFAULT_DISTANCE_METERS;
    const distanceMode = input.distanceMode ?? 'exact';

    switch (distanceMode) {
        case 'estimated':
            return {
                badgeLabel: `Distancia aprox. ${targetDistanceMeters}m`,
                inlineLabel: `aprox. ${targetDistanceMeters}m`,
                ...withOptionalNote(input.distanceNote),
            };
        case 'unknown':
            return {
                badgeLabel: `Distancia ref. ${targetDistanceMeters}m`,
                inlineLabel: `ref. ${targetDistanceMeters}m`,
                ...withOptionalNote(input.distanceNote),
            };
        case 'exact':
        default:
            return {
                badgeLabel: `Distancia ${targetDistanceMeters}m`,
                inlineLabel: `${targetDistanceMeters}m`,
                ...withOptionalNote(input.distanceNote),
            };
    }
}
