import type { TrackingQualitySummary, TrackingStatusCounts } from '@/types/engine';

export interface TrackingSummarySource {
    readonly trajectory: TrackingQualitySummary;
    readonly subSessions?: readonly TrackingSummarySource[];
}

export interface TrackingOverview extends TrackingQualitySummary {
    readonly coverage: number;
    readonly confidence: number;
}

function createEmptyStatusCounts(): TrackingStatusCounts {
    return {
        tracked: 0,
        occluded: 0,
        lost: 0,
        uncertain: 0,
    };
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function deriveTrackingQuality(summary: TrackingQualitySummary): number {
    if (summary.framesProcessed <= 0) {
        return 0;
    }

    return clampUnit(
        (summary.statusCounts.tracked + (summary.statusCounts.uncertain * 0.5)) / summary.framesProcessed
    );
}

function mergeTrackingSummaries(summaries: readonly TrackingQualitySummary[]): TrackingQualitySummary {
    const statusCounts = summaries.reduce<TrackingStatusCounts>((acc, summary) => ({
        tracked: acc.tracked + summary.statusCounts.tracked,
        occluded: acc.occluded + summary.statusCounts.occluded,
        lost: acc.lost + summary.statusCounts.lost,
        uncertain: acc.uncertain + summary.statusCounts.uncertain,
    }), createEmptyStatusCounts());

    const framesTracked = summaries.reduce((total, summary) => total + summary.framesTracked, 0);
    const framesLost = summaries.reduce((total, summary) => total + summary.framesLost, 0);
    const visibleFrames = summaries.reduce((total, summary) => total + summary.visibleFrames, 0);
    const framesProcessed = summaries.reduce((total, summary) => total + summary.framesProcessed, 0);

    return {
        trackingQuality: framesProcessed > 0
            ? deriveTrackingQuality({
                trackingQuality: 0,
                framesTracked,
                framesLost,
                visibleFrames,
                framesProcessed,
                statusCounts,
            })
            : 0,
        framesTracked,
        framesLost,
        visibleFrames,
        framesProcessed,
        statusCounts,
    };
}

export function summarizeAnalysisTracking(source: TrackingSummarySource): TrackingOverview {
    const baseSummary = source.subSessions && source.subSessions.length > 0
        ? mergeTrackingSummaries(source.subSessions.map((session) => session.trajectory))
        : source.trajectory;

    const coverage = baseSummary.framesProcessed > 0
        ? baseSummary.visibleFrames / baseSummary.framesProcessed
        : 0;

    const confidence = clampUnit(
        baseSummary.trackingQuality > 0
            ? baseSummary.trackingQuality
            : deriveTrackingQuality(baseSummary)
    );

    return {
        ...baseSummary,
        trackingQuality: confidence,
        coverage: clampUnit(coverage),
        confidence,
    };
}
