import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community/[slug] page contract', () => {
    it('connects public post detail to the author profile when public profile data is available', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');
        const source = `${pageSource}\n${detailSource}`;

        expect(source).toMatch(/authorProfile|profileSlug|profileHref/);
        expect(source).toMatch(/\/community\/users\//);
        expect(source).toMatch(/Autor|Ver perfil/);
    });

    it('renders the server-derived Social Pro badge on post author identity only with anti-authority copy', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');
        const source = `${pageSource}\n${detailSource}`;

        expect(source).toMatch(/resolveSocialProAccessForUser\(\s*storedPost\.authorId/);
        expect(source).toMatch(/buildCommunityProBadge/);
        expect(source).toMatch(/authorProfile[\s\S]*proBadge/);
        expect(detailSource).toMatch(/data-social-pro-badge=["']post-author["']/);
        expect(detailSource).toMatch(/aria-label=\{post\.authorProfile\.proBadge\.ariaLabel\}/);
        expect(detailSource).toMatch(/title=\{post\.authorProfile\.proBadge\.tooltip\}/);
        expect(source).not.toMatch(/pro player|verified skill|skill verified|rank alto|melhor jogador|certificado pelo pro/i);
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

    it('keeps a clear hierarchy between hero, narrative, technical context and conversation', () => {
        const detailSource = readFileSync(new URL('./post-detail.tsx', import.meta.url), 'utf8');

        expect(detailSource).toMatch(/data-community-section=["']post-hero["']/);
        expect(detailSource).toMatch(/data-community-section=["']post-narrative["']/);
        expect(detailSource).toMatch(/data-community-section=["']post-technical-context["']/);
        expect(detailSource).toMatch(/data-community-section=["']post-conversation["']/);
        expect(detailSource).toMatch(/Resumo e diagnosticos/);
        expect(detailSource).toMatch(/Conversa deste post/);
        expect(detailSource).toMatch(/Contexto tecnico/);
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
