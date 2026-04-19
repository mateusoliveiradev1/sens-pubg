import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readWorkspaceFile = (filePath: string): string => {
    return readFileSync(join(process.cwd(), filePath), 'utf8');
};

const expectedCommunityVitestFiles = [
    'src/ci/community-workflow.test.ts',
    'src/types/community.test.ts',
    'src/core/community-post-snapshot.test.ts',
    'src/core/community-feed.test.ts',
    'src/core/community-moderation.test.ts',
    'src/core/community-creator-metrics.test.ts',
    'src/lib/community-access.test.ts',
    'src/lib/community-entitlements.test.ts',
    'src/actions/community-posts.test.ts',
    'src/actions/community-copy.test.ts',
    'src/actions/community-profiles.test.ts',
    'src/actions/community-likes.test.ts',
    'src/actions/community-saves.test.ts',
    'src/actions/community-comments.test.ts',
    'src/actions/community-follows.test.ts',
    'src/actions/community-reports.test.ts',
    'src/actions/community-admin.test.ts',
    'src/actions/community-rate-limit.test.ts',
    'src/app/community/metadata.test.ts',
    'src/app/community/[slug]/page.test.tsx',
] as const;

const expectedCommunityE2eFiles = [
    'e2e/community.publish-entry.spec.ts',
    'e2e/community.publish.spec.ts',
    'e2e/community.feed.spec.ts',
    'e2e/community.comments.spec.ts',
    'e2e/community.admin.spec.ts',
] as const;

describe('community verification workflow', () => {
    it('exposes a single local community verification gate', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.['verify:community']).toContain('npm run typecheck');
        expect(packageJson.scripts?.['verify:community']).toContain('npm run test:community:unit');
        expect(packageJson.scripts?.['verify:community']).toContain('npm run build');
        expect(packageJson.scripts?.['verify:community']).toContain('npm run test:community:e2e');
    });

    it('keeps the vitest gate scoped to the community contracts and flows', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };
        const vitestGate = packageJson.scripts?.['test:community:unit'];

        expect(vitestGate).toBeDefined();

        for (const filePath of expectedCommunityVitestFiles) {
            expect(existsSync(join(process.cwd(), filePath))).toBe(true);
            expect(vitestGate).toContain(filePath);
        }

        expect(vitestGate).not.toContain('src/db/schema.test.ts');
        expect(vitestGate).not.toContain('src/actions/history.test.ts');
        expect(vitestGate).not.toContain('benchmark');
    });

    it('keeps the Playwright gate scoped to the community journeys', () => {
        const packageJson = JSON.parse(readWorkspaceFile('package.json')) as {
            scripts?: Record<string, string>;
        };
        const e2eGate = packageJson.scripts?.['test:community:e2e'];

        expect(e2eGate).toBeDefined();

        for (const filePath of expectedCommunityE2eFiles) {
            expect(existsSync(join(process.cwd(), filePath))).toBe(true);
            expect(e2eGate).toContain(filePath);
        }

        expect(e2eGate).not.toContain('smoke:local');
        expect(e2eGate).not.toContain('benchmark');
        expect(e2eGate).not.toContain('e2e/example');
    });
});
