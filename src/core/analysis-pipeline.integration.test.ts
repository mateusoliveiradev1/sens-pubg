import { describe, expect, it } from 'vitest';

import {
    buildTrajectory,
    calculateSprayMetrics,
    generateCoaching,
    generateSensitivityRecommendation,
    runDiagnostics,
} from '@/core';
import { CURRENT_PUBG_PATCH_VERSION, getWeapon } from '@/game/pubg';
import type { TrackingResult, WeaponLoadout } from '@/types/engine';
import { asMilliseconds, asPixels } from '@/types/branded';

const defaultLoadout: WeaponLoadout = {
    stance: 'standing',
    muzzle: 'none',
    grip: 'none',
    stock: 'none',
};

function createOverpullTrackingResult(frameCount: number, msPerShot: number): TrackingResult {
    const points = Array.from({ length: frameCount }, (_, frame) => ({
        frame,
        x: asPixels(960),
        y: asPixels(540 - (frame * 2)),
        timestamp: asMilliseconds(frame * msPerShot),
        // Keep confidence below the smoothing threshold so the test controls the
        // exact synthetic trajectory instead of exercising the jitter smoother.
        confidence: 0.69,
    }));

    return {
        points,
        trackingFrames: points.map((point) => ({
            frame: point.frame,
            timestamp: point.timestamp,
            status: 'tracked' as const,
            confidence: 0.95,
            visiblePixels: 42,
            x: point.x,
            y: point.y,
        })),
        trackingQuality: 0.95,
        framesTracked: frameCount,
        framesLost: 0,
        visibleFrames: frameCount,
        framesProcessed: frameCount,
        statusCounts: {
            tracked: frameCount,
            occluded: 0,
            lost: 0,
            uncertain: 0,
        },
    };
}

describe('analysis pipeline integration', () => {
    it('keeps a deterministic overpull scenario coherent from trajectory to coaching', () => {
        const weapon = getWeapon('m416');
        expect(weapon).toBeDefined();

        const tracking = createOverpullTrackingResult(12, weapon!.msPerShot);
        const trajectory = buildTrajectory(tracking, weapon!);
        const metrics = calculateSprayMetrics(trajectory, weapon!, defaultLoadout, 0.1, 30);
        const diagnoses = runDiagnostics(metrics, weapon!.category);
        const sensitivity = generateSensitivityRecommendation(
            metrics,
            diagnoses,
            800,
            'hybrid',
            'claw',
            45,
            {},
            1.0
        );
        const coaching = generateCoaching(diagnoses, defaultLoadout, {
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
        });

        expect(trajectory.displacements).toHaveLength(11);
        expect(trajectory.framesProcessed).toBe(12);

        expect(metrics.verticalControlIndex).toBeGreaterThan(1.15);
        expect(metrics.initialRecoilResponseMs).toBe(asMilliseconds(88));
        expect(metrics.metricQuality?.verticalControlIndex.coverage).toBeCloseTo(1, 5);
        expect(metrics.metricQuality?.verticalControlIndex.confidence).toBeCloseTo(0.95, 5);

        expect(diagnoses).toHaveLength(1);
        expect(diagnoses[0]?.type).toBe('overpull');
        expect(diagnoses[0]?.severity).toBeGreaterThanOrEqual(4);

        expect(sensitivity.recommended).toBe('high');
        expect(sensitivity.reasoning).toContain('residualObjective=increase_sens');

        expect(coaching).toHaveLength(1);
        expect(coaching[0]?.mode).toBe('standard');
        expect(coaching[0]?.diagnosis.type).toBe('overpull');
        expect(coaching[0]?.evidence.recommendedAttachments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Lightweight Grip',
                    slot: 'grip',
                }),
            ])
        );
    });
});
