import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runDiagnosticGoldens } from '../../scripts/run-diagnostic-goldens';

const fixturesDir = fileURLToPath(new URL('../../tests/goldens/diagnostic', import.meta.url));

describe('runDiagnosticGoldens', () => {
    it('passes clean and degraded diagnostic fixtures with explicit expected diagnosis types', async () => {
        const report = await runDiagnosticGoldens({ fixturesDir });

        expect(report.passed).toBe(true);
        expect(report.summary.totalFixtures).toBe(2);
        expect(report.summary.failedFixtures).toBe(0);
        expect(report.fixtures.map((fixture) => fixture.name).sort()).toEqual([
            'clean-no-diagnosis-411',
            'degraded-underpull-low-confidence-411',
        ]);
    });
});
