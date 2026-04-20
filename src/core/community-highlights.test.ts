import { describe, expect, it } from 'vitest';

import {
    buildCommunityCreatorHighlights,
    buildFeaturedCommunityPostHighlights,
    formatCommunityCreatorBadge,
    type CommunityHighlightSourceCreator,
    type CommunityHighlightSourcePost,
} from './community-highlights';

const now = new Date('2026-04-19T12:00:00.000Z');

function createHighlightPost(
    overrides: Partial<CommunityHighlightSourcePost> = {},
): CommunityHighlightSourcePost {
    return {
        id: 'post-featured-1',
        slug: 'beryl-spray-lab',
        title: 'Beryl spray lab',
        excerpt: 'Patch 36.1 recoil snapshot for mid-range fights.',
        status: 'published',
        visibility: 'public',
        publishedAt: new Date('2026-04-19T10:00:00.000Z'),
        featuredUntil: new Date('2026-04-21T00:00:00.000Z'),
        primaryWeaponId: 'beryl-m762',
        primaryPatchVersion: '36.1',
        primaryDiagnosisKey: 'horizontal_drift',
        engagement: {
            likeCount: 12,
            commentCount: 3,
            copyCount: 9,
            saveCount: 4,
        },
        ...overrides,
    };
}

function createHighlightCreator(
    overrides: Partial<CommunityHighlightSourceCreator> = {},
): CommunityHighlightSourceCreator {
    return {
        profileId: 'profile-spray-doctor',
        profileSlug: 'spray-doctor',
        displayName: 'Spray Doctor',
        visibility: 'public',
        creatorProgramStatus: 'approved',
        followerCount: 18,
        publicPostCount: 4,
        likeCount: 32,
        commentCount: 7,
        copyCount: 11,
        lastPublicPostAt: new Date('2026-04-19T09:00:00.000Z'),
        ...overrides,
    };
}

describe('community highlight helpers', () => {
    it('builds featured post highlights from public posts with explainable domain signals', () => {
        const highlights = buildFeaturedCommunityPostHighlights({
            now,
            posts: [
                createHighlightPost({
                    id: 'post-featured',
                    slug: 'beryl-spray-lab',
                }),
                createHighlightPost({
                    id: 'post-draft',
                    slug: 'private-draft',
                    status: 'draft',
                    publishedAt: null,
                }),
                createHighlightPost({
                    id: 'post-unlisted',
                    slug: 'unlisted-lab',
                    visibility: 'unlisted',
                }),
                createHighlightPost({
                    id: 'post-expired-feature',
                    slug: 'expired-feature',
                    featuredUntil: new Date('2026-04-18T00:00:00.000Z'),
                    engagement: {
                        likeCount: 0,
                        commentCount: 0,
                        copyCount: 0,
                        saveCount: 0,
                    },
                }),
            ],
        });

        expect(highlights.items).toEqual([
            {
                id: 'post-featured',
                slug: 'beryl-spray-lab',
                href: '/community/beryl-spray-lab',
                title: 'Beryl spray lab',
                excerpt: 'Patch 36.1 recoil snapshot for mid-range fights.',
                reason: 'Preset copiado 9 vezes no Patch 36.1.',
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
            },
        ]);
        expect(JSON.stringify(highlights)).not.toContain('private-draft');
        expect(JSON.stringify(highlights)).not.toContain('unlisted-lab');
        expect(JSON.stringify(highlights)).not.toContain('expired-feature');
        expect(JSON.stringify(highlights).toLowerCase()).not.toContain('viral');
    });

    it('builds creator highlights from public creator activity without implying skill claims', () => {
        const highlights = buildCommunityCreatorHighlights({
            now,
            creators: [
                createHighlightCreator(),
                createHighlightCreator({
                    profileId: 'profile-hidden',
                    profileSlug: 'hidden-creator',
                    displayName: 'Hidden Creator',
                    visibility: 'hidden',
                }),
                createHighlightCreator({
                    profileId: 'profile-empty',
                    profileSlug: 'empty-creator',
                    displayName: 'Empty Creator',
                    creatorProgramStatus: 'none',
                    followerCount: 0,
                    publicPostCount: 0,
                    likeCount: 0,
                    commentCount: 0,
                    copyCount: 0,
                    lastPublicPostAt: null,
                }),
            ],
        });

        expect(highlights.items).toEqual([
            {
                profileId: 'profile-spray-doctor',
                profileHref: '/community/users/spray-doctor',
                displayName: 'Spray Doctor',
                badge: {
                    label: 'Creator aprovado',
                    status: 'approved',
                },
                reasons: [
                    'Creator aprovado',
                    '18 seguidores',
                    '4 analises publicas',
                    '11 presets copiados',
                ],
            },
        ]);
        expect(JSON.stringify(highlights)).not.toContain('hidden-creator');
        expect(JSON.stringify(highlights)).not.toContain('empty-creator');
        expect(JSON.stringify(highlights).toLowerCase()).not.toMatch(/pro player|expert|melhor jogador|skill/);
    });

    it('formats reputation badges as factual stored status labels only', () => {
        expect(formatCommunityCreatorBadge('approved')).toEqual({
            label: 'Creator aprovado',
            status: 'approved',
        });
        expect(formatCommunityCreatorBadge('waitlist')).toEqual({
            label: 'Creator em avaliacao',
            status: 'waitlist',
        });
        expect(formatCommunityCreatorBadge('suspended')).toEqual({
            label: 'Creator suspenso',
            status: 'suspended',
        });
        expect(formatCommunityCreatorBadge('none')).toBeNull();

        const approvedBadgeText = JSON.stringify(formatCommunityCreatorBadge('approved')).toLowerCase();
        expect(approvedBadgeText).not.toMatch(/pro player|expert|melhor|rank|skill/);
    });

    it('returns neutral action-oriented fallbacks when no highlights are available', () => {
        const posts = buildFeaturedCommunityPostHighlights({
            now,
            posts: [],
        });
        const creators = buildCommunityCreatorHighlights({
            now,
            creators: [],
        });

        expect(posts).toEqual({
            items: [],
            emptyState: {
                title: 'Sem destaques publicos ainda',
                body: 'Publique uma analise, compare recoil, copie um preset ou salve um drill para gerar sinais publicos.',
                primaryAction: {
                    label: 'Publicar analise',
                    href: '/history',
                },
            },
        });
        expect(creators).toEqual({
            items: [],
            emptyState: {
                title: 'Sem creators em destaque ainda',
                body: 'Siga creators, comente analises e copie setups para fortalecer sinais de patch, arma e preset.',
                primaryAction: {
                    label: 'Explorar comunidade',
                    href: '/community',
                },
            },
        });
        expect(JSON.stringify(posts).toLowerCase()).not.toContain('erro');
        expect(JSON.stringify(creators).toLowerCase()).not.toContain('erro');
    });
});
