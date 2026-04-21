import { describe, expect, it } from 'vitest';

import {
    buildPublicCommunityProfileViewModel,
    type BuildPublicCommunityProfileViewModelInput,
    type CommunityPublicProfileSourcePost,
    type CommunityPublicProfileSourceProfile,
} from './community-public-profile-view-model';

type PublicProfileFallbackBuildInput = BuildPublicCommunityProfileViewModelInput & {
    readonly user?: {
        readonly name: string | null;
        readonly image: string | null;
    } | null;
    readonly playerProfile?: {
        readonly bio: string | null;
        readonly twitter: string | null;
        readonly twitch: string | null;
        readonly mouseModel?: string | null;
        readonly mouseSensor?: string | null;
        readonly mouseDpi?: number | null;
        readonly mousePollingRate?: number | null;
        readonly mousepadModel?: string | null;
        readonly mousepadType?: string | null;
        readonly gripStyle?: string | null;
        readonly playStyle?: string | null;
        readonly generalSens?: number | null;
        readonly adsSens?: number | null;
        readonly verticalMultiplier?: number | null;
        readonly fov?: number | null;
        readonly mouseWeight?: number | null;
        readonly mouseLod?: number | null;
        readonly monitorResolution?: string | null;
        readonly monitorRefreshRate?: number | null;
        readonly monitorPanel?: string | null;
        readonly scopeSens?: Record<string, number> | null;
        readonly armLength?: string | null;
        readonly deskSpace?: number | null;
    } | null;
};

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

function createViewModelInput(
    overrides: {
        readonly profile?: Partial<CommunityPublicProfileSourceProfile>;
        readonly user?: PublicProfileFallbackBuildInput['user'];
        readonly playerProfile?: PublicProfileFallbackBuildInput['playerProfile'];
    } = {},
): PublicProfileFallbackBuildInput {
    return {
        profile: {
            ...publicProfile,
            ...overrides.profile,
        },
        user: overrides.user ?? null,
        playerProfile: overrides.playerProfile ?? null,
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
    };
}

