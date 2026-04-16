import { describe, expect, it } from 'vitest';
import { asMilliseconds } from '@/types/branded';
import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';
import { buildSprayVisualizationPaths, resolveSprayVisualizationDeltas } from './spray-visualization-paths';

const trajectory: SprayTrajectory = {
    points: [],
    trackingFrames: [],
    displacements: [
        { dx: 2, dy: 3, timestamp: asMilliseconds(0), shotIndex: 0 },
        { dx: -1, dy: 2, timestamp: asMilliseconds(86), shotIndex: 1 },
    ],
    totalFrames: 2,
    durationMs: asMilliseconds(86),
    shotAlignmentErrorMs: 0,
    weaponId: 'm416',
    trackingQuality: 1,
    framesTracked: 2,
    framesLost: 0,
    visibleFrames: 2,
    framesProcessed: 2,
    statusCounts: {
        tracked: 2,
        occluded: 0,
        lost: 0,
        uncertain: 0,
    },
};

describe('resolveSprayVisualizationDeltas', () => {
    it('uses angular shot residuals to expose both real and ideal deltas', () => {
        const shotResiduals: readonly ShotRecoilResidual[] = [
            {
                shotIndex: 0,
                timestamp: asMilliseconds(0),
                observed: { yaw: 0.4, pitch: 1.2 },
                expected: { yaw: 0.2, pitch: 0.9 },
                residual: { yaw: 0.2, pitch: 0.3 },
                residualMagnitudeDegrees: 0.36,
            },
            {
                shotIndex: 1,
                timestamp: asMilliseconds(86),
                observed: { yaw: -0.1, pitch: 0.8 },
                expected: { yaw: 0, pitch: 0.7 },
                residual: { yaw: -0.1, pitch: 0.1 },
                residualMagnitudeDegrees: 0.14,
            },
        ];

        expect(resolveSprayVisualizationDeltas(trajectory, shotResiduals)).toEqual({
            realDeltas: [
                { dx: 0.4, dy: 1.2 },
                { dx: -0.1, dy: 0.8 },
            ],
            idealDeltas: [
                { dx: 0.2, dy: 0.9 },
                { dx: 0, dy: 0.7 },
            ],
        });
    });

    it('falls back to trajectory displacements when angular residuals are unavailable', () => {
        expect(resolveSprayVisualizationDeltas(trajectory, undefined)).toEqual({
            realDeltas: [
                { dx: 2, dy: 3 },
                { dx: -1, dy: 2 },
            ],
            idealDeltas: [],
        });
    });
});

describe('buildSprayVisualizationPaths', () => {
    it('keeps the origin at the canvas center while projecting ideal and real paths', () => {
        const shotResiduals: readonly ShotRecoilResidual[] = [
            {
                shotIndex: 0,
                timestamp: asMilliseconds(0),
                observed: { yaw: 1, pitch: 2 },
                expected: { yaw: 0.5, pitch: 1 },
                residual: { yaw: 0.5, pitch: 1 },
                residualMagnitudeDegrees: 1.12,
            },
        ];

        const paths = buildSprayVisualizationPaths({
            trajectory,
            shotResiduals,
            width: 400,
            height: 400,
        });

        expect(paths.realPoints[0]).toEqual({ x: 200, y: 200 });
        expect(paths.idealPoints[0]).toEqual({ x: 200, y: 200 });
        expect(paths.realPoints[1]!.x).toBeGreaterThan(paths.idealPoints[1]!.x);
        expect(paths.realPoints[1]!.y).toBeGreaterThan(paths.idealPoints[1]!.y);
    });
});
