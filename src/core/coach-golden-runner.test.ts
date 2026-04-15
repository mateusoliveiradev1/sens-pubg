import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCoachGoldens } from '../../scripts/run-coach-goldens';

const fixturesDir = fileURLToPath(new URL('../../tests/goldens/coach', import.meta.url));

describe('runCoachGoldens', () => {
    it('passes explicit coach golden fixtures', async () => {
        const report = await runCoachGoldens({ fixturesDir });

        expect(report.passed).toBe(true);
        expect(report.summary.totalFixtures).toBeGreaterThanOrEqual(5);
        expect(report.summary.failedFixtures).toBe(0);
        expect(report.fixtures.map(fixture => fixture.name).sort()).toEqual([
            'clean-no-diagnosis-411',
            'horizontal-drift-361-angled',
            'horizontal-drift-411-tilted',
            'hybrid-scope-411',
            'low-confidence-underpull',
            'underpull-standard-411',
        ]);
    });
});
