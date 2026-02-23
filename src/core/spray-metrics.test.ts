/**
 * Tests: Spray Metrics Calculator
 * Valida as 6 métricas obrigatórias com dados simulados.
 */

import { describe, it, expect } from 'vitest';
import { buildDisplacements, buildTrajectory, calculateSprayMetrics } from '@/core/spray-metrics';
import { getWeapon } from '@/game/pubg';
import type { TrackingPoint } from '@/types/engine';
import { asPixels, asMilliseconds, asScore } from '@/types/branded';

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
            { x: asPixels(100), y: asPixels(100), timestamp: asMilliseconds(0), confidence: asScore(95) },
            { x: asPixels(102), y: asPixels(105), timestamp: asMilliseconds(33), confidence: asScore(95) },
            { x: asPixels(101), y: asPixels(110), timestamp: asMilliseconds(66), confidence: asScore(95) },
        ];

        const displacements = buildDisplacements(points);
        expect(displacements).toHaveLength(2);
        expect(displacements[0]!.dx).toBe(2);
        expect(displacements[0]!.dy).toBe(5);
        expect(displacements[1]!.dx).toBe(-1);
        expect(displacements[1]!.dy).toBe(5);
    });
});

describe('calculateSprayMetrics', () => {
    const weapon = getWeapon('m416')!;

    it('should return all 6 metrics', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 1 });
        const trajectory = buildTrajectory({ points, averageConfidence: asScore(90), lostFrames: 0 }, 'm416');
        const metrics = calculateSprayMetrics(trajectory, weapon);

        expect(metrics).toHaveProperty('stabilityScore');
        expect(metrics).toHaveProperty('verticalControlIndex');
        expect(metrics).toHaveProperty('horizontalNoiseIndex');
        expect(metrics).toHaveProperty('initialRecoilResponseMs');
        expect(metrics).toHaveProperty('driftDirectionBias');
        expect(metrics).toHaveProperty('consistencyScore');
    });

    it('should give high stability for static spray', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 0, horizontalNoise: 0 });
        const trajectory = buildTrajectory({ points, averageConfidence: asScore(90), lostFrames: 0 }, 'm416');
        const metrics = calculateSprayMetrics(trajectory, weapon);

        // Perfect spray = high stability
        expect(Number(metrics.stabilityScore)).toBeGreaterThanOrEqual(90);
    });

    it('should detect neutral drift for centered spray', () => {
        const points = generateTrackingPoints(30, { verticalDrift: 1, horizontalNoise: 0 });
        const trajectory = buildTrajectory({ points, averageConfidence: asScore(90), lostFrames: 0 }, 'm416');
        const metrics = calculateSprayMetrics(trajectory, weapon);

        expect(metrics.driftDirectionBias.direction).toBe('neutral');
    });
});
