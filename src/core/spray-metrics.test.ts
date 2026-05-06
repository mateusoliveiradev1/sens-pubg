/**
 * Tests: Spray Metrics Calculator
 * Valida as 6 métricas obrigatórias com dados simulados.
 */

import { describe, it, expect } from 'vitest';
import { buildDisplacements, buildTrajectory, calculateShotRecoilResiduals, calculateSprayMetrics, segmentSprayPhases } from './spray-metrics';
import { CURRENT_PUBG_PATCH_VERSION, getExpectedRecoilSequence, getWeapon } from '../game/pubg';
import type { TrackingFrameObservation, TrackingFrameStatus, TrackingPoint, WeaponLoadout } from '../types/engine';
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

function makeTrackingFrame(
    frame: number,
    status: TrackingFrameStatus = 'tracked',
    contamination: {
        readonly cameraMotion?: number;
        readonly hardCut?: number;
        readonly flick?: number;
        readonly targetSwap?: number;
        readonly identityConfidence?: number;
    } = {}
): TrackingFrameObservation {
    const base = {
        frame,
        timestamp: asMilliseconds(frame * 33),
        status,
        confidence: status === 'tracked' ? 1 : 0,
        visiblePixels: status === 'tracked' ? 25 : 0,
        colorState: 'red' as const,
        exogenousDisturbance: {
            muzzleFlash: 0,
            blur: status === 'tracked' ? 0 : 0.25,
            shake: 0,
            occlusion: status === 'tracked' ? 0 : 1,
            cameraMotion: contamination.cameraMotion ?? 0,
            hardCut: contamination.hardCut ?? 0,
            flick: contamination.flick ?? 0,
            targetSwap: contamination.targetSwap ?? 0,
            identityConfidence: contamination.identityConfidence ?? 1,
        },
    };

    if (status === 'tracked' || status === 'uncertain') {
        return {
            ...base,
            x: asPixels(960),
            y: asPixels(540 + frame),
        };
    }

    return base;
}

