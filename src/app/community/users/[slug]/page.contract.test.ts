import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community/users/[slug] page contract', () => {
    it('uses the public profile view model and keeps profile navigation shareable', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getPublicCommunityProfileViewModel/);
        expect(source).toMatch(/canonicalPath|profileHref|\/community\/users\//);
        expect(source).toMatch(/href=\{?['"`]\/community['"`]\}?|href=["']\/community["']/);
        expect(source).toMatch(/ReportButton/);
        expect(source).toMatch(/FollowButton/);
    });

    it('keeps no-post profile states connected back to community discovery', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Sem posts publicados|emptyState\.title/);
        expect(source).toMatch(/Explorar comunidade|Voltar para comunidade|emptyState\.primaryAction/);
        expect(source).toMatch(/\/community/);
    });
});
