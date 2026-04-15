/**
 * Tests: Spray Metrics Calculator
 * Valida as 6 métricas obrigatórias com dados simulados.
 */

import { describe, it, expect } from 'vitest';
import { buildDisplacements, buildTrajectory, calculateShotRecoilResiduals, calculateSprayMetrics, segmentSprayPhases } from './spray-metrics';
import { CURRENT_PUBG_PATCH_VERSION, getExpectedRecoilSequence, getWeapon } from '../game/pubg';
import type { TrackingPoint, WeaponLoadout } from '../types/engine';
import { asPixels, asMilliseconds, asScore } from '../types/branded';

const defaultLoadout: WeaponLoadout = {
    stance: 'standing',
    muzzle: 'none',
    grip: 'none',
    stock: 'none',
};

// Helper: generate tracking points simulating a spray
function generateTrackingPoints(count: number, options?: {
    verticalDrift?: number; // >0 = spray moves up (underpull)
    horizontalNoise?: number;
    consistent?: boolean;
}): TrackingPoint[] {
    const { verticalDrift = 0, horizontalNoise = 0, consistent = true } = options ?? {};
    const points: TrackingPoint[] = [];

    let x = 960;
    let y = 540;

    for (let i = 0; i < count; i++) {
        const noise = consistent ? 0 : (Math.random() - 0.5) * horizontalNoise * 2;
        x += noise + (horizontalNoise > 0 ? 0 : 0);
        y += verticalDrift;

        points.push({
            frame: i,
            x: asPixels(x),
            y: asPixels(y),
            timestamp: asMilliseconds(i * 33), // ~30fps
            confidence: asScore(90),
        });
    }

    return points;
}

describe('buildDisplacements', () => {
    it('should return empty array for single point', () => {
        const points = generateTrackingPoints(1);
        const displacements = buildDisplacements(points);
        expect(displacements).toHaveLength(0);
    });

    it('should calculate correct displacements between frames', () => {
        const points: TrackingPoint[] = [
            { frame: 0, x: asPixels(100), y: asPixels(100), timestamp: asMilliseconds(0), confidence: asScore(95) },
            { frame: 1, x: asPixels(102), y: asPixels(105), timestamp: asMilliseconds(33), confidence: asScore(95) },
            { frame: 2, x: asPixels(101), y: asPixels(110), timestamp: asMilliseconds(66), confidence: asScore(95) },
        ];

        const displacements = buildDisplacements(points);
        expect(displacements).toHaveLength(2);
        expect(displacements[0]!.dx).toBe(2);
        expect(displacements[0]!.dy).toBe(5);
        expect(displacements[1]!.dx).toBe(-1);
        expect(displacements[1]!.dy).toBe(5);
    });
});

describe('segmentSprayPhases', () => {
    it('segments a synthetic 25-shot spray into explicit burst sustained and fatigue phases', () => {
        const displacements = Array.from({ length: 25 }, (_, index) => ({
            dx: index,
            dy: index * 2,
            timestamp: asMilliseconds(index * 86),
            shotIndex: index,
        }));

        const phases = segmentSprayPhases(displacements);

        expect(phases.map(phase => ({
            name: phase.name,
            startShotIndex: phase.startShotIndex,
            endShotIndexExclusive: phase.endShotIndexExclusive,
            displacementCount: phase.displacements.length,
        }))).toEqual([
            { name: 'burst', startShotIndex: 0, endShotIndexExclusive: 10, displacementCount: 10 },
            { name: 'sustained', startShotIndex: 10, endShotIndexExclusive: 20, displacementCount: 10 },
            { name: 'fatigue', startShotIndex: 20, endShotIndexExclusive: 25, displacementCount: 5 },
        ]);
    });
});

describe('calculateShotRecoilResiduals', () => {
    it('aligns observed displacement against expected recoil by shot index', () => {
        const weapon = getWeapon('m416')!;
        const expectedRecoil = getExpectedRecoilSequence({
            weaponId: weapon.id,
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            shotCount: 5,
        });

        const displacements = [
            { dx: 0, dy: 0.36, timestamp: asMilliseconds(0), shotIndex: 0 },
            { dx: 0.05, dy: 0.40, timestamp: asMilliseconds(weapon.msPerShot), shotIndex: 1 },
            { dx: 0, dy: 0.50, timestamp: asMilliseconds(weapon.msPerShot * 4), shotIndex: 4 },
        ];

        const residuals = calculateShotRecoilResiduals(displacements, expectedRecoil, 1);

        expect(residuals.map((residual) => residual.shotIndex)).toEqual([0, 1, 4]);
        expect(residuals[0]).toMatchObject({
            shotIndex: 0,
            expected: { yaw: 0, pitch: 0.36 },
            observed: { yaw: 0, pitch: 0.36 },
            residual: { yaw: 0, pitch: 0 },
        });
        expect(residuals[1]?.residual.pitch).toBeCloseTo(-0.05, 5);
        expect(residuals[2]?.expected).toEqual(weapon.recoilPattern[4]);
    });
});

