import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community/[slug] page contract', () => {
    it('connects public post detail to the author profile when public profile data is available', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');
        const source = `${pageSource}\n${detailSource}`;

        expect(source).toMatch(/authorProfile|profileSlug|profileHref/);
        expect(source).toMatch(/\/community\/users\//);
        expect(source).toMatch(/Perfil do autor|Abrir perfil|Ver operador/);
    });

    it('provides continuity links from post context back to relevant discovery paths', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');
        const source = `${pageSource}\n${detailSource}`;

        expect(source).toMatch(/discoveryLinks|relatedDiscoveryPaths|communityContinuityLinks/);
        expect(source).toMatch(/weaponId/);
        expect(source).toMatch(/patchVersion/);
        expect(source).toMatch(/diagnosisKey/);
        expect(source).toMatch(/\/community\?/);
    });

    it('keeps report actions visible for posts and comments with login states', () => {
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');

        expect(detailSource).toMatch(/<ReportButton[\s\S]*entityType=["']post["']/);
        expect(detailSource).toMatch(/<ReportButton[\s\S]*entityType=["']comment["']/);
        expect(detailSource).toMatch(/disabledHref=\{post\.viewerCanReport \? undefined : ['"]\/login['"]\}/);
        expect(detailSource).toMatch(/Entre na sua conta para reportar conteudo da comunidade/);
        expect(detailSource).toMatch(/Entre na sua conta para reportar este comentario/);
    });
});
