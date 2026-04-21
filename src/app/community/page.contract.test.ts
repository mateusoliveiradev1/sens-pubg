import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('/community page contract', () => {
    it('is driven by the discovery view model and preserves actionable discovery navigation', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getCommunityDiscoveryViewModel/);
        expect(source).toMatch(/CommunityBand|SeasonContextDeck|ViewerRitualDeck|MissionBoardSection/);
        expect(source).toMatch(/community-now-band|community-pulse-band|community-explore-band/);
        expect(source).toMatch(/featuredPosts|postHighlights|creatorHighlights/);
        expect(source).toMatch(/publicDensity\.mode|isSparsePublicMode/);
        expect(source).toMatch(/\/community\/users\//);
        expect(source).toMatch(/clearHref|Limpar filtros/);
        expect(source).toMatch(/focus\.action\.href|summary\.nextAction\.href|prompt\.action\.href/);
        expect(source).toMatch(/community-feed/);
    });

    it('turns hub and filter empty states into next actions instead of dead ends', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Ainda nao ha posts publicos|emptyState\.title/);
        expect(source).toMatch(/Nada nesse recorte|noResultEmptyState|filterEmptyState/);
        expect(source).toMatch(/Publicar post|emptyState\.primaryAction/);
        expect(source).toMatch(/Explorar todos|emptyState\.secondaryAction/);
        expect(source).not.toMatch(/Nenhum resultado no feed/);
    });

    it('renders community growth loops for following feed, trends and weekly drills', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/hero-pulse/);
        expect(source).toMatch(/followingFeed|following-feed/);
        expect(source).toMatch(/De quem voce acompanha|Seguindo/);
        expect(source).toMatch(/trendBoard|trend-board/);
        expect(source).toMatch(/Armas, patches e leituras que estao puxando conversa|trend-board/);
        expect(source).toMatch(/weeklyDrillPrompt|weekly-drill-prompt/);
        expect(source).toMatch(/Treino da semana/);
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
        expect(source).toMatch(/resolveCommunityHubFocus|participationPrompts/);
        expect(source).toMatch(/boardFocusPanel/);
        expect(source).toMatch(/if \(!summary\) \{\s*return null;/);
        expect(source).toMatch(/viewModel\.viewerProgressionSummary/);
        expect(source).toMatch(/viewModel\.weeklyChallenge/);
        expect(source).toMatch(/viewModel\.seasonContext/);
        expect(source).toMatch(/viewModel\.missionBoard/);
        expect(source).toMatch(/Seu spray agora/);
        expect(source).toMatch(/summary\.stageLabel/);
        expect(source).toMatch(/summary\.nextMilestone/);
        expect(source).toMatch(/summary\.socialReinforcement/);
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
