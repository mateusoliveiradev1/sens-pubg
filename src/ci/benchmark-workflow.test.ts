import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
        expect(packageJson.scripts?.['verify:release']).toContain('npm run build');
        expect(packageJson.scripts?.['verify:release']).toContain('npm run smoke:local');
    });
});
