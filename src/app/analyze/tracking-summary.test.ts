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
});
