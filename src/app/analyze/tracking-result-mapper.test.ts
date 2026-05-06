import { describe, expect, it } from 'vitest';
import {
    mapWorkerTrackingResultToEngine,
    summarizePointErrorAgainstReference,
} from './tracking-result-mapper';

describe('mapWorkerTrackingResultToEngine', () => {
    it('preserves worker confidence and tracking quality counters', () => {
        const result = mapWorkerTrackingResultToEngine({
            points: [
                { frame: 2, timestamp: 16, x: 101.5, y: 202.25, confidence: 0.42 },
                { frame: 4, timestamp: 32, x: 104, y: 208, confidence: 0.73 },
            ],
            trackingQuality: 0.6,
            framesTracked: 3,
            framesLost: 2,
            visibleFrames: 3,
            framesProcessed: 5,
            statusCounts: { tracked: 1, occluded: 1, lost: 1, uncertain: 2 },
            trackingFrames: [
                {
                    frame: 0,
                    timestamp: 0,
                    status: 'lost',
                    confidence: 0,
                    visiblePixels: 0,
                    colorState: 'unknown',
                    exogenousDisturbance: { muzzleFlash: 0, blur: 0.25, shake: 0, occlusion: 1 },
                },
                {
                    frame: 1,
                    timestamp: 16,
                    status: 'uncertain',
                    confidence: 0.42,
                    visiblePixels: 5,
                    colorState: 'neutral',
                    opticState: '1x',
                    opticStateConfidence: 1,
                    exogenousDisturbance: { muzzleFlash: 0, blur: 0.58, shake: 0, occlusion: 0 },
                    x: 101.5,
                    y: 202.25,
                },
                {
                    frame: 2,
                    timestamp: 32,
                    status: 'tracked',
                    confidence: 0.73,
                    visiblePixels: 18,
                    colorState: 'red',
                    opticState: '1x',
                    opticStateConfidence: 1,
                    exogenousDisturbance: {
                        muzzleFlash: 0,
                        blur: 0.27,
                        shake: 0,
                        occlusion: 0,
                        cameraMotion: 0.2,
                        hardCut: 0,
                        flick: 0.3,
                        targetSwap: 0.4,
                        identityConfidence: 0.55,
                    },
                    x: 104,
                    y: 208,
                },
                {
                    frame: 3,
                    timestamp: 48,
                    status: 'occluded',
                    confidence: 0,
                    visiblePixels: 0,
                    colorState: 'unknown',
                    exogenousDisturbance: { muzzleFlash: 0, blur: 0.25, shake: 0, occlusion: 1 },
                },
                {
                    frame: 4,
                    timestamp: 64,
                    status: 'uncertain',
                    confidence: 0.5,
                    visiblePixels: 7,
                    colorState: 'green',
                    opticState: '1x',
                    opticStateConfidence: 1,
                    exogenousDisturbance: { muzzleFlash: 0, blur: 0.5, shake: 0, occlusion: 0 },
                    x: 106,
                    y: 210,
                },
            ],
        });

        expect(result.points.map(point => point.confidence)).toEqual([0.42, 0.73]);
        expect(result.points.map(point => point.frame)).toEqual([2, 4]);
        expect(result.trackingQuality).toBe(0.6);
        expect(result.framesTracked).toBe(3);
        expect(result.framesLost).toBe(2);
        expect(result.visibleFrames).toBe(3);
        expect(result.framesProcessed).toBe(5);
        expect(result.statusCounts).toEqual({ tracked: 1, occluded: 1, lost: 1, uncertain: 2 });
        expect(result.trackingFrames.map(frame => frame.status)).toEqual(['lost', 'uncertain', 'tracked', 'occluded', 'uncertain']);
        expect(result.trackingFrames[1]?.x).toBe(101.5);
        expect(result.trackingFrames[1]).toMatchObject({
            colorState: 'neutral',
            opticState: '1x',
            opticStateConfidence: 1,
        });
        expect(result.trackingFrames[4]?.exogenousDisturbance.blur).toBe(0.5);
        expect(result.trackingFrames[2]?.exogenousDisturbance).toMatchObject({
            cameraMotion: 0.2,
            hardCut: 0,
            flick: 0.3,
            targetSwap: 0.4,
            identityConfidence: 0.55,
        });
    });
});

describe('summarizePointErrorAgainstReference', () => {
    it('matches points by frame and reports mean and max pixel error', () => {
        const summary = summarizePointErrorAgainstReference(
            [
                { frame: 0, x: 0, y: 0 },
                { frame: 1, x: 3, y: 4 },
                { frame: 4, x: 10, y: 10 },
            ],
            [
                { frame: 0, x: 0, y: 0 },
                { frame: 1, x: 0, y: 0 },
                { frame: 2, x: 1, y: 1 },
            ]
        );

        expect(summary).toEqual({
            sampleCount: 2,
            meanErrorPx: 2.5,
            maxErrorPx: 5,
        });
    });
});
