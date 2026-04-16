import type {
    SprayTrajectory,
    TrackingFrameObservation,
    TrackingPoint,
    TrackingQualitySummary,
    TrackingStatusCounts,
} from '@/types/engine';

type TrackingSummaryTrajectory = TrackingQualitySummary & Partial<Pick<
    SprayTrajectory,
    'durationMs' | 'points' | 'trackingFrames'
>>;

export interface TrackingSummarySource {
    readonly trajectory: TrackingSummaryTrajectory;
    readonly subSessions?: readonly TrackingSummarySource[];
}

export interface TrackingOverview extends TrackingQualitySummary {
    readonly coverage: number;
    readonly confidence: number;
    readonly effectiveWindowStartMs: number | null;
    readonly effectiveWindowEndMs: number | null;
    readonly effectiveWindowMs: number;
    readonly reacquisitionEvents: number;
    readonly meanReacquisitionFrames: number;
    readonly maxReacquisitionFrames: number;
}

interface TrackingTechnicalDetails {
    readonly effectiveWindowStartMs: number | null;
    readonly effectiveWindowEndMs: number | null;
    readonly effectiveWindowMs: number;
    readonly reacquisitionEvents: number;
    readonly meanReacquisitionFrames: number;
    readonly maxReacquisitionFrames: number;
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

function getWindowFromTimedSamples(
    samples: readonly (TrackingFrameObservation | TrackingPoint)[]
): Pick<TrackingTechnicalDetails, 'effectiveWindowStartMs' | 'effectiveWindowEndMs' | 'effectiveWindowMs'> | null {
    if (samples.length === 0) {
        return null;
    }

    const firstSample = samples[0]!;
    const lastSample = samples[samples.length - 1]!;
    const startMs = Number(firstSample.timestamp);
    const endMs = Number(lastSample.timestamp);

    return {
        effectiveWindowStartMs: startMs,
        effectiveWindowEndMs: endMs,
        effectiveWindowMs: Math.max(0, endMs - startMs),
    };
}

function summarizeTechnicalDetails(trajectory: TrackingSummaryTrajectory): TrackingTechnicalDetails {
    const trackingFrames = trajectory.trackingFrames ?? [];
    const reacquisitionValues = trackingFrames
        .map((frame) => frame.reacquisitionFrames)
        .filter((frames): frames is number => typeof frames === 'number' && frames > 0);
    const window = getWindowFromTimedSamples(trackingFrames)
        ?? getWindowFromTimedSamples(trajectory.points ?? []);
    const fallbackDurationMs = Number(trajectory.durationMs ?? 0);

    return {
        effectiveWindowStartMs: window?.effectiveWindowStartMs ?? null,
        effectiveWindowEndMs: window?.effectiveWindowEndMs ?? null,
        effectiveWindowMs: window?.effectiveWindowMs ?? Math.max(0, fallbackDurationMs),
        reacquisitionEvents: reacquisitionValues.length,
        meanReacquisitionFrames: reacquisitionValues.length > 0
            ? reacquisitionValues.reduce((sum, frames) => sum + frames, 0) / reacquisitionValues.length
            : 0,
        maxReacquisitionFrames: reacquisitionValues.length > 0
            ? Math.max(...reacquisitionValues)
            : 0,
    };
}

function mergeTechnicalDetails(details: readonly TrackingTechnicalDetails[]): TrackingTechnicalDetails {
    const reacquisitionEvents = details.reduce((sum, detail) => sum + detail.reacquisitionEvents, 0);
    const weightedReacquisitionTotal = details.reduce(
        (sum, detail) => sum + (detail.meanReacquisitionFrames * detail.reacquisitionEvents),
        0
    );

    return {
        effectiveWindowStartMs: details.length === 1 ? details[0]!.effectiveWindowStartMs : null,
        effectiveWindowEndMs: details.length === 1 ? details[0]!.effectiveWindowEndMs : null,
        effectiveWindowMs: details.reduce((sum, detail) => sum + detail.effectiveWindowMs, 0),
        reacquisitionEvents,
        meanReacquisitionFrames: reacquisitionEvents > 0
            ? weightedReacquisitionTotal / reacquisitionEvents
            : 0,
        maxReacquisitionFrames: details.reduce(
            (max, detail) => Math.max(max, detail.maxReacquisitionFrames),
            0
        ),
    };
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
    const technicalDetails = source.subSessions && source.subSessions.length > 0
        ? mergeTechnicalDetails(source.subSessions.map((session) => summarizeTechnicalDetails(session.trajectory)))
        : summarizeTechnicalDetails(source.trajectory);

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
        ...technicalDetails,
        trackingQuality: confidence,
        coverage: clampUnit(coverage),
        confidence,
    };
}
