import { asMilliseconds, asPixels } from '@/types/branded';
import type {
    TrackingFrameObservation,
    TrackingFrameStatus,
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

export interface WorkerTrackingFrame {
    readonly frame: number;
    readonly timestamp: number;
    readonly status: TrackingFrameStatus;
    readonly confidence: number;
    readonly visiblePixels: number;
    readonly x?: number;
    readonly y?: number;
}

export interface WorkerTrackingResult extends TrackingQualitySummary {
    readonly points: readonly WorkerTrackingPoint[];
    readonly trackingFrames: readonly WorkerTrackingFrame[];
}

export interface EngineTrackingResult extends TrackingQualitySummary {
    readonly points: readonly TrackingPoint[];
    readonly trackingFrames: readonly TrackingFrameObservation[];
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function mapWorkerTrackingFrame(frame: WorkerTrackingFrame): TrackingFrameObservation {
    const base = {
        frame: frame.frame,
        timestamp: asMilliseconds(frame.timestamp),
        status: frame.status,
        confidence: clampUnit(frame.confidence),
        visiblePixels: frame.visiblePixels,
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
