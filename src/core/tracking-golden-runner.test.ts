import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runTrackingGoldens } from '../../scripts/run-tracking-goldens';

const fixturesDir = fileURLToPath(new URL('../../tests/goldens/tracking', import.meta.url));

describe('runTrackingGoldens', () => {
    it('passes versioned clean and degraded tracking fixtures with coverage and error metrics', async () => {
        const report = await runTrackingGoldens({ fixturesDir });

        expect(report.passed).toBe(true);
        expect(report.summary.totalFixtures).toBe(2);
        expect(report.summary.failedFixtures).toBe(0);
        expect(report.summary.meanCoverage).toBe(1);
        expect(report.summary.meanErrorPx).toBeLessThanOrEqual(0.01);
        expect(report.summary.confidenceCalibration.sampleCount).toBe(7);
        expect(report.summary.confidenceCalibration.brierScore).toBeGreaterThan(0);
        expect(report.summary.confidenceCalibration.brierScore).toBeLessThan(0.1);
        expect(report.summary.confidenceCalibration.expectedCalibrationError).toBeGreaterThan(0);
        expect(report.summary.confidenceCalibration.expectedCalibrationError).toBeLessThan(0.2);
        expect(report.fixtures.map(fixture => fixture.name).sort()).toEqual([
            'clean-centered-red',
            'degraded-occlusion-red',
        ]);
    });
});
