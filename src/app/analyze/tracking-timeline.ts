import type { TrackingFrameObservation, TrackingFrameStatus } from '@/types/engine';

export type TrackingTimelineDisturbance =
    | 'muzzleFlash'
    | 'blur'
    | 'shake'
    | 'occlusion';

export interface TrackingTimelineSegment {
    readonly status: TrackingFrameStatus;
    readonly startMs: number;
    readonly endMs: number;
    readonly frameCount: number;
    readonly meanConfidence: number;
    readonly maxReacquisitionFrames: number;
    readonly dominantDisturbance: TrackingTimelineDisturbance | null;
    readonly dominantDisturbanceLevel: number;
}

export interface TrackingTimelineSummary {
    readonly totalFrames: number;
    readonly trackedFrames: number;
    readonly attentionFrames: number;
    readonly lostFrames: number;
    readonly trackedSegments: number;
    readonly attentionSegments: number;
    readonly worstReacquisitionFrames: number;
}

export interface TrackingTimeline {
    readonly segments: readonly TrackingTimelineSegment[];
    readonly summary: TrackingTimelineSummary;
}

const SEGMENT_BREAK_TIME_GAP_MS = 120;

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function isAttentionStatus(status: TrackingFrameStatus): boolean {
    return status === 'uncertain' || status === 'occluded' || status === 'lost';
}

function createEmptyTimeline(): TrackingTimeline {
    return {
        segments: [],
        summary: {
            totalFrames: 0,
            trackedFrames: 0,
            attentionFrames: 0,
            lostFrames: 0,
            trackedSegments: 0,
            attentionSegments: 0,
            worstReacquisitionFrames: 0,
        },
    };
}

function selectDominantDisturbance(
    frames: readonly TrackingFrameObservation[]
): {
    readonly disturbance: TrackingTimelineDisturbance | null;
    readonly level: number;
} {
    const totals = frames.reduce<Record<TrackingTimelineDisturbance, number>>((accumulator, frame) => ({
        muzzleFlash: accumulator.muzzleFlash + frame.exogenousDisturbance.muzzleFlash,
        blur: accumulator.blur + frame.exogenousDisturbance.blur,
        shake: accumulator.shake + frame.exogenousDisturbance.shake,
        occlusion: accumulator.occlusion + frame.exogenousDisturbance.occlusion,
    }), {
        muzzleFlash: 0,
        blur: 0,
        shake: 0,
        occlusion: 0,
    });
    const ranked = (Object.entries(totals) as Array<[TrackingTimelineDisturbance, number]>)
        .map(([disturbance, total]) => ({
            disturbance,
            level: frames.length > 0 ? total / frames.length : 0,
        }))
        .sort((left, right) => right.level - left.level);
    const dominant = ranked[0];

    if (!dominant || dominant.level < 0.2) {
        return {
            disturbance: null,
            level: 0,
        };
    }

    return dominant;
}

function finalizeSegment(frames: readonly TrackingFrameObservation[]): TrackingTimelineSegment {
    const firstFrame = frames[0]!;
    const lastFrame = frames[frames.length - 1]!;
    const dominantDisturbance = selectDominantDisturbance(frames);
    const meanConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;

    return {
        status: firstFrame.status,
        startMs: Number(firstFrame.timestamp),
        endMs: Number(lastFrame.timestamp),
        frameCount: frames.length,
        meanConfidence: clampUnit(meanConfidence),
        maxReacquisitionFrames: frames.reduce(
            (max, frame) => Math.max(max, frame.reacquisitionFrames ?? 0),
            0
        ),
        dominantDisturbance: dominantDisturbance.disturbance,
        dominantDisturbanceLevel: clampUnit(dominantDisturbance.level),
    };
}

function shouldStartNewSegment(
    previousFrame: TrackingFrameObservation,
    currentFrame: TrackingFrameObservation
): boolean {
    if (previousFrame.status !== currentFrame.status) {
        return true;
    }

    const frameGap = currentFrame.frame - previousFrame.frame;
    if (frameGap > 1) {
        return true;
    }

    const timeGapMs = Number(currentFrame.timestamp) - Number(previousFrame.timestamp);
    return timeGapMs > SEGMENT_BREAK_TIME_GAP_MS;
}

export function createTrackingTimeline(
    frames: readonly TrackingFrameObservation[]
): TrackingTimeline {
    if (frames.length === 0) {
        return createEmptyTimeline();
    }

    const sortedFrames = [...frames].sort((left, right) => (
        Number(left.timestamp) - Number(right.timestamp)
    ));
    const segments: TrackingTimelineSegment[] = [];
    let currentFrames: TrackingFrameObservation[] = [];

    for (const frame of sortedFrames) {
        const previousFrame = currentFrames[currentFrames.length - 1];

        if (previousFrame && shouldStartNewSegment(previousFrame, frame)) {
            segments.push(finalizeSegment(currentFrames));
            currentFrames = [];
        }

        currentFrames.push(frame);
    }

    if (currentFrames.length > 0) {
        segments.push(finalizeSegment(currentFrames));
    }

    return {
        segments,
        summary: {
            totalFrames: sortedFrames.length,
            trackedFrames: sortedFrames.filter((frame) => frame.status === 'tracked').length,
            attentionFrames: sortedFrames.filter((frame) => isAttentionStatus(frame.status)).length,
            lostFrames: sortedFrames.filter((frame) => frame.status === 'lost').length,
            trackedSegments: segments.filter((segment) => segment.status === 'tracked').length,
            attentionSegments: segments.filter((segment) => isAttentionStatus(segment.status)).length,
            worstReacquisitionFrames: segments.reduce(
                (max, segment) => Math.max(max, segment.maxReacquisitionFrames),
                0
            ),
        },
    };
}
