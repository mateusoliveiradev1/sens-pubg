import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBaselineUpdateArgs } from '../../scripts/update-benchmark-baseline';

const readWorkspaceFile = (filePath: string): string => {
    return readFileSync(join(process.cwd(), filePath), 'utf8');
};

const normalizeDoc = (copy: string): string => copy.toLowerCase();

describe('CI benchmark workflow', () => {
    it('runs the benchmark regression gate from the main CI workflow', () => {
        const workflow = readWorkspaceFile('.github/workflows/ci.yml');
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.benchmark).toContain('scripts/run-benchmark.ts');
        expect(packageJson.scripts?.benchmark).toContain('synthetic-benchmark.baseline.json');
        expect(packageJson.scripts?.['benchmark:gate']).toContain('npm run benchmark:all');
        expect(packageJson.scripts?.['benchmark:gate']).toContain('npm run validate:benchmark-coverage');
        expect(packageJson.scripts?.['benchmark:release']).toBe('tsx scripts/run-benchmark-release.ts');
        expect(workflow).toContain('Benchmark regression + coverage gate');
        expect(workflow).toContain('npm run benchmark:gate');
        expect(packageJson.scripts?.['benchmark:gate']).not.toContain('benchmark:release');
    });

    it('runs Playwright as an explicit E2E gate in CI', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };
        const workflow = readWorkspaceFile('.github/workflows/ci.yml');

        expect(workflow).toContain('E2E Tests');
        expect(workflow).toContain('npx playwright install --with-deps chromium');
        expect(packageJson.scripts?.['smoke:local']).toBe('npx playwright test');
        expect(workflow).toContain('npm run smoke:local');
    });

    it('exposes a single local release verification script', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:release']).toContain('npm run typecheck');
        expect(packageJson.scripts?.['verify:release']).toContain('npx vitest run');
        expect(packageJson.scripts?.['verify:release']).toContain('npm run benchmark:gate');
        expect(packageJson.scripts?.['verify:release']).not.toContain('benchmark:release');
        expect(packageJson.scripts?.['verify:release']).toContain('npm run build');
        expect(packageJson.scripts?.['verify:release']).toContain('npm run smoke:local');
    });

    it('keeps the strict commercial benchmark gate separate from daily CI', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['validate:sdd-coverage']).toContain('scripts/validate-benchmark-coverage.ts --sdd');
        expect(packageJson.scripts?.['benchmark:release']).toContain('scripts/run-benchmark-release.ts');
        expect(readWorkspaceFile('scripts/run-benchmark-release.ts')).toContain('buildBenchmarkCoverageSummary');
        expect(readWorkspaceFile('scripts/run-benchmark-release.ts')).toContain('buildAnalysisCalibrationReport');
        expect(readWorkspaceFile('scripts/run-benchmark-release.ts')).toContain("releaseReport.status === 'blocked' ? 1 : 0");
        expect(packageJson.scripts?.['benchmark:gate']).not.toContain('validate:sdd-coverage');
        expect(packageJson.scripts?.['verify:release']).not.toContain('validate:sdd-coverage');
        expect(packageJson.scripts?.['benchmark:gate']).not.toContain('benchmark:release');
        expect(packageJson.scripts?.['verify:release']).not.toContain('benchmark:release');
    });

    it('requires calibration in the strict release report while keeping the fast gate unchanged', () => {
        const releaseReportSource = readWorkspaceFile('src/core/benchmark-release-report.ts');
        const runnerDocs = readWorkspaceFile('docs/benchmark-runner.md');
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['benchmark:gate']).toBe('npm run benchmark:all && npm run validate:benchmark-coverage');
        expect(packageJson.scripts?.['benchmark:release']).toBe('tsx scripts/run-benchmark-release.ts');
        expect(releaseReportSource).toContain('calibrationReport');
        expect(readWorkspaceFile('src/core/analysis-calibration-report.ts')).toContain('## Calibration');
        expect(runnerDocs).toContain('strict commercial truth gate');
    });

    it('keeps Phase 6 No False Done evidence tied to commercial readiness gates', () => {
        const readinessDoc = normalizeDoc(readWorkspaceFile('docs/commercial-accuracy-readiness.md'));
        const checklist = normalizeDoc(readWorkspaceFile(
            '.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-VERIFY-CHECKLIST.md',
        ));
        const requiredHeadings = [
            '# commercial accuracy readiness',
            '## gate prerequisites',
            '## allowed claims after gate pass',
            '## disallowed claims',
            '## corpus and consent evidence',
            '## calibration evidence',
            '## remaining launch blockers',
        ];
        const requiredGates = [
            'npm run typecheck',
            'npx vitest run',
            'npm run benchmark:gate',
            'npm run benchmark:release',
            'tracking goldens',
            'diagnostic goldens',
            'coach goldens',
            'captured corpus validation',
            'calibration report',
            'copy claims test',
            'specialist/human review',
        ];
        const requirementIds = [
            'PREC-01',
            'PREC-02',
            'PREC-03',
            'PREC-04',
            'BENCH-01',
            'BENCH-02',
            'BENCH-03',
            'COACH-01',
            'COACH-02',
            'COACH-03',
            'COACH-04',
            'COACH-05',
        ];

        for (const heading of requiredHeadings) {
            expect(readinessDoc).toContain(heading);
        }

        for (const gate of requiredGates) {
            expect(readinessDoc).toContain(gate);
            expect(checklist).toContain(gate);
        }

        for (const requirementId of requirementIds) {
            expect(checklist).toContain(requirementId.toLowerCase());
        }

        expect(checklist).toContain('final status: **partially delivered**');
        expect(checklist).toContain('no false done');
        expect(checklist).toContain('0 reviewed permissioned commercial benchmark clips');
        expect(checklist).not.toContain('final status: **delivered**');
    });

    it('exposes an explicit baseline update workflow', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['benchmark:update-baseline']).toBe('tsx scripts/update-benchmark-baseline.ts');
        expect(readWorkspaceFile('scripts/update-benchmark-baseline.ts')).toContain('honesty-rationale');
    });

    it('requires baseline update reason, affected clips, and honesty rationale', () => {
        expect(() => parseBaselineUpdateArgs(['--dataset', 'captured'])).toThrow('Missing required --reason');
        expect(() => parseBaselineUpdateArgs([
            '--dataset',
            'captured',
            '--reason',
            'Behavior became more honest',
        ])).toThrow('Missing required --affected-clips');
        expect(() => parseBaselineUpdateArgs([
            '--dataset',
            'captured',
            '--reason',
            'Behavior became more honest',
            '--affected-clips',
            'captured-clip1',
        ])).toThrow('Missing required --honesty-rationale');
        expect(parseBaselineUpdateArgs([
            '--dataset',
            'captured',
            '--reason',
            'Behavior became more honest',
            '--affected-clips',
            'captured-clip1',
            '--honesty-rationale',
            'The new refusal avoids overclaiming weak evidence',
        ])).toEqual({
            dataset: 'captured',
            reason: 'Behavior became more honest',
            affectedClips: 'captured-clip1',
            honestyRationale: 'The new refusal avoids overclaiming weak evidence',
        });
    });
});
