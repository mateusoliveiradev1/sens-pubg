import { describe, expect, it } from 'vitest';

import type { TrackingPoint } from '@/types/engine';
import { asMilliseconds, asPixels } from '@/types/branded';

import { alignTrackingPointsToShots, summarizeShotAlignmentError } from './shot-alignment';

function createTrackingPoint(frame: number, timestamp: number, x: number, y: number): TrackingPoint {
    return {
        frame,
        timestamp: asMilliseconds(timestamp),
        x: asPixels(x),
        y: asPixels(y),
        confidence: 0.95,
    };
}

describe('alignTrackingPointsToShots', () => {
    it('starts the shot cadence at the first meaningful visual recoil movement instead of the first frame', () => {
        const points = [
            createTrackingPoint(0, 0, 960, 540),
            createTrackingPoint(1, 20, 960, 540),
            createTrackingPoint(2, 40, 960, 536),
            createTrackingPoint(3, 60, 960, 532),
            createTrackingPoint(4, 80, 960, 528),
            createTrackingPoint(5, 100, 960, 524),
            createTrackingPoint(6, 120, 960, 520),
        ];

        const aligned = alignTrackingPointsToShots(points, 40);

        expect(aligned.startMs).toBe(asMilliseconds(40));
        expect(aligned.alignedPoints.map((point) => Number(point.timestamp))).toEqual([40, 80, 120]);
        expect(aligned.leadingFramesSkipped).toBe(2);
        expect(aligned.errorSummary).toEqual({
            sampleCount: 3,
            meanErrorMs: 40,
            maxErrorMs: 40,
        });
    });

    it('falls back to the first frame when there is no visible onset to anchor the first shot', () => {
        const points = [
            createTrackingPoint(0, 0, 960, 540),
            createTrackingPoint(1, 20, 960, 540),
            createTrackingPoint(2, 40, 960, 540),
            createTrackingPoint(3, 60, 960, 540),
        ];

        const aligned = alignTrackingPointsToShots(points, 40);

        expect(aligned.startMs).toBe(asMilliseconds(0));
        expect(aligned.alignedPoints.map((point) => Number(point.timestamp))).toEqual([0, 40]);
        expect(aligned.leadingFramesSkipped).toBe(0);
        expect(aligned.errorSummary).toEqual({
            sampleCount: 2,
            meanErrorMs: 0,
            maxErrorMs: 0,
        });
    });
});

describe('summarizeShotAlignmentError', () => {
    it('reports mean and max temporal error against a known shot schedule', () => {
        const summary = summarizeShotAlignmentError(
            [20, 60, 100],
            [20, 64, 108]
        );

        expect(summary).toEqual({
            sampleCount: 3,
            meanErrorMs: 4,
            maxErrorMs: 8,
        });
    });
});
