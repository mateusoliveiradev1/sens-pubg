import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateTrackingGoldenFixture, runTrackingGoldens, type TrackingGoldenFixture } from '../../scripts/run-tracking-goldens';

const fixturesDir = fileURLToPath(new URL('../../tests/goldens/tracking', import.meta.url));

describe('runTrackingGoldens', () => {
    it('passes versioned clean and degraded tracking fixtures with coverage and error metrics', async () => {
        const report = await runTrackingGoldens({ fixturesDir });

        expect(report.passed).toBe(true);
        expect(report.summary.totalFixtures).toBeGreaterThanOrEqual(2);
        expect(report.summary.failedFixtures).toBe(0);
        expect(report.summary.meanCoverage).toBe(1);
        expect(report.summary.meanErrorPx).toBeLessThanOrEqual(0.01);
        expect(report.summary.p95ErrorPx).toBeLessThanOrEqual(0.01);
        expect(report.summary.maxErrorPx).toBeLessThanOrEqual(0.01);
        expect(report.summary.confidenceCalibration.sampleCount).toBeGreaterThanOrEqual(7);
        expect(report.summary.confidenceCalibration.brierScore).toBeGreaterThan(0);
        expect(report.summary.confidenceCalibration.brierScore).toBeLessThan(0.2);
        expect(report.summary.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(report.summary.confidenceCalibration.expectedCalibrationError).toBeLessThanOrEqual(0.22);
        expect(report.summary.meanReacquisitionFrames).toBeGreaterThan(0);
        expect(report.summary.falseReacquisitionRate).toBe(0);
        const cleanFixture = report.fixtures.find((fixture) => fixture.name === 'clean-centered-red');
        const degradedFixture = report.fixtures.find((fixture) => fixture.name === 'degraded-occlusion-red');

        expect(cleanFixture).toMatchObject({
            p95ErrorPx: 0,
            maxErrorPx: 0,
            meanReacquisitionFrames: 0,
            falseReacquisitionRate: 0,
        });
        expect(degradedFixture).toMatchObject({
            p95ErrorPx: 0,
            maxErrorPx: 0,
            meanReacquisitionFrames: 1,
            falseReacquisitionRate: 0,
        });
        expect(report.fixtures.map(fixture => fixture.name)).toEqual(
            expect.arrayContaining([
                'clean-centered-red',
                'degraded-occlusion-red',
            ])
        );
    });

    it('covers synthetic shake, blur, and short reacquisition fixtures', async () => {
        const report = await runTrackingGoldens({ fixturesDir });
        const fixturesByName = new Map(report.fixtures.map((fixture) => [fixture.name, fixture]));
        const shakeFixture = fixturesByName.get('shake-occlusion-red');
        const blurFixture = fixturesByName.get('blurred-red-reticle');
        const reacquisitionFixture = fixturesByName.get('short-loss-reacquisition-red');

        expect(report.passed).toBe(true);
        expect(shakeFixture?.passed).toBe(true);
        expect(shakeFixture?.frames.some((frame) => frame.actualStatus === 'uncertain')).toBe(true);
        expect(blurFixture?.passed).toBe(true);
        expect(blurFixture?.frames.some((frame) => frame.actualStatus === 'uncertain')).toBe(true);
        expect(reacquisitionFixture?.passed).toBe(true);
        expect(reacquisitionFixture?.meanReacquisitionFrames).toBe(1);
        expect(reacquisitionFixture?.falseReacquisitionRate).toBe(0);
    });

    it('fails a fixture when confidence calibration exceeds versioned thresholds', () => {
        const overconfidentFixture: TrackingGoldenFixture = {
            version: 1,
            name: 'overconfident-occlusion-red',
            color: 'RED',
            frameSize: {
                width: 24,
                height: 24,
            },
            roiRadiusPx: 8,
            thresholds: {
                minCoverage: 0,
                maxMeanErrorPx: 99,
                maxStatusMismatches: 99,
                maxBrierScore: 0,
                maxExpectedCalibrationError: 0,
            },
            frames: [
                {
                    timestamp: 0,
                    reticle: { x: 10, y: 10, shape: 'block', size: 5 },
                    expected: { status: 'tracked', x: 10, y: 10 },
                },
                {
                    timestamp: 16,
                    reticle: { x: 11, y: 10, shape: 'block', size: 5 },
                    expected: { status: 'occluded' },
                },
            ],
        };

        const result = evaluateTrackingGoldenFixture(overconfidentFixture);

        expect(result.confidenceCalibration.brierScore).toBeGreaterThan(0);
        expect(result.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(result.calibrationPassed).toBe(false);
        expect(result.passed).toBe(false);
    });
});
