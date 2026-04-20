import { describe, expect, it } from 'vitest';

import {
    buildCommunityDiscoveryViewModel,
    type CommunityDiscoverySourceAuthor,
    type CommunityDiscoverySourcePost,
} from './community-discovery-view-model';

const publicAuthor: CommunityDiscoverySourceAuthor = {
    userId: 'user-spray-doctor',
    profileId: 'profile-spray-doctor',
    profileSlug: 'spray-doctor',
    displayName: 'Spray Doctor',
    avatarUrl: null,
    visibility: 'public',
    creatorProgramStatus: 'approved',
};

function createSourcePost(
    overrides: Partial<CommunityDiscoverySourcePost> = {},
): CommunityDiscoverySourcePost {
    return {
        id: 'post-public-1',
        slug: 'beryl-spray-lab',
        title: 'Beryl spray lab',
        excerpt: 'Patch 36.1 recoil snapshot for mid-range fights.',
        status: 'published',
        visibility: 'public',
        publishedAt: new Date('2026-04-19T12:00:00.000Z'),
        primaryWeaponId: 'beryl-m762',
        primaryPatchVersion: '36.1',
        primaryDiagnosisKey: 'horizontal_drift',
        author: publicAuthor,
        engagement: {
            likeCount: 12,
            commentCount: 3,
            copyCount: 5,
            saveCount: 2,
        },
        ...overrides,
    };
}

