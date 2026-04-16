import { asMilliseconds, asPixels } from '@/types/branded';
import type {
    ReticleExogenousDisturbance,
    ReticleObservation,
    TrackingFrameObservation,
    TrackingPoint,
    TrackingQualitySummary,
} from '@/types/engine';

export interface WorkerTrackingPoint {
    readonly frame: number;
    readonly timestamp: number;
    readonly x: number;
    readonly y: number;
    readonly confidence: number;
}

export type WorkerTrackingFrame = ReticleObservation<number, number>;

export interface WorkerTrackingResult extends TrackingQualitySummary {
    readonly points: readonly WorkerTrackingPoint[];
    readonly trackingFrames: readonly WorkerTrackingFrame[];
}

export interface EngineTrackingResult extends TrackingQualitySummary {
    readonly points: readonly TrackingPoint[];
    readonly trackingFrames: readonly TrackingFrameObservation[];
}

export interface PointErrorReference {
    readonly frame: number;
    readonly x: number;
    readonly y: number;
}

export interface PointErrorSummary {
    readonly sampleCount: number;
    readonly meanErrorPx: number;
    readonly maxErrorPx: number;
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function clampDisturbance(
    disturbance: ReticleExogenousDisturbance
): ReticleExogenousDisturbance {
    return {
        muzzleFlash: clampUnit(disturbance.muzzleFlash),
        blur: clampUnit(disturbance.blur),
        shake: clampUnit(disturbance.shake),
        occlusion: clampUnit(disturbance.occlusion),
    };
}

function mapWorkerTrackingFrame(frame: WorkerTrackingFrame): TrackingFrameObservation {
    const base = {
        frame: frame.frame,
        timestamp: asMilliseconds(frame.timestamp),
        status: frame.status,
        confidence: clampUnit(frame.confidence),
        visiblePixels: frame.visiblePixels,
        ...(frame.reacquisitionFrames !== undefined
            ? { reacquisitionFrames: frame.reacquisitionFrames }
            : {}),
        colorState: frame.colorState,
        exogenousDisturbance: clampDisturbance(frame.exogenousDisturbance),
        ...(frame.opticState !== undefined ? { opticState: frame.opticState } : {}),
        ...(frame.opticStateConfidence !== undefined
            ? { opticStateConfidence: clampUnit(frame.opticStateConfidence) }
            : {}),
    };

    if (frame.x === undefined || frame.y === undefined) {
        return base;
    }

    return {
        ...base,
        x: asPixels(frame.x),
        y: asPixels(frame.y),
    };
}

export function mapWorkerTrackingResultToEngine(result: WorkerTrackingResult): EngineTrackingResult {
    return {
        points: result.points.map((point) => ({
            frame: point.frame,
            timestamp: asMilliseconds(point.timestamp),
            x: asPixels(point.x),
            y: asPixels(point.y),
            confidence: clampUnit(point.confidence),
        })),
        trackingFrames: result.trackingFrames.map(mapWorkerTrackingFrame),
        trackingQuality: clampUnit(result.trackingQuality),
        framesTracked: result.framesTracked,
        framesLost: result.framesLost,
        visibleFrames: result.visibleFrames,
        framesProcessed: result.framesProcessed,
        statusCounts: result.statusCounts,
    };
}

export function summarizePointErrorAgainstReference(
    actualPoints: readonly PointErrorReference[],
    expectedPoints: readonly PointErrorReference[]
): PointErrorSummary {
    if (actualPoints.length === 0 || expectedPoints.length === 0) {
        return {
            sampleCount: 0,
            meanErrorPx: 0,
            maxErrorPx: 0,
        };
    }

    const expectedByFrame = new Map<number, PointErrorReference>(
        expectedPoints.map((point) => [point.frame, point])
    );
    let sampleCount = 0;
    let totalErrorPx = 0;
    let maxErrorPx = 0;

    for (const point of actualPoints) {
        const expected = expectedByFrame.get(point.frame);
        if (!expected) {
            continue;
        }

        const dx = point.x - expected.x;
        const dy = point.y - expected.y;
        const errorPx = Math.sqrt((dx * dx) + (dy * dy));

        sampleCount++;
        totalErrorPx += errorPx;
        maxErrorPx = Math.max(maxErrorPx, errorPx);
    }

    if (sampleCount === 0) {
        return {
            sampleCount: 0,
            meanErrorPx: 0,
            maxErrorPx: 0,
        };
    }

    return {
        sampleCount,
        meanErrorPx: totalErrorPx / sampleCount,
        maxErrorPx,
    };
}
