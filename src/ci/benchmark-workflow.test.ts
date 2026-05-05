import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBaselineUpdateArgs } from '../../scripts/update-benchmark-baseline';

const readWorkspaceFile = (filePath: string): string => {
    return readFileSync(join(process.cwd(), filePath), 'utf8');
};

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
        expect(packageJson.scripts?.['benchmark:gate']).not.toContain('validate:sdd-coverage');
        expect(packageJson.scripts?.['verify:release']).not.toContain('validate:sdd-coverage');
        expect(packageJson.scripts?.['benchmark:gate']).not.toContain('benchmark:release');
        expect(packageJson.scripts?.['verify:release']).not.toContain('benchmark:release');
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
