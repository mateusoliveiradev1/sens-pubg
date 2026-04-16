import type { TrackingPoint } from '../types/engine';
import type { Milliseconds } from '../types/branded';
import { asMilliseconds, asPixels } from '../types/branded';

export interface ShotAlignmentResult {
    readonly startMs: Milliseconds;
    readonly leadingFramesSkipped: number;
    readonly errorSummary: ShotAlignmentErrorSummary;
    readonly alignedPoints: readonly TrackingPoint[];
}

export interface ShotAlignmentErrorSummary {
    readonly sampleCount: number;
    readonly meanErrorMs: number;
    readonly maxErrorMs: number;
}

export interface AlignTrackingPointsToShotsOptions {
    readonly onsetDisplacementThresholdPx?: number;
    readonly referencePoints?: readonly TrackingPoint[];
}

const DEFAULT_ONSET_DISPLACEMENT_THRESHOLD_PX = 1;

function interpolateTrackingPointAtTime(
    points: readonly TrackingPoint[],
    targetTimeMs: number,
    alignedFrameIndex: number
): TrackingPoint {
    let left = points[0]!;
    let right = points[points.length - 1]!;

    for (let index = 0; index < points.length - 1; index++) {
        const current = points[index]!;
        const next = points[index + 1]!;

        if (Number(current.timestamp) <= targetTimeMs && Number(next.timestamp) >= targetTimeMs) {
            left = current;
            right = next;
            break;
        }
    }

    const leftTimeMs = Number(left.timestamp);
    const rightTimeMs = Number(right.timestamp);
    const ratio = rightTimeMs > leftTimeMs
        ? (targetTimeMs - leftTimeMs) / (rightTimeMs - leftTimeMs)
        : 0;

    return {
        frame: alignedFrameIndex,
        timestamp: asMilliseconds(targetTimeMs),
        x: asPixels(Number(left.x) + ((Number(right.x) - Number(left.x)) * ratio)),
        y: asPixels(Number(left.y) + ((Number(right.y) - Number(left.y)) * ratio)),
        confidence: left.confidence,
    };
}

function displacementMagnitudePx(previous: TrackingPoint, current: TrackingPoint): number {
    return Math.hypot(
        Number(current.x) - Number(previous.x),
        Number(current.y) - Number(previous.y)
    );
}

function findAlignmentStartIndex(
    points: readonly TrackingPoint[],
    onsetDisplacementThresholdPx: number
): number {
    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const current = points[index];

        if (!previous || !current) {
            continue;
        }

        if (displacementMagnitudePx(previous, current) >= onsetDisplacementThresholdPx) {
            // Only skip the lead-in when there is clear evidence of dead frames
            // before the first visible recoil movement.
            return index > 1 ? index : 0;
        }
    }

    return 0;
}

export function alignTrackingPointsToShots(
    points: readonly TrackingPoint[],
    msPerShot: number,
    options: AlignTrackingPointsToShotsOptions = {}
): ShotAlignmentResult {
    if (points.length === 0) {
        return {
            startMs: asMilliseconds(0),
            leadingFramesSkipped: 0,
            errorSummary: {
                sampleCount: 0,
                meanErrorMs: 0,
                maxErrorMs: 0,
            },
            alignedPoints: [],
        };
    }

    if (points.length === 1 || msPerShot <= 0) {
        return {
            startMs: points[0]!.timestamp,
            leadingFramesSkipped: 0,
            errorSummary: {
                sampleCount: 1,
                meanErrorMs: 0,
                maxErrorMs: 0,
            },
            alignedPoints: [{ ...points[0]!, frame: 0 }],
        };
    }

    const referencePoints = options.referencePoints ?? points;
    const alignmentStartIndex = findAlignmentStartIndex(
        referencePoints,
        options.onsetDisplacementThresholdPx ?? DEFAULT_ONSET_DISPLACEMENT_THRESHOLD_PX
    );
    const startTimeMs = Number(referencePoints[alignmentStartIndex]!.timestamp);
    const baselineStartTimeMs = Number(points[0]!.timestamp);
    const lastTimeMs = Number(points[points.length - 1]!.timestamp);
    const alignedPoints: TrackingPoint[] = [];

    for (
        let alignedFrameIndex = 0, targetTimeMs = startTimeMs;
        targetTimeMs <= lastTimeMs;
        alignedFrameIndex++, targetTimeMs += msPerShot
    ) {
        alignedPoints.push(
            interpolateTrackingPointAtTime(points, targetTimeMs, alignedFrameIndex)
        );
    }

    const errorSummary = summarizeShotAlignmentError(
        alignedPoints.map((point) => Number(point.timestamp)),
        alignedPoints.map((_, index) => baselineStartTimeMs + (index * msPerShot))
    );

    return {
        startMs: asMilliseconds(startTimeMs),
        leadingFramesSkipped: alignmentStartIndex,
        errorSummary,
        alignedPoints,
    };
}

export function summarizeShotAlignmentError(
    alignedTimestamps: readonly number[],
    expectedTimestamps: readonly number[]
): ShotAlignmentErrorSummary {
    const sampleCount = Math.min(alignedTimestamps.length, expectedTimestamps.length);

    if (sampleCount === 0) {
        return {
            sampleCount: 0,
            meanErrorMs: 0,
            maxErrorMs: 0,
        };
    }

    let totalErrorMs = 0;
    let maxErrorMs = 0;

    for (let index = 0; index < sampleCount; index++) {
        const errorMs = Math.abs(alignedTimestamps[index]! - expectedTimestamps[index]!);
        totalErrorMs += errorMs;
        maxErrorMs = Math.max(maxErrorMs, errorMs);
    }

    return {
        sampleCount,
        meanErrorMs: totalErrorMs / sampleCount,
        maxErrorMs,
    };
}
