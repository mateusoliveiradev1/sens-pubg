import { describe, expect, it } from 'vitest';

import {
    buildPublicCommunityProfileViewModel,
    type CommunityPublicProfileSourcePost,
    type CommunityPublicProfileSourceProfile,
} from './community-public-profile-view-model';

const publicProfile: CommunityPublicProfileSourceProfile = {
    userId: 'user-spray-doctor',
    profileId: 'profile-spray-doctor',
    slug: 'spray-doctor',
    displayName: 'Spray Doctor',
    headline: 'Coach tecnico de recoil',
    bio: 'Analises publicas focadas em controle e consistencia.',
    avatarUrl: null,
    links: [
        {
            label: 'YouTube',
            url: 'https://youtube.com/@spraydoctor',
        },
    ],
    visibility: 'public',
    creatorProgramStatus: 'approved',
};

function createSourcePost(
    overrides: Partial<CommunityPublicProfileSourcePost> = {},
): CommunityPublicProfileSourcePost {
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
        ...overrides,
    };
}

describe('buildPublicCommunityProfileViewModel', () => {
    it('exposes only the approved public profile allowlist', () => {
        const profileWithPrivateData = {
            ...publicProfile,
            email: 'private@example.com',
            authProviderAccountId: 'discord-private-123',
            privateHardwareSettings: {
                dpi: 800,
                monitor: 'private-lab-monitor',
            },
            internalEntitlements: ['community.creator.analytics'],
        };

        const viewModel = buildPublicCommunityProfileViewModel({
            profile: profileWithPrivateData,
            posts: [createSourcePost()],
            creatorMetrics: {
                publicPostCount: 1,
                likeCount: 12,
                commentCount: 3,
                copyCount: 5,
                saveCount: 2,
            },
            followState: {
                followerCount: 9,
                viewerIsFollowing: false,
            },
            viewerUserId: null,
        });

        expect(viewModel.identity).toEqual({
            profileId: 'profile-spray-doctor',
            slug: 'spray-doctor',
            displayName: 'Spray Doctor',
            headline: 'Coach tecnico de recoil',
            bio: 'Analises publicas focadas em controle e consistencia.',
            avatarUrl: null,
            fallbackInitials: 'SD',
            creatorProgramStatus: 'approved',
            creatorBadge: {
                label: 'Creator aprovado',
                status: 'approved',
            },
            profileHref: '/community/users/spray-doctor',
            canonicalPath: '/community/users/spray-doctor',
        });
        expect(viewModel.links).toEqual([
            {
                label: 'YouTube',
                url: 'https://youtube.com/@spraydoctor',
                target: '_blank',
                rel: 'noreferrer',
            },
        ]);
        expect(JSON.stringify(viewModel)).not.toContain('private@example.com');
        expect(JSON.stringify(viewModel)).not.toContain('discord-private-123');
        expect(JSON.stringify(viewModel)).not.toContain('private-lab-monitor');
        expect(JSON.stringify(viewModel)).not.toContain('community.creator.analytics');
        expect(JSON.stringify(viewModel)).not.toContain('user-spray-doctor');
    });

    it('includes only published public posts with safe public post summaries', () => {
        const viewModel = buildPublicCommunityProfileViewModel({
            profile: publicProfile,
            posts: [
                createSourcePost({
                    id: 'post-public-latest',
                    slug: 'beryl-spray-lab',
                    publishedAt: new Date('2026-04-19T12:00:00.000Z'),
                }),
                createSourcePost({
                    id: 'post-draft',
                    slug: 'private-draft',
                    status: 'draft',
                    publishedAt: null,
                }),
                createSourcePost({
                    id: 'post-unlisted',
                    slug: 'unlisted-lab',
                    visibility: 'unlisted',
                }),
                createSourcePost({
                    id: 'post-followers-only',
                    slug: 'followers-only-lab',
                    visibility: 'followers_only',
                }),
                createSourcePost({
                    id: 'post-without-publish-date',
                    slug: 'missing-published-at',
                    publishedAt: null,
                }),
                createSourcePost({
                    id: 'post-public-older',
                    slug: 'ump-reset',
                    title: 'UMP reset',
                    primaryWeaponId: 'ump45',
                    primaryPatchVersion: '35.2',
                    primaryDiagnosisKey: 'overpull',
                    publishedAt: new Date('2026-04-18T16:00:00.000Z'),
                }),
            ],
            creatorMetrics: {
                publicPostCount: 2,
                likeCount: 12,
                commentCount: 3,
                copyCount: 5,
                saveCount: 2,
            },
            followState: {
                followerCount: 9,
                viewerIsFollowing: false,
            },
            viewerUserId: 'viewer-1',
        });

        expect(viewModel.posts.map((post) => post.id)).toEqual([
            'post-public-latest',
            'post-public-older',
        ]);
        expect(viewModel.posts[0]).toMatchObject({
            id: 'post-public-latest',
            slug: 'beryl-spray-lab',
            href: '/community/beryl-spray-lab',
            title: 'Beryl spray lab',
            excerpt: 'Patch 36.1 recoil snapshot for mid-range fights.',
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
            publishedAtIso: '2026-04-19T12:00:00.000Z',
            primaryAction: {
                label: 'Abrir analise',
                href: '/community/beryl-spray-lab',
            },
        });
        expect(JSON.stringify(viewModel)).not.toContain('private-draft');
        expect(JSON.stringify(viewModel)).not.toContain('unlisted-lab');
        expect(JSON.stringify(viewModel)).not.toContain('followers-only-lab');
        expect(JSON.stringify(viewModel)).not.toContain('missing-published-at');
    });

    it('combines creator metrics, follower count and self-profile state without offering self-follow', () => {
        const viewModel = buildPublicCommunityProfileViewModel({
            profile: publicProfile,
            posts: [createSourcePost()],
            creatorMetrics: {
                publicPostCount: 3,
                likeCount: 18,
                commentCount: 6,
                copyCount: 11,
                saveCount: 4,
            },
            followState: {
                followerCount: 42,
                viewerIsFollowing: true,
            },
            viewerUserId: 'user-spray-doctor',
        });

        expect(viewModel.metrics).toEqual({
            followerCount: 42,
            publicPostCount: 3,
            likeCount: 18,
            commentCount: 6,
            copyCount: 11,
            saveCount: 4,
        });
        expect(viewModel.follow).toEqual({
            followerCount: 42,
            viewerIsFollowing: false,
            canFollow: false,
            isSelfProfile: true,
            actionLabel: 'Seu perfil publico',
            disabledReason: 'Este e o seu perfil publico.',
        });
    });
});