describe('buildPublicCommunityProfileViewModel', () => {
    it('falls back to player profile bio and auth user avatar when community identity fields are empty', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            profile: {
                bio: null,
                avatarUrl: null,
            },
            user: {
                name: 'Spray Doctor Auth',
                image: 'https://cdn.example.com/avatars/spray-doctor-auth.jpg',
            },
            playerProfile: {
                bio: 'Meu Perfil bio with real setup context.',
                twitter: null,
                twitch: null,
            },
        }));

        expect(viewModel.identity.bio).toBe('Meu Perfil bio with real setup context.');
        expect(viewModel.identity.avatarUrl).toBe('https://cdn.example.com/avatars/spray-doctor-auth.jpg');
    });

    it('keeps community profile bio and avatar above player profile fallbacks', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            profile: {
                bio: 'Community profile bio wins.',
                avatarUrl: 'https://cdn.example.com/community/spray-doctor.jpg',
            },
            user: {
                name: 'Spray Doctor Auth',
                image: 'https://cdn.example.com/avatars/spray-doctor-auth.jpg',
            },
            playerProfile: {
                bio: 'Meu Perfil bio should stay behind community copy.',
                twitter: null,
                twitch: null,
            },
        }));

        expect(viewModel.identity.bio).toBe('Community profile bio wins.');
        expect(viewModel.identity.avatarUrl).toBe('https://cdn.example.com/community/spray-doctor.jpg');
    });

    it('normalizes community and player profile social links with duplicates removed', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            profile: {
                links: [
                    {
                        label: 'X community',
                        url: 'https://x.com/spraydoctor',
                    },
                    {
                        label: 'Loadout lab',
                        url: 'https://example.com/loadout',
                    },
                    {
                        label: 'Unsafe legacy link',
                        url: 'javascript:alert(1)',
                    },
                ],
            },
            playerProfile: {
                bio: null,
                twitter: 'https://x.com/spraydoctor',
                twitch: 'https://twitch.tv/spraydoctor',
            },
        }));
        const linkUrls = viewModel.links.map((link) => link.url);

        expect(linkUrls).toEqual([
            'https://x.com/spraydoctor',
            'https://example.com/loadout',
            'https://twitch.tv/spraydoctor',
        ]);
        expect(linkUrls.filter((url) => url === 'https://x.com/spraydoctor')).toHaveLength(1);
        expect(viewModel.links).toEqual([
            {
                label: 'X community',
                url: 'https://x.com/spraydoctor',
                target: '_blank',
                rel: 'noreferrer',
            },
            {
                label: 'Loadout lab',
                url: 'https://example.com/loadout',
                target: '_blank',
                rel: 'noreferrer',
            },
            {
                label: 'Twitch',
                url: 'https://twitch.tv/spraydoctor',
                target: '_blank',
                rel: 'noreferrer',
            },
        ]);
    });

    it('exposes public setup grouped by aim setup, surface/grip and PUBG core allowlists', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            playerProfile: {
                bio: null,
                twitter: null,
                twitch: null,
                mouseModel: 'Logitech G Pro X Superlight 2',
                mouseSensor: 'Hero 2',
                mouseDpi: 800,
                mousePollingRate: 2000,
                mousepadModel: 'Artisan Zero XSoft',
                mousepadType: 'control',
                gripStyle: 'claw',
                playStyle: 'arm',
                generalSens: 41.5,
                adsSens: 36,
                verticalMultiplier: 1.05,
                fov: 95,
            },
        }));

        expect(viewModel).toMatchObject({
            publicSetup: {
                aimSetup: {
                    mouseModel: 'Logitech G Pro X Superlight 2',
                    mouseSensor: 'Hero 2',
                    mouseDpi: 800,
                    mousePollingRate: 2000,
                },
                surfaceGrip: {
                    mousepadModel: 'Artisan Zero XSoft',
                    mousepadType: 'control',
                    gripStyle: 'claw',
                    playStyle: 'arm',
                },
                pubgCore: {
                    generalSens: 41.5,
                    adsSens: 36,
                    verticalMultiplier: 1.05,
                    fov: 95,
                },
            },
        });
    });

    it('keeps non-allowlisted player profile setup fields out of the public view model', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            playerProfile: {
                bio: 'Public setup owner bio.',
                twitter: null,
                twitch: null,
                mouseModel: 'Razer Viper V3 Pro',
                mouseSensor: 'Focus Pro',
                mouseDpi: 400,
                mousePollingRate: 1000,
                mousepadModel: 'Zowie G-SR-SE',
                mousepadType: 'control',
                gripStyle: 'hybrid',
                playStyle: 'wrist',
                generalSens: 47,
                adsSens: 43,
                verticalMultiplier: 1.1,
                fov: 90,
                mouseWeight: 54,
                mouseLod: 1.2,
                monitorResolution: 'private-2560x1440-monitor',
                monitorRefreshRate: 240,
                monitorPanel: 'private-oled-panel',
                scopeSens: {
                    private8xScope: 31,
                },
                armLength: 'private-arm-length',
                deskSpace: 120,
            },
        }));
        const serializedViewModel = JSON.stringify(viewModel);

        expect(serializedViewModel).toContain('Razer Viper V3 Pro');
        expect(serializedViewModel).toContain('Zowie G-SR-SE');
        expect(serializedViewModel).not.toContain('private-2560x1440-monitor');
        expect(serializedViewModel).not.toContain('private-oled-panel');
        expect(serializedViewModel).not.toContain('private8xScope');
        expect(serializedViewModel).not.toContain('private-arm-length');
        expect(serializedViewModel).not.toContain('mouseWeight');
        expect(serializedViewModel).not.toContain('mouseLod');
        expect(serializedViewModel).not.toContain('deskSpace');
    });

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
                label: 'Ver post',
                href: '/community/beryl-spray-lab',
            },
        });
        expect(JSON.stringify(viewModel)).not.toContain('private-draft');
        expect(JSON.stringify(viewModel)).not.toContain('unlisted-lab');
        expect(JSON.stringify(viewModel)).not.toContain('followers-only-lab');
        expect(JSON.stringify(viewModel)).not.toContain('missing-published-at');
    });

    it('builds related discovery links from public profile post tags only', () => {
        const viewModel = buildPublicCommunityProfileViewModel({
            profile: publicProfile,
            posts: [
                createSourcePost({
                    id: 'post-public-latest',
                    slug: 'beryl-spray-lab',
                    publishedAt: new Date('2026-04-19T12:00:00.000Z'),
                }),
                createSourcePost({
                    id: 'post-public-older',
                    slug: 'beryl-spray-review',
                    publishedAt: new Date('2026-04-18T12:00:00.000Z'),
                }),
                createSourcePost({
                    id: 'post-private-noise',
                    slug: 'private-noise',
                    visibility: 'unlisted',
                    primaryWeaponId: 'secret-weapon',
                    primaryPatchVersion: 'private-patch',
                    primaryDiagnosisKey: 'private_diagnosis',
                }),
                createSourcePost({
                    id: 'post-draft-noise',
                    slug: 'draft-noise',
                    status: 'draft',
                    publishedAt: null,
                    primaryWeaponId: 'draft-weapon',
                    primaryPatchVersion: 'draft-patch',
                    primaryDiagnosisKey: 'draft_diagnosis',
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

        expect(viewModel.relatedLinks).toEqual([
            {
                key: 'weapon:beryl-m762',
                label: 'Beryl M762',
                href: '/community?weaponId=beryl-m762',
                description: '2 posts desta arma neste perfil.',
                postCount: 2,
            },
            {
                key: 'diagnosis:horizontal_drift',
                label: 'Horizontal Drift',
                href: '/community?diagnosisKey=horizontal_drift',
                description: '2 posts deste diagnostico neste perfil.',
                postCount: 2,
            },
            {
                key: 'patch:36.1',
                label: 'Patch 36.1',
                href: '/community?patchVersion=36.1',
                description: '2 posts deste patch neste perfil.',
                postCount: 2,
            },
        ]);
        expect(JSON.stringify(viewModel.relatedLinks)).not.toContain('secret-weapon');
        expect(JSON.stringify(viewModel.relatedLinks)).not.toContain('draft-weapon');
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
            actionLabel: 'Seu perfil',
            disabledReason: 'Este e o seu perfil.',
        });
    });

    it('derives factual profile trust signals from public creator, setup and engagement facts', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput({
            playerProfile: {
                bio: 'Public setup owner bio.',
                twitter: 'https://x.com/spraydoctor',
                twitch: null,
                mouseModel: 'Razer Viper V3 Pro',
                mouseSensor: 'Focus Pro',
                mouseDpi: 400,
                mousePollingRate: 1000,
                mousepadModel: 'Zowie G-SR-SE',
                mousepadType: 'control',
                gripStyle: 'hybrid',
                playStyle: 'wrist',
                generalSens: 47,
                adsSens: 43,
                verticalMultiplier: 1.1,
                fov: 90,
            },
        }));

        expect(viewModel.trustSignals).toEqual([
            {
                key: 'creator-approved',
                label: 'Creator aprovado',
                reason: 'Status publico aprovado no programa de creators.',
                count: null,
            },
            {
                key: 'setup-public',
                label: 'Setup publico',
                reason: '12 campos publicos de setup liberados no perfil.',
                count: 12,
            },
            {
                key: 'copied-preset',
                label: 'Presets copiados',
                reason: '5 presets copiados por leitores publicos.',
                count: 5,
            },
            {
                key: 'saved-drill',
                label: 'Drills salvos',
                reason: '2 drills salvos por leitores publicos.',
                count: 2,
            },
        ]);
        expect(JSON.stringify(viewModel.trustSignals).toLowerCase()).not.toMatch(/pro player|verified skill|best|melhor|rank|skill/);
    });

    it('uses neutral public recognition defaults when no reward, streak or squad identity is supplied', () => {
        const viewModel = buildPublicCommunityProfileViewModel(createViewModelInput());

        expect(viewModel.publicRewards).toEqual([]);
        expect(viewModel.streak).toEqual({
            currentStreak: 0,
            longestStreak: 0,
            streakState: 'inactive',
            title: 'Sequencia ainda nao comecou',
            summary: 'Ainda nao ha participacoes publicas suficientes para mostrar uma sequencia visivel.',
        });
        expect(viewModel.squadIdentity).toBeNull();
    });

    it('passes through public-safe rewards, streak summary and squad identity for profile recognition surfaces', () => {
        const viewModel = buildPublicCommunityProfileViewModel({
            ...createViewModelInput(),
            publicRewards: [
                {
                    id: 'reward-season-36-pioneer',
                    rewardKind: 'season_mark',
                    label: 'Season 36 Pioneer',
                    shortLabel: 'S36 Pioneer',
                    description: 'Reconhecimento factual por contribuicoes publicas na temporada.',
                    factualContext: 'Liberado por contribuicoes publicas elegiveis na janela da Season 36.',
                    iconKey: 'season-mark',
                    displayState: 'visible',
                    isEquipped: true,
                    earnedAt: new Date('2026-04-18T10:00:00.000Z'),
                },
            ],
            streakSummary: {
                currentStreak: 3,
                longestStreak: 5,
                streakState: 'active',
                title: '3 semana(s) seguidas',
                summary: 'Maior sequencia: 5. Esse jogador segue em ritmo ativo nesta janela.',
            },
            squadIdentity: {
                id: 'squad-spray-lab',
                name: 'Spray Lab',
                slug: 'spray-lab',
                description: 'Squad publico focado em reviews de recoil e rotinas semanais.',
            },
        });

        expect(viewModel.publicRewards).toEqual([
            {
                id: 'reward-season-36-pioneer',
                rewardKind: 'season_mark',
                label: 'Season 36 Pioneer',
                shortLabel: 'S36 Pioneer',
                description: 'Reconhecimento factual por contribuicoes publicas na temporada.',
                factualContext: 'Liberado por contribuicoes publicas elegiveis na janela da Season 36.',
                iconKey: 'season-mark',
                displayState: 'visible',
                isEquipped: true,
                earnedAt: new Date('2026-04-18T10:00:00.000Z'),
            },
        ]);
        expect(viewModel.streak).toEqual({
            currentStreak: 3,
            longestStreak: 5,
            streakState: 'active',
            title: '3 semana(s) seguidas',
            summary: 'Maior sequencia: 5. Esse jogador segue em ritmo ativo nesta janela.',
        });
        expect(viewModel.squadIdentity).toEqual({
            id: 'squad-spray-lab',
            name: 'Spray Lab',
            slug: 'spray-lab',
            description: 'Squad publico focado em reviews de recoil e rotinas semanais.',
        });
    });
});
