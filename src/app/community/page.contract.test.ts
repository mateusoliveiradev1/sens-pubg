import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community page contract', () => {
    it('is driven by the discovery view model and preserves actionable discovery navigation', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getCommunityDiscoveryViewModel/);
        expect(source).toMatch(/featuredPosts|postHighlights|creatorHighlights/);
        expect(source).toMatch(/\/community\/users\//);
        expect(source).toMatch(/clearHref|Limpar filtros/);
        expect(source).toMatch(/\/history/);
        expect(source).toMatch(/\/analyze/);
    });

    it('turns hub and filter empty states into next actions instead of dead ends', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Nenhuma analise publica ainda|emptyState\.title/);
        expect(source).toMatch(/Nenhum setup nesse filtro|noResultEmptyState|filterEmptyState/);
        expect(source).toMatch(/Publicar analise|emptyState\.primaryAction/);
        expect(source).toMatch(/Explorar todos|emptyState\.secondaryAction/);
        expect(source).not.toMatch(/Nenhum resultado no feed/);
    });
});
