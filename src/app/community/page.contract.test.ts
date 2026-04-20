import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community page contract', () => {
    it('is driven by the discovery view model and preserves actionable discovery navigation', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getCommunityDiscoveryViewModel/);
        expect(source).toMatch(/SeasonContextDeck|ViewerRitualDeck|MissionBoardSection/);
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

    it('renders community growth loops for following feed, trends and weekly drills', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/followingFeed|following-feed/);
        expect(source).toMatch(/Feed dos creators acompanhados|Seguindo/);
        expect(source).toMatch(/trendBoard|trend-board/);
        expect(source).toMatch(/Trend board|Armas, patches e diagnosticos em alta/);
        expect(source).toMatch(/weeklyDrillPrompt|weekly-drill-prompt/);
        expect(source).toMatch(/Drill semanal/);
        expect(source).toMatch(/\/community\?/);
    });

    it('renders viewer-aware gamification rails with stable markers and anonymous fallback entry points', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/data-community-section=["']season-context["']/);
        expect(source).toMatch(/data-community-section=["']weekly-challenge-board["']/);
        expect(source).toMatch(/data-community-section=["']progression-summary["']/);
        expect(source).toMatch(/data-community-section=["']personal-recap["']/);
        expect(source).toMatch(/data-community-section=["']squad-spotlight["']/);
        expect(source).toMatch(/data-community-section=["']mission-board["']/);
        expect(source).toMatch(/ParticipationPrompts/);
        expect(source).toMatch(/if \(!summary\) \{\s*return null;/);
        expect(source).toMatch(/viewModel\.viewerProgressionSummary/);
        expect(source).toMatch(/viewModel\.weeklyChallenge/);
        expect(source).toMatch(/viewModel\.seasonContext/);
        expect(source).toMatch(/viewModel\.missionBoard/);
    });

    it('renders trust rails in community highlights with accessible textual reasons', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/trustSignals/);
        expect(source).toMatch(/Sinais publicos explicaveis/);
        expect(source).toMatch(/data-community-section=["']community-trust-rail["']/);
        expect(source).toMatch(/data-community-signal=["']community-trust-signal["']/);
        expect(source).toMatch(/trustSignalLabel/);
        expect(source).toMatch(/trustSignalReason/);
        expect(source).toMatch(/\{signal\.label\}/);
        expect(source).toMatch(/\{signal\.reason\}/);
    });
});
