import { describe, expect, it } from 'vitest';
import { summarizeAnalysisTracking, type TrackingSummarySource } from './tracking-summary';

function createSource(
    overrides: Partial<TrackingSummarySource['trajectory']> = {}
): TrackingSummarySource {
    return {
        trajectory: {
            trackingQuality: 0.72,
            framesTracked: 8,
            framesLost: 2,
            visibleFrames: 8,
            framesProcessed: 10,
            statusCounts: {
                tracked: 6,
                occluded: 1,
                lost: 1,
                uncertain: 2,
            },
            ...overrides,
        },
    };
}

describe('summarizeAnalysisTracking', () => {
    it('returns direct tracking coverage and confidence for a single session', () => {
        const summary = summarizeAnalysisTracking(createSource());

        expect(summary.coverage).toBeCloseTo(0.8);
        expect(summary.confidence).toBeCloseTo(0.72);
        expect(summary.framesLost).toBe(2);
        expect(summary.framesProcessed).toBe(10);
        expect(summary.statusCounts).toEqual({
            tracked: 6,
            occluded: 1,
            lost: 1,
            uncertain: 2,
        });
    });

    it('aggregates tracking honesty across multiple spray sub-sessions', () => {
        const summary = summarizeAnalysisTracking({
            trajectory: createSource().trajectory,
            subSessions: [
                createSource({
                    trackingQuality: 0.7,
                    framesTracked: 7,
                    framesLost: 3,
                    visibleFrames: 7,
                    framesProcessed: 10,
                    statusCounts: {
                        tracked: 6,
                        occluded: 1,
                        lost: 2,
                        uncertain: 1,
                    },
                }),
                createSource({
                    trackingQuality: 0.8,
                    framesTracked: 9,
                    framesLost: 1,
                    visibleFrames: 9,
                    framesProcessed: 10,
                    statusCounts: {
                        tracked: 7,
                        occluded: 0,
                        lost: 1,
                        uncertain: 2,
                    },
                }),
            ],
        });

        expect(summary.framesTracked).toBe(16);
        expect(summary.framesLost).toBe(4);
        expect(summary.visibleFrames).toBe(16);
        expect(summary.framesProcessed).toBe(20);
        expect(summary.coverage).toBeCloseTo(0.8);
        expect(summary.confidence).toBeCloseTo(0.725);
        expect(summary.statusCounts).toEqual({
            tracked: 13,
            occluded: 1,
            lost: 3,
            uncertain: 3,
        });
    });

    it('surfaces effective spray window and reacquisition details from tracking frames', () => {
        const summary = summarizeAnalysisTracking(createSource({
            trackingQuality: 0.62,
            framesTracked: 4,
            framesLost: 3,
            visibleFrames: 5,
            framesProcessed: 7,
            statusCounts: {
                tracked: 4,
                occluded: 1,
                lost: 2,
                uncertain: 0,
            },
            trackingFrames: [
                { frame: 0, timestamp: 120 as never, status: 'tracked' as const, confidence: 0.9, visiblePixels: 30, colorState: 'red' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0, shake: 0, occlusion: 0 }, x: 10 as never, y: 10 as never },
                { frame: 1, timestamp: 136 as never, status: 'lost' as const, confidence: 0.1, visiblePixels: 0, colorState: 'unknown' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0.3, shake: 0.1, occlusion: 0 } },
                { frame: 2, timestamp: 152 as never, status: 'occluded' as const, confidence: 0.2, visiblePixels: 4, colorState: 'red' as const, exogenousDisturbance: { muzzleFlash: 0.4, blur: 0.2, shake: 0, occlusion: 1 } },
                { frame: 3, timestamp: 168 as never, status: 'tracked' as const, confidence: 0.82, visiblePixels: 24, reacquisitionFrames: 2, colorState: 'red' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0, shake: 0, occlusion: 0 }, x: 11 as never, y: 12 as never },
                { frame: 4, timestamp: 184 as never, status: 'uncertain' as const, confidence: 0.44, visiblePixels: 12, colorState: 'red' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0.2, shake: 0.3, occlusion: 0 }, x: 12 as never, y: 13 as never },
                { frame: 5, timestamp: 200 as never, status: 'tracked' as const, confidence: 0.86, visiblePixels: 28, reacquisitionFrames: 1, colorState: 'red' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0, shake: 0, occlusion: 0 }, x: 13 as never, y: 14 as never },
                { frame: 6, timestamp: 216 as never, status: 'lost' as const, confidence: 0.08, visiblePixels: 0, colorState: 'unknown' as const, exogenousDisturbance: { muzzleFlash: 0, blur: 0.4, shake: 0.2, occlusion: 0 } },
            ],
        }));

        expect(summary.effectiveWindowStartMs).toBe(120);
        expect(summary.effectiveWindowEndMs).toBe(216);
        expect(summary.effectiveWindowMs).toBe(96);
        expect(summary.reacquisitionEvents).toBe(2);
        expect(summary.maxReacquisitionFrames).toBe(2);
        expect(summary.meanReacquisitionFrames).toBeCloseTo(1.5);
    });
});
