import { asMilliseconds } from '../types/branded';
import type { SprayWindowDetection } from '../types/engine';
import type { CrosshairColor } from './crosshair-tracking';
import { createStreamingCrosshairTracker } from './crosshair-tracking';
import type { ExtractedFrame } from './frame-extraction';

export interface DetectSprayWindowOptions {
    readonly targetColor?: CrosshairColor;
    readonly minDisplacementPx?: number;
    readonly minShotLikeEvents?: number;
    readonly preRollFrames?: number;
    readonly postRollFrames?: number;
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function detectSprayWindow(
    frames: readonly ExtractedFrame[],
    options: DetectSprayWindowOptions = {}
): SprayWindowDetection | null {
    if (frames.length < 2) {
        return null;
    }

    const tracker = createStreamingCrosshairTracker();
    const targetColor = options.targetColor ?? 'RED';
    const minDisplacementPx = options.minDisplacementPx ?? 2;
    const minShotLikeEvents = options.minShotLikeEvents ?? 2;
    const preRollFrames = options.preRollFrames ?? 1;
    const postRollFrames = options.postRollFrames ?? 1;
    const shotLikeEvents: Array<{
        readonly frameIndex: number;
        readonly confidence: number;
    }> = [];
    let previousVisiblePosition: { x: number; y: number } | null = null;

    for (let index = 0; index < frames.length; index++) {
        const frame = frames[index]!;
        const observation = tracker.track(frame.imageData, { targetColor });

        if (observation.x === undefined || observation.y === undefined) {
            continue;
        }

        if (previousVisiblePosition) {
            const displacementPx = Math.hypot(
                observation.x - previousVisiblePosition.x,
                observation.y - previousVisiblePosition.y
            );

            if (displacementPx >= minDisplacementPx) {
                shotLikeEvents.push({
                    frameIndex: index,
                    confidence: observation.confidence,
                });
            }
        }

        previousVisiblePosition = {
            x: observation.x,
            y: observation.y,
        };
    }

    if (shotLikeEvents.length < minShotLikeEvents) {
        return null;
    }

    const firstEventFrameIndex = shotLikeEvents[0]!.frameIndex;
    const lastEventFrameIndex = shotLikeEvents[shotLikeEvents.length - 1]!.frameIndex;
    const startFrameIndex = Math.max(0, firstEventFrameIndex - preRollFrames);
    const endFrameIndex = Math.min(frames.length - 1, lastEventFrameIndex + postRollFrames);
    const startFrame = frames[startFrameIndex]!;
    const endFrame = frames[endFrameIndex]!;
    const firstFrame = frames[0]!;
    const lastFrame = frames[frames.length - 1]!;
    const meanEventConfidence = shotLikeEvents.reduce((sum, event) => sum + event.confidence, 0) / shotLikeEvents.length;
    const eventCoverage = shotLikeEvents.length / Math.max(minShotLikeEvents, frames.length - 1);
    const confidence = clampUnit((meanEventConfidence * 0.7) + (eventCoverage * 0.3));

    return {
        startMs: asMilliseconds(startFrame.timestamp),
        endMs: asMilliseconds(endFrame.timestamp),
        confidence,
        shotLikeEvents: shotLikeEvents.length,
        rejectedLeadingMs: asMilliseconds(Math.max(0, startFrame.timestamp - firstFrame.timestamp)),
        rejectedTrailingMs: asMilliseconds(Math.max(0, lastFrame.timestamp - endFrame.timestamp)),
    };
}