describe('buildCommunityDiscoveryViewModel', () => {
    it('excludes non-public posts and private profiles before building discovery surfaces', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [
                createSourcePost({
                    id: 'post-public-match',
                    slug: 'beryl-spray-lab',
                }),
                createSourcePost({
                    id: 'post-draft',
                    slug: 'internal-draft',
                    status: 'draft',
                }),
                createSourcePost({
                    id: 'post-unlisted',
                    slug: 'unlisted-lab',
                    visibility: 'unlisted',
                }),
                createSourcePost({
                    id: 'post-without-publish-date',
                    slug: 'missing-published-at',
                    publishedAt: null,
                }),
                createSourcePost({
                    id: 'post-hidden-profile',
                    slug: 'hidden-profile-lab',
                    author: {
                        ...publicAuthor,
                        profileId: 'profile-hidden',
                        profileSlug: 'hidden-profile',
                        visibility: 'hidden',
                    },
                }),
            ],
        });

        expect(viewModel.hubSummary).toEqual({
            publicPostCount: 1,
            visiblePostCount: 1,
        });
        expect(viewModel.feed.cards.map((card) => card.id)).toEqual([
            'post-public-match',
        ]);
        expect(viewModel.filters.weaponOptions.map((option) => option.value)).toEqual([
            'beryl-m762',
        ]);
        expect(JSON.stringify(viewModel)).not.toContain('internal-draft');
        expect(JSON.stringify(viewModel)).not.toContain('unlisted-lab');
        expect(JSON.stringify(viewModel)).not.toContain('hidden-profile-lab');
    });

    it('keeps active filters visible and returns only matching public cards', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            filters: {
                weaponId: 'beryl-m762',
                patchVersion: '36.1',
                diagnosisKey: 'horizontal_drift',
            },
            posts: [
                createSourcePost({
                    id: 'post-matching-filter',
                    slug: 'beryl-spray-lab',
                }),
                createSourcePost({
                    id: 'post-wrong-weapon',
                    slug: 'ace-reset',
                    primaryWeaponId: 'ace32',
                }),
                createSourcePost({
                    id: 'post-wrong-patch',
                    slug: 'beryl-old-patch',
                    primaryPatchVersion: '35.2',
                }),
                createSourcePost({
                    id: 'post-wrong-diagnosis',
                    slug: 'beryl-vertical',
                    primaryDiagnosisKey: 'vertical_overpull',
                }),
            ],
        });

        expect(viewModel.filters.hasActiveFilters).toBe(true);
        expect(viewModel.filters.clearHref).toBe('/community');
        expect(viewModel.filters.activeFilters).toEqual([
            {
                key: 'weaponId',
                value: 'beryl-m762',
                label: 'Beryl M762',
                href: '/community?weaponId=beryl-m762',
            },
            {
                key: 'patchVersion',
                value: '36.1',
                label: 'Patch 36.1',
                href: '/community?patchVersion=36.1',
            },
            {
                key: 'diagnosisKey',
                value: 'horizontal_drift',
                label: 'Horizontal Drift',
                href: '/community?diagnosisKey=horizontal_drift',
            },
        ]);
        expect(viewModel.feed.cards.map((card) => card.id)).toEqual([
            'post-matching-filter',
        ]);
        expect(viewModel.feed.summary).toBe('1 publicacao publica encontrada.');
    });

    it('returns actionable empty states for a new hub and for no-result filters', () => {
        const emptyHub = buildCommunityDiscoveryViewModel({
            posts: [],
        });

        expect(emptyHub.feed.cards).toEqual([]);
        expect(emptyHub.feed.emptyState).toMatchObject({
            title: 'Nenhuma analise publica ainda',
            primaryAction: {
                label: 'Publicar analise',
                href: '/history',
            },
            secondaryAction: {
                label: 'Analisar recoil',
                href: '/analyze',
            },
        });
        expect(emptyHub.feed.emptyState?.body.toLowerCase()).not.toContain('erro');

        const filteredEmpty = buildCommunityDiscoveryViewModel({
            filters: {
                weaponId: 'm416',
            },
            posts: [
                createSourcePost({
                    id: 'post-beryl-only',
                    slug: 'beryl-only',
                    primaryWeaponId: 'beryl-m762',
                }),
            ],
        });

        expect(filteredEmpty.feed.cards).toEqual([]);
        expect(filteredEmpty.feed.emptyState).toMatchObject({
            title: 'Nenhum setup nesse filtro',
            primaryAction: {
                label: 'Limpar filtros',
                href: '/community',
            },
            secondaryAction: {
                label: 'Explorar todos',
                href: '/community',
            },
        });
        expect(filteredEmpty.feed.emptyState?.body.toLowerCase()).not.toContain('erro');
    });

    it('maps rich post cards with safe author, analysis, publish and engagement data', () => {
        const publishedAt = new Date('2026-04-19T12:00:00.000Z');

        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [
                createSourcePost({
                    id: 'post-rich',
                    slug: 'beryl-spray-lab',
                    publishedAt,
                }),
                createSourcePost({
                    id: 'post-fallback',
                    slug: 'unknown-operator-lab',
                    title: 'Unknown operator lab',
                    primaryWeaponId: null,
                    primaryPatchVersion: null,
                    primaryDiagnosisKey: null,
                    author: {
                        ...publicAuthor,
                        profileSlug: null,
                        displayName: null,
                        avatarUrl: null,
                        creatorProgramStatus: 'none',
                    },
                    publishedAt: new Date('2026-04-19T11:00:00.000Z'),
                    engagement: {
                        likeCount: 0,
                        commentCount: 0,
                        copyCount: 0,
                        saveCount: 0,
                    },
                }),
            ],
        });

        const richCard = viewModel.feed.cards.find((card) => card.id === 'post-rich');
        expect(richCard).toMatchObject({
            id: 'post-rich',
            slug: 'beryl-spray-lab',
            href: '/community/beryl-spray-lab',
            title: 'Beryl spray lab',
            excerpt: 'Patch 36.1 recoil snapshot for mid-range fights.',
            author: {
                displayName: 'Spray Doctor',
                profileHref: '/community/users/spray-doctor',
                avatarUrl: null,
                fallbackInitials: 'SD',
                creatorProgramStatus: 'approved',
            },
            analysisTags: [
                {
                    key: 'weapon',
                    value: 'beryl-m762',
                    label: 'Beryl M762',
                },
                {
                    key: 'patch',
                    value: '36.1',
                    label: 'Patch 36.1',
                },
                {
                    key: 'diagnosis',
                    value: 'horizontal_drift',
                    label: 'Horizontal Drift',
                },
            ],
            engagement: {
                likeCount: 12,
                commentCount: 3,
                copyCount: 5,
                saveCount: 2,
            },
            primaryAction: {
                label: 'Abrir analise',
                href: '/community/beryl-spray-lab',
            },
            publishedAt,
            publishedAtIso: '2026-04-19T12:00:00.000Z',
        });

        const fallbackCard = viewModel.feed.cards.find((card) => card.id === 'post-fallback');
        expect(fallbackCard).toMatchObject({
            author: {
                displayName: 'Operador publico',
                profileHref: null,
                avatarUrl: null,
                fallbackInitials: 'OP',
                creatorProgramStatus: 'none',
            },
            analysisTags: [],
            engagement: {
                likeCount: 0,
                commentCount: 0,
                copyCount: 0,
                saveCount: 0,
            },
        });
    });

    it('builds contextual participation prompts for reader, profile and publishable history states', () => {
        const anonymousHub = buildCommunityDiscoveryViewModel({
            posts: [],
        });

        expect(anonymousHub.participationPrompts).toEqual([
            {
                key: 'anonymous-reader',
                title: 'Siga creators e salve drills',
                body: 'Entre para seguir creators, salvar drills, comentar snapshots e copiar presets sem fechar a leitura publica.',
                action: {
                    label: 'Entrar',
                    href: '/login',
                },
            },
        ]);

        const profileIncompleteHub = buildCommunityDiscoveryViewModel({
            posts: [],
            viewer: {
                viewerUserId: 'user-no-profile',
                hasPublicProfile: false,
                publicProfileHref: null,
                publishableAnalysisCount: 0,
            },
        });

        expect(profileIncompleteHub.participationPrompts).toEqual([
            {
                key: 'complete-profile',
                title: 'Ative sua operator plate',
                body: 'Complete o perfil publico antes de publicar analises, seguir creators e deixar sua squad reconhecer seus snapshots.',
                action: {
                    label: 'Completar perfil',
                    href: '/profile',
                },
            },
        ]);

        const publishableHistoryHub = buildCommunityDiscoveryViewModel({
            posts: [],
            viewer: {
                viewerUserId: 'user-ready',
                hasPublicProfile: true,
                publicProfileHref: '/community/users/spray-doctor',
                publishableAnalysisCount: 2,
            },
        });

        expect(publishableHistoryHub.participationPrompts).toEqual([
            {
                key: 'publish-analysis',
                title: 'Transforme recoil em post',
                body: '2 analises prontas no historico para publicar, comparar recoil e testar presets com a comunidade.',
                action: {
                    label: 'Publicar analise',
                    href: '/history',
                },
            },
        ]);
    });

    it('builds a following feed from only published public posts owned by followed public profiles', () => {
        const followedAuthor: CommunityDiscoverySourceAuthor = {
            ...publicAuthor,
            userId: 'user-followed',
            profileId: 'profile-followed',
            profileSlug: 'followed-creator',
            displayName: 'Followed Creator',
        };
        const otherAuthor: CommunityDiscoverySourceAuthor = {
            ...publicAuthor,
            userId: 'user-other',
            profileId: 'profile-other',
            profileSlug: 'other-creator',
            displayName: 'Other Creator',
        };
        const hiddenFollowedAuthor: CommunityDiscoverySourceAuthor = {
            ...followedAuthor,
            profileId: 'profile-hidden-followed',
            profileSlug: 'hidden-followed',
            visibility: 'hidden',
        };

        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [
                createSourcePost({
                    id: 'post-followed-public',
                    slug: 'followed-public',
                    author: followedAuthor,
                }),
                createSourcePost({
                    id: 'post-other-public',
                    slug: 'other-public',
                    author: otherAuthor,
                }),
                createSourcePost({
                    id: 'post-followed-draft',
                    slug: 'followed-draft',
                    status: 'draft',
                    publishedAt: null,
                    author: followedAuthor,
                }),
                createSourcePost({
                    id: 'post-followed-private',
                    slug: 'followed-private',
                    visibility: 'unlisted',
                    author: followedAuthor,
                }),
                createSourcePost({
                    id: 'post-followed-hidden-profile',
                    slug: 'followed-hidden-profile',
                    author: hiddenFollowedAuthor,
                }),
                createSourcePost({
                    id: 'post-followed-unpublished',
                    slug: 'followed-unpublished',
                    publishedAt: null,
                    author: followedAuthor,
                }),
            ],
            viewer: {
                viewerUserId: 'viewer-1',
                hasPublicProfile: true,
                publicProfileHref: '/community/users/viewer',
                publishableAnalysisCount: 0,
                followedUserIds: ['user-followed'],
            },
        });

        expect(viewModel.followingFeed.cards.map((card) => card.id)).toEqual([
            'post-followed-public',
        ]);
        expect(viewModel.followingFeed.summary).toBe('1 snapshot publico de perfis seguidos.');
        expect(viewModel.followingFeed.emptyState).toBeNull();
        expect(JSON.stringify(viewModel.followingFeed)).not.toContain('other-public');
        expect(JSON.stringify(viewModel.followingFeed)).not.toContain('followed-draft');
        expect(JSON.stringify(viewModel.followingFeed)).not.toContain('followed-private');
        expect(JSON.stringify(viewModel.followingFeed)).not.toContain('followed-hidden-profile');
        expect(JSON.stringify(viewModel.followingFeed)).not.toContain('followed-unpublished');
    });

    it('returns a creator-discovery empty state when an authenticated viewer follows nobody', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [createSourcePost()],
            viewer: {
                viewerUserId: 'viewer-without-follows',
                hasPublicProfile: true,
                publicProfileHref: '/community/users/viewer',
                publishableAnalysisCount: 0,
                followedUserIds: [],
            },
        });

        expect(viewModel.followingFeed.cards).toEqual([]);
        expect(viewModel.followingFeed.emptyState).toMatchObject({
            title: 'Voce ainda nao segue creators',
            primaryAction: {
                label: 'Descobrir creators',
                href: '/community#creator-plates',
            },
            secondaryAction: {
                label: 'Explorar todos',
                href: '/community',
            },
        });
    });

    it('builds explainable trend items by weapon, patch and diagnosis from public posts and public engagement only', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [
                createSourcePost({
                    id: 'post-trend-1',
                    slug: 'trend-one',
                    engagement: {
                        likeCount: 1,
                        commentCount: 0,
                        copyCount: 2,
                        saveCount: 1,
                    },
                }),
                createSourcePost({
                    id: 'post-trend-2',
                    slug: 'trend-two',
                    publishedAt: new Date('2026-04-19T11:00:00.000Z'),
                    engagement: {
                        likeCount: 2,
                        commentCount: 1,
                        copyCount: 1,
                        saveCount: 0,
                    },
                }),
                createSourcePost({
                    id: 'post-private-trend-noise',
                    slug: 'private-trend-noise',
                    visibility: 'unlisted',
                    engagement: {
                        likeCount: 99,
                        commentCount: 99,
                        copyCount: 99,
                        saveCount: 99,
                    },
                }),
                createSourcePost({
                    id: 'post-hidden-profile-trend-noise',
                    slug: 'hidden-profile-trend-noise',
                    author: {
                        ...publicAuthor,
                        profileId: 'profile-hidden-trend',
                        profileSlug: 'hidden-trend',
                        visibility: 'hidden',
                    },
                    engagement: {
                        likeCount: 99,
                        commentCount: 99,
                        copyCount: 99,
                        saveCount: 99,
                    },
                }),
                createSourcePost({
                    id: 'post-draft-trend-noise',
                    slug: 'draft-trend-noise',
                    status: 'draft',
                    publishedAt: null,
                    engagement: {
                        likeCount: 99,
                        commentCount: 99,
                        copyCount: 99,
                        saveCount: 99,
                    },
                }),
            ],
        });

        const weaponTrend = viewModel.trendBoard.items.find((item) => item.key === 'weapon:beryl-m762');
        const patchTrend = viewModel.trendBoard.items.find((item) => item.key === 'patch:36.1');
        const diagnosisTrend = viewModel.trendBoard.items.find((item) => item.key === 'diagnosis:horizontal_drift');

        expect(weaponTrend).toMatchObject({
            kind: 'weapon',
            value: 'beryl-m762',
            label: 'Beryl M762',
            href: '/community?weaponId=beryl-m762',
            postCount: 2,
            engagementCount: 8,
            reason: '2 posts publicos com 3 presets copiados.',
        });
        expect(patchTrend).toMatchObject({
            kind: 'patch',
            value: '36.1',
            label: 'Patch 36.1',
            href: '/community?patchVersion=36.1',
            postCount: 2,
        });
        expect(diagnosisTrend).toMatchObject({
            kind: 'diagnosis',
            value: 'horizontal_drift',
            label: 'Horizontal Drift',
            href: '/community?diagnosisKey=horizontal_drift',
            postCount: 2,
        });
        expect(JSON.stringify(viewModel.trendBoard)).not.toContain('private-trend-noise');
        expect(JSON.stringify(viewModel.trendBoard)).not.toContain('hidden-profile-trend-noise');
        expect(JSON.stringify(viewModel.trendBoard)).not.toContain('draft-trend-noise');
    });

    it('builds a weekly drill prompt from trend context and falls back to analyze/history when trends are unavailable', () => {
        const trendHub = buildCommunityDiscoveryViewModel({
            posts: [
                createSourcePost({
                    id: 'post-trend-1',
                    slug: 'trend-one',
                }),
                createSourcePost({
                    id: 'post-trend-2',
                    slug: 'trend-two',
                    publishedAt: new Date('2026-04-19T11:00:00.000Z'),
                }),
            ],
        });

        expect(trendHub.weeklyDrillPrompt).toMatchObject({
            trendKey: 'weapon:beryl-m762',
            title: 'Drill semanal: estabilizar Beryl M762',
            action: {
                label: 'Ver tendencia',
                href: '/community?weaponId=beryl-m762',
            },
            secondaryAction: {
                label: 'Analisar recoil',
                href: '/analyze',
            },
        });

        const fallbackHub = buildCommunityDiscoveryViewModel({
            posts: [createSourcePost()],
        });

        expect(fallbackHub.trendBoard.items).toEqual([]);
        expect(fallbackHub.weeklyDrillPrompt).toEqual({
            trendKey: null,
            title: 'Drill semanal: publique um snapshot base',
            body: 'Sem tendencia publica suficiente ainda. Rode uma analise, salve o historico e publique um snapshot para abrir o proximo sinal.',
            action: {
                label: 'Analisar recoil',
                href: '/analyze',
            },
            secondaryAction: {
                label: 'Abrir historico',
                href: '/history',
            },
        });
    });

    it('builds evergreen season context and anonymous weekly challenge fallback without private progression modules', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [],
        });

        expect(viewModel.seasonContext).toEqual({
            title: 'Progressao da comunidade',
            theme: 'Evergreen',
            summary: 'Sem temporada ativa no momento. Continue contribuindo com progresso neutro e sem ranking sazonal.',
            stateLabel: 'Modo evergreen',
            windowLabel: 'Sempre disponivel',
        });
        expect(viewModel.weeklyChallenge).toMatchObject({
            source: 'fallback',
            title: 'Desafio semanal: publique um snapshot util',
            trendHref: null,
            actions: [
                {
                    title: 'Complete sua operator plate',
                    href: '/login',
                },
                {
                    title: 'Publique um snapshot util',
                    href: '/login',
                },
            ],
        });
        expect(viewModel.viewerProgressionSummary).toBeNull();
        expect(viewModel.missionBoard).toBeNull();
        expect(viewModel.personalRecap).toBeNull();
        expect(viewModel.squadSpotlight).toBeNull();
    });

    it('creates viewer zero states for progression summary, mission board and recap when ritual context is absent', () => {
        const viewModel = buildCommunityDiscoveryViewModel({
            posts: [],
            viewer: {
                viewerUserId: 'viewer-1',
                hasPublicProfile: true,
                publicProfileHref: '/community/users/viewer',
                publishableAnalysisCount: 0,
            },
        });

        expect(viewModel.viewerProgressionSummary).toMatchObject({
            state: 'zero_state',
            title: 'Sua progressao ainda esta zerada',
            level: 1,
            totalXp: 0,
            nextAction: {
                title: 'Publique uma analise publica',
                href: '/history',
            },
            publicProfileHref: '/community/users/viewer',
        });
        expect(viewModel.missionBoard).toMatchObject({
            title: 'Mission board semanal',
            items: [],
            emptyState: {
                title: 'Mission board em zero state',
                primaryAction: {
                    label: 'Publicar analise',
                    href: '/history',
                },
            },
        });
        expect(viewModel.personalRecap).toMatchObject({
            state: 'zero_state',
            title: 'Recap ainda em branco',
            rewardCount: 0,
            earnedXp: 0,
            nextAction: {
                title: 'Publicar analise',
                href: '/history',
            },
        });
        expect(viewModel.squadSpotlight).toBeNull();
    });
});