describe('calculateSprayMetrics', () => {
    const weapon = getWeapon('m416')!;

    it('preserves real tracking quality metadata on the trajectory', () => {
        const points = generateTrackingPoints(6, { verticalDrift: 1 });
        const trajectory = buildTrajectory({
            points,
            trackingQuality: 0.6,
            framesTracked: 3,
            framesLost: 2,
            visibleFrames: 3,
            framesProcessed: 5,
        }, weapon);

        expect(trajectory.trackingQuality).toBe(0.6);
        expect(trajectory.framesTracked).toBe(3);
        expect(trajectory.framesLost).toBe(2);
        expect(trajectory.visibleFrames).toBe(3);
        expect(trajectory.framesProcessed).toBe(5);
    });

    it('should return all 6 metrics', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 1 });
        const trajectory = buildTrajectory({
            points,
            trackingQuality: asScore(90),
            framesTracked: 30,
            framesLost: 0,
            visibleFrames: 30,
            framesProcessed: 30,
        }, weapon);
        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);

        expect(metrics).toHaveProperty('stabilityScore');
        expect(metrics).toHaveProperty('verticalControlIndex');
        expect(metrics).toHaveProperty('horizontalNoiseIndex');
        expect(metrics).toHaveProperty('initialRecoilResponseMs');
        expect(metrics).toHaveProperty('driftDirectionBias');
        expect(metrics).toHaveProperty('consistencyScore');
        expect(metrics).toHaveProperty('shotResiduals');
        expect(metrics.shotResiduals).toHaveLength(trajectory.displacements.length);
        expect(metrics.shotResiduals?.[0]?.shotIndex).toBe(0);
    });

    it('propagates metric confidence and coverage when tracking loses frames', () => {
        const points = generateTrackingPoints(12, { verticalDrift: 1 });
        const trajectory = buildTrajectory({
            points,
            trackingQuality: 0.58,
            framesTracked: 7,
            framesLost: 5,
            visibleFrames: 7,
            framesProcessed: 12,
        }, weapon);

        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);
        const quality = metrics.metricQuality;

        expect(Object.keys(quality ?? {})).toEqual(expect.arrayContaining([
            'stabilityScore',
            'verticalControlIndex',
            'horizontalNoiseIndex',
            'burstVCI',
            'sustainedVCI',
            'fatigueVCI',
            'shotResiduals',
            'sprayScore',
        ]));
        expect(quality?.verticalControlIndex.coverage).toBeCloseTo(7 / 12, 5);
        expect(quality?.verticalControlIndex.confidence).toBeCloseTo(0.58, 5);
        expect(quality?.shotResiduals.sampleSize).toBe(trajectory.displacements.length);
    });

    it('should give high stability for static spray', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 0, horizontalNoise: 0 });
        const trajectory = buildTrajectory({
            points,
            trackingQuality: asScore(90),
            framesTracked: 30,
            framesLost: 0,
            visibleFrames: 30,
            framesProcessed: 30,
        }, weapon);
        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);

        // Perfect spray = high stability
        expect(Number(metrics.stabilityScore)).toBeGreaterThanOrEqual(90);
    });

    it('should detect neutral drift for centered spray', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 1, horizontalNoise: 0 });
        const trajectory = buildTrajectory({
            points,
            trackingQuality: asScore(90),
            framesTracked: 30,
            framesLost: 0,
            visibleFrames: 30,
            framesProcessed: 30,
        }, weapon);
        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);

        expect(metrics.driftDirectionBias.direction).toBe('neutral');
    });

    it('uses exact projection by default while preserving legacy scalar conversion as an explicit fallback', () => {
        const trajectory = {
            points: [
                { frame: 0, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(0), confidence: asScore(95) },
                { frame: 1, x: asPixels(1440), y: asPixels(540), timestamp: asMilliseconds(33), confidence: asScore(95) },
                { frame: 2, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(66), confidence: asScore(95) },
            ],
            displacements: [
                { dx: 480, dy: 0, timestamp: asMilliseconds(33), shotIndex: 0 },
                { dx: -480, dy: 0, timestamp: asMilliseconds(66), shotIndex: 1 },
            ],
            totalFrames: 3,
            durationMs: asMilliseconds(66),
            weaponId: weapon.id,
            trackingQuality: 1,
            framesTracked: 3,
            framesLost: 0,
            visibleFrames: 3,
            framesProcessed: 3,
        };

        const exactMetrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);
        const legacyLinearMetrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout, 90 / 1920);

        expect(exactMetrics.horizontalNoiseIndex).toBeCloseTo(26.565, 3);
        expect(legacyLinearMetrics.horizontalNoiseIndex).toBeCloseTo(22.5, 3);
        expect(exactMetrics.horizontalNoiseIndex).toBeGreaterThan(legacyLinearMetrics.horizontalNoiseIndex);
    });

    it('exposes angular and distance-aware linear error metrics', () => {
        const trajectory = {
            points: [
                { frame: 0, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(0), confidence: asScore(95) },
                { frame: 1, x: asPixels(970), y: asPixels(540), timestamp: asMilliseconds(33), confidence: asScore(95) },
                { frame: 2, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(66), confidence: asScore(95) },
            ],
            displacements: [
                { dx: 10, dy: 0, timestamp: asMilliseconds(33), shotIndex: 0 },
                { dx: -10, dy: 0, timestamp: asMilliseconds(66), shotIndex: 1 },
            ],
            totalFrames: 3,
            durationMs: asMilliseconds(66),
            weaponId: weapon.id,
            trackingQuality: 1,
            framesTracked: 3,
            framesLost: 0,
            visibleFrames: 3,
            framesProcessed: 3,
        };

        const near = calculateSprayMetrics(trajectory, weapon, defaultLoadout, undefined, 15);
        const far = calculateSprayMetrics(trajectory, weapon, defaultLoadout, undefined, 80);

        expect(near.angularErrorDegrees).toBeCloseTo(far.angularErrorDegrees, 10);
        expect(near.targetDistanceMeters).toBe(15);
        expect(far.targetDistanceMeters).toBe(80);
        expect(far.linearErrorCm).toBeGreaterThan(near.linearErrorCm * 5);
        expect(far.linearErrorSeverity).toBeGreaterThan(near.linearErrorSeverity);
    });
});
