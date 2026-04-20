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
});
