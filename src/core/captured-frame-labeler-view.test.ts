import { describe, expect, it } from 'vitest';
import { asMilliseconds, asPixels } from '@/types/branded';
import type { TrackingFrameObservation } from '@/types/engine';
import {
    buildTrackingReviewOverlay,
    summarizeTrackingReviewOverlay,
    type CapturedFrameReviewLabel,
} from './captured-frame-labeler-view';

const cleanDisturbance = {
    muzzleFlash: 0,
    blur: 0,
    shake: 0,
    occlusion: 0,
};

function frame(
    frameIndex: number,
    status: TrackingFrameObservation['status'],
    x?: number,
    y?: number,
    reacquisitionFrames?: number
): TrackingFrameObservation {
    return {
        frame: frameIndex,
        timestamp: asMilliseconds(frameIndex * 16),
        status,
        confidence: status === 'tracked' ? 0.9 : 0.24,
        visiblePixels: status === 'lost' ? 0 : 18,
        colorState: status === 'lost' ? 'unknown' : 'red',
        exogenousDisturbance: cleanDisturbance,
        ...(x !== undefined ? { x: asPixels(x) } : {}),
        ...(y !== undefined ? { y: asPixels(y) } : {}),
        ...(reacquisitionFrames !== undefined ? { reacquisitionFrames } : {}),
    };
}

describe('buildTrackingReviewOverlay', () => {
    it('joins tracking frames with human labels and exposes status/error markers', () => {
        const labels: readonly CapturedFrameReviewLabel[] = [
            {
                frameIndex: 10,
                timestampSeconds: 0.16,
                label: { status: 'tracked', x: 962, y: 543 },
            },
            {
                frameIndex: 11,
                timestampSeconds: 0.176,
                label: { status: 'tracked', x: 960, y: 540 },
            },
            {
                frameIndex: 12,
                timestampSeconds: 0.192,
                label: { status: 'occluded', x: null, y: null, notes: 'reticle hidden' },
            },
        ];

        const overlay = buildTrackingReviewOverlay({
            frameSize: { width: 1920, height: 1080 },
            trackingFrames: [
                frame(10, 'tracked', 960, 540),
                frame(11, 'tracked', 970, 550, 2),
                frame(12, 'lost'),
            ],
            labels,
        });

        expect(overlay[0]).toMatchObject({
            frame: 10,
            status: 'tracked',
            labelStatus: 'tracked',
            statusMatches: true,
            normalizedX: 0.5,
            labelNormalizedX: 962 / 1920,
        });
        expect(overlay[0]!.errorPx).toBeCloseTo(Math.hypot(2, 3));
        expect(overlay[1]!.errorPx).toBeCloseTo(Math.hypot(10, 10));
        expect(overlay[2]).toMatchObject({
            status: 'lost',
            labelStatus: 'occluded',
            statusMatches: false,
            notes: 'reticle hidden',
        });

        expect(summarizeTrackingReviewOverlay(overlay)).toMatchObject({
            markers: 3,
            labeledMarkers: 3,
            statusMismatches: 1,
            reacquisitionEvents: 1,
        });
    });
});