function makeDegradedTrackingFrame(frame: number): TrackingFrameObservation {
    return {
        ...makeTrackingFrame(frame, 'tracked'),
        confidence: 0.55,
        reacquisitionFrames: 3,
        exogenousDisturbance: {
            muzzleFlash: 0.8,
            blur: 0.45,
            shake: 0.6,
            occlusion: 0,
        },
    };
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
        expect(trajectory.shotAlignmentErrorMs).toBeGreaterThanOrEqual(0);
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
        expect(metrics).toHaveProperty('shotAlignmentErrorMs');
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

    it('reports phase-level quality when one segment of the clip is degraded', () => {
        const points = generateTrackingPoints(26, { verticalDrift: 1 });
        const displacements = buildDisplacements(points);
        const trackingFrames = Array.from({ length: 26 }, (_, frame) => (
            frame >= 11 && frame <= 19
                ? makeTrackingFrame(frame, 'lost')
                : makeTrackingFrame(frame)
        ));
        const trajectory = {
            points,
            displacements,
            totalFrames: points.length,
            durationMs: asMilliseconds(25 * 33),
            shotAlignmentErrorMs: 0,
            weaponId: weapon.id,
            trackingFrames,
            trackingQuality: 17 / 26,
            framesTracked: 17,
            framesLost: 9,
            visibleFrames: 17,
            framesProcessed: 26,
            statusCounts: {
                tracked: 17,
                uncertain: 0,
                occluded: 0,
                lost: 9,
            },
        };

        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);

        expect(metrics.phaseQuality?.burst.coverage).toBe(1);
        expect(metrics.phaseQuality?.sustained.coverage).toBeLessThan(0.3);
        expect(metrics.phaseQuality?.fatigue.coverage).toBe(1);
        expect(metrics.metricQuality?.burstVCI.coverage).toBe(metrics.phaseQuality?.burst.coverage);
        expect(metrics.metricQuality?.sustainedVCI.coverage).toBe(metrics.phaseQuality?.sustained.coverage);
        expect(metrics.metricQuality?.fatigueVCI.coverage).toBe(metrics.phaseQuality?.fatigue.coverage);
    });

    it('derives metric quality from frame disturbance and reacquisition evidence', () => {
        const points = generateTrackingPoints(12, { verticalDrift: 1 });
        const trackingFrames = Array.from({ length: 12 }, (_, frame) => (
            frame >= 4 && frame <= 7
                ? makeDegradedTrackingFrame(frame)
                : makeTrackingFrame(frame)
        ));
        const trajectory = buildTrajectory({
            points,
            trackingFrames,
            trackingQuality: 1,
            framesTracked: 12,
            framesLost: 0,
            visibleFrames: 12,
            framesProcessed: 12,
        }, weapon);

        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);
        const quality = metrics.metricQuality?.verticalControlIndex;

        expect(quality?.coverage).toBeLessThan(1);
        expect(quality?.confidence).toBeLessThan(0.9);
        expect(quality?.visibilityCoverage).toBe(1);
        expect(quality?.disturbancePenalty).toBeGreaterThan(0);
        expect(quality?.reacquisitionPenalty).toBeGreaterThan(0);
        expect(quality?.confidenceSource).toBe('tracking_frames');
    });

    it('reduces evidence confidence for camera motion without changing vertical control', () => {
        const points = generateTrackingPoints(12, { verticalDrift: 1 });
        const cleanTrajectory = buildTrajectory({
            points,
            trackingFrames: Array.from({ length: 12 }, (_, frame) => makeTrackingFrame(frame)),
            trackingQuality: 1,
            framesTracked: 12,
            framesLost: 0,
            visibleFrames: 12,
            framesProcessed: 12,
        }, weapon);
        const cameraMotionTrajectory = buildTrajectory({
            points,
            trackingFrames: Array.from({ length: 12 }, (_, frame) => (
                frame >= 3 && frame <= 6
                    ? makeTrackingFrame(frame, 'tracked', { cameraMotion: 0.8 })
                    : makeTrackingFrame(frame)
            )),
            trackingQuality: 1,
            framesTracked: 12,
            framesLost: 0,
            visibleFrames: 12,
            framesProcessed: 12,
        }, weapon);

        const cleanMetrics = calculateSprayMetrics(cleanTrajectory, weapon, defaultLoadout);
        const cameraMotionMetrics = calculateSprayMetrics(cameraMotionTrajectory, weapon, defaultLoadout);

        expect(cameraMotionMetrics.verticalControlIndex).toBe(cleanMetrics.verticalControlIndex);
        expect(cameraMotionMetrics.metricQuality?.sprayScore.cameraMotionPenalty).toBeGreaterThan(0);
        expect(cameraMotionMetrics.metricQuality?.sprayScore.confidence).toBeLessThan(
            cleanMetrics.metricQuality?.sprayScore.confidence ?? 0
        );
    });

    it('caps metric confidence when identity contamination is too high', () => {
        const points = generateTrackingPoints(12, { verticalDrift: 1 });
        const trackingFrames = Array.from({ length: 12 }, (_, frame) => (
            frame >= 2 && frame <= 5
                ? makeTrackingFrame(frame, 'uncertain', {
                    flick: 1,
                    targetSwap: frame >= 4 ? 1 : 0,
                    identityConfidence: 0.1,
                })
                : makeTrackingFrame(frame)
        ));
        const trajectory = buildTrajectory({
            points,
            trackingFrames,
            trackingQuality: 1,
            framesTracked: 12,
            framesLost: 0,
            visibleFrames: 12,
            framesProcessed: 12,
        }, weapon);

        const metrics = calculateSprayMetrics(trajectory, weapon, defaultLoadout);
        const quality = metrics.metricQuality?.sprayScore;

        expect(quality?.contaminatedFrameCount).toBe(4);
        expect(quality?.flickPenalty).toBeGreaterThan(0.25);
        expect(quality?.targetSwapPenalty).toBeGreaterThan(0);
        expect(quality?.confidence).toBeLessThan(0.8);
    });

    it('measures the temporal correction applied when dead lead-in frames are skipped', () => {
        const syntheticTemporalWeapon = {
            ...weapon,
            id: 'm416-temporal-fixture',
            fireRateRPM: 1500,
            msPerShot: 40,
        };
        const points: TrackingPoint[] = [
            { frame: 0, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(0), confidence: 0.95 },
            { frame: 1, x: asPixels(960), y: asPixels(540), timestamp: asMilliseconds(20), confidence: 0.95 },
            { frame: 2, x: asPixels(960), y: asPixels(536), timestamp: asMilliseconds(40), confidence: 0.95 },
            { frame: 3, x: asPixels(960), y: asPixels(532), timestamp: asMilliseconds(60), confidence: 0.95 },
            { frame: 4, x: asPixels(960), y: asPixels(528), timestamp: asMilliseconds(80), confidence: 0.95 },
            { frame: 5, x: asPixels(960), y: asPixels(524), timestamp: asMilliseconds(100), confidence: 0.95 },
            { frame: 6, x: asPixels(960), y: asPixels(520), timestamp: asMilliseconds(120), confidence: 0.95 },
        ];

        const trajectory = buildTrajectory({
            points,
            trackingQuality: 0.95,
            framesTracked: 7,
            framesLost: 0,
            visibleFrames: 7,
            framesProcessed: 7,
        }, syntheticTemporalWeapon);
        const metrics = calculateSprayMetrics(trajectory, syntheticTemporalWeapon, defaultLoadout);

        expect(trajectory.shotAlignmentErrorMs).toBe(40);
        expect(metrics.shotAlignmentErrorMs).toBe(40);
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
