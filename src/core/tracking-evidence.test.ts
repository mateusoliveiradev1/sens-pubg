import { describe, expect, it } from 'vitest';
import { asMilliseconds, asPixels } from '../types/branded';
import type { TrackingFrameObservation, TrackingFrameStatus } from '../types/engine';
import { createTrackingEvidence } from './tracking-evidence';

function makeFrame(
    frame: number,
    status: TrackingFrameStatus,
    confidence: number,
    options: {
        readonly x?: number;
        readonly y?: number;
        readonly reacquisitionFrames?: number;
    } = {}
): TrackingFrameObservation {
    const base = {
        frame,
        timestamp: asMilliseconds(frame * 16),
        status,
        confidence,
        visiblePixels: status === 'tracked' || status === 'uncertain' ? 25 : 0,
        ...(options.reacquisitionFrames !== undefined
            ? { reacquisitionFrames: options.reacquisitionFrames }
            : {}),
        colorState: 'red' as const,
        opticState: 'unknown',
        opticStateConfidence: 0,
        exogenousDisturbance: {
            muzzleFlash: 0,
            blur: 1 - confidence,
            shake: 0,
            occlusion: status === 'tracked' || status === 'uncertain' ? 0 : 1,
        },
    };

    if (options.x === undefined || options.y === undefined) {
        return base;
    }

    return {
        ...base,
        x: asPixels(options.x),
        y: asPixels(options.y),
    };
}

describe('createTrackingEvidence', () => {
    it('consolidates tracking quality, spatial error, reacquisition, and calibration evidence', () => {
        const evidence = createTrackingEvidence({
            trackingQuality: 0.625,
            framesTracked: 3,
            framesLost: 1,
            visibleFrames: 3,
            framesProcessed: 4,
            statusCounts: {
                tracked: 2,
                uncertain: 1,
                occluded: 1,
                lost: 0,
            },
            trackingFrames: [
                makeFrame(0, 'tracked', 1, { x: 10, y: 10 }),
                makeFrame(1, 'uncertain', 0.5, { x: 12, y: 10, reacquisitionFrames: 2 }),
                makeFrame(2, 'occluded', 0),
                makeFrame(3, 'tracked', 0.8, { x: 16, y: 13, reacquisitionFrames: 1 }),
            ],
            referenceFrames: [
                { frame: 0, status: 'tracked', x: 10, y: 10 },
                { frame: 1, status: 'tracked', x: 12, y: 11 },
                { frame: 2, status: 'occluded' },
                { frame: 3, status: 'tracked', x: 14, y: 13 },
            ],
        });

        expect(evidence).toMatchObject({
            trackingQuality: 0.625,
            coverage: 1,
            meanErrorPx: 1,
            maxErrorPx: 2,
            meanReacquisitionFrames: 1.5,
            falseReacquisitionRate: 0.5,
            confidenceCalibration: {
                sampleCount: 4,
                meanConfidence: 0.575,
                observedVisibleRate: 0.75,
            },
        });
        expect(evidence.confidenceCalibration.brierScore).toBeCloseTo(0.0725, 4);
        expect(evidence.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
    });

    it('falls back to observed visibility when no reference frames are available', () => {
        const evidence = createTrackingEvidence({
            trackingQuality: 0.5,
            framesTracked: 1,
            framesLost: 1,
            visibleFrames: 1,
            framesProcessed: 2,
            statusCounts: {
                tracked: 1,
                uncertain: 0,
                occluded: 0,
                lost: 1,
            },
            trackingFrames: [
                makeFrame(0, 'tracked', 0.9, { x: 10, y: 10 }),
                makeFrame(1, 'lost', 0),
            ],
        });

        expect(evidence).toMatchObject({
            coverage: 0.5,
            meanErrorPx: 0,
            maxErrorPx: 0,
            meanReacquisitionFrames: 0,
            falseReacquisitionRate: 0,
            confidenceCalibration: {
                sampleCount: 2,
                observedVisibleRate: 0.5,
            },
        });
    });
});
