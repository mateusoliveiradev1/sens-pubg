import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testGlobal = globalThis as typeof globalThis & {
    React?: typeof React;
};

testGlobal.React = React;

const NOT_FOUND_ERROR = new Error('NEXT_NOT_FOUND');

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    getPublicCommunityProfileViewModel: vi.fn(),
    notFound: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/core/community-public-profile-view-model', () => ({
    getPublicCommunityProfileViewModel: mocks.getPublicCommunityProfileViewModel,
}));

vi.mock('@/ui/components/header', () => ({
    Header: () => React.createElement('div', null, 'Header'),
}));

vi.mock('next/navigation', () => ({
    notFound: mocks.notFound,
}));

vi.mock('../../community-avatar', () => ({
    CommunityAvatar: ({
        displayName,
        fallbackInitials,
    }: {
        readonly displayName: string;
        readonly fallbackInitials: string;
    }) => React.createElement(
        'span',
        {
            'data-avatar': displayName,
        },
        fallbackInitials,
    ),
}));

vi.mock('../../report-button', () => ({
    ReportButton: ({
        entityId,
        disabledHref,
    }: {
        readonly entityId: string;
        readonly disabledHref?: string;
    }) => React.createElement(
        'a',
        {
            'data-report-button': entityId,
            href: disabledHref ?? '#report',
        },
        'Reportar',
    ),
}));

vi.mock('./follow-button', () => ({
    FollowButton: ({ slug }: { readonly slug: string }) => React.createElement(
        'button',
        {
            'data-follow-button': slug,
            type: 'button',
        },
        `follow:${slug}`,
    ),
}));

vi.mock('./profile-share-button', () => ({
    ProfileShareButton: ({
        canonicalUrl,
    }: {
        readonly canonicalUrl: string;
    }) => React.createElement(
        'button',
        {
            'data-share-url': canonicalUrl,
            type: 'button',
        },
        'Compartilhar perfil',
    ),
}));

function createPublicProfileViewModel(overrides: {
    readonly identity?: Record<string, unknown>;
    readonly links?: readonly {
        readonly label: string;
        readonly url: string;
        readonly target: '_blank';
        readonly rel: 'noreferrer';
    }[];
    readonly publicSetup?: Record<string, unknown> | null;
    readonly relatedLinks?: readonly {
        readonly key: string;
        readonly label: string;
        readonly href: string;
        readonly description: string;
        readonly postCount: number;
    }[];
    readonly trustSignals?: readonly {
        readonly key: string;
        readonly label: string;
        readonly reason: string;
        readonly count: number | null;
    }[];
    readonly publicRewards?: readonly {
        readonly id: string;
        readonly rewardKind: string;
        readonly label: string;
        readonly shortLabel: string | null;
        readonly description: string | null;
        readonly factualContext: string;
        readonly iconKey: string | null;
        readonly displayState: string;
        readonly isEquipped: boolean;
        readonly earnedAt: Date;
    }[];
    readonly streak?: {
        readonly currentStreak: number;
        readonly longestStreak: number;
        readonly streakState: string;
        readonly title: string;
        readonly summary: string;
    };
    readonly squadIdentity?: {
        readonly id: string;
        readonly name: string;
        readonly slug: string;
        readonly description: string | null;
    } | null;
    readonly posts?: readonly unknown[];
    readonly emptyState?: unknown;
    readonly follow?: Record<string, unknown>;
} = {}) {
    return {
        identity: {
            profileId: 'profile-spray-doctor',
            slug: 'spray-doctor',
            displayName: 'Spray Doctor',
            headline: null,
            bio: 'Meu Perfil bio with real setup context.',
            avatarUrl: null,
            fallbackInitials: 'SD',
            creatorProgramStatus: 'approved',
            creatorBadge: {
                label: 'Creator aprovado',
                status: 'approved',
            },
            profileHref: '/community/users/spray-doctor',
            canonicalPath: '/community/users/spray-doctor',
            ...overrides.identity,
        },
        links: overrides.links ?? [
            {
                label: 'X',
                url: 'https://x.com/spraydoctor',
                target: '_blank' as const,
                rel: 'noreferrer' as const,
            },
            {
                label: 'Twitch',
                url: 'https://twitch.tv/spraydoctor',
                target: '_blank' as const,
                rel: 'noreferrer' as const,
            },
        ],
        metrics: {
            followerCount: 9,
            publicPostCount: 0,
            likeCount: 0,
            commentCount: 0,
            copyCount: 0,
            saveCount: 0,
        },
        trustSignals: overrides.trustSignals ?? [
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
        ],
        publicRewards: overrides.publicRewards ?? [
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
        streak: overrides.streak ?? {
            currentStreak: 3,
            longestStreak: 5,
            streakState: 'active',
            title: '3 semana(s) seguidas',
            summary: 'Maior sequencia: 5. Esse jogador segue em ritmo ativo nesta janela.',
        },
        squadIdentity: Object.prototype.hasOwnProperty.call(overrides, 'squadIdentity')
            ? overrides.squadIdentity
            : {
                id: 'squad-spray-lab',
                name: 'Spray Lab',
                slug: 'spray-lab',
                description: 'Squad publico focado em reviews de recoil e rotinas semanais.',
            },
        follow: {
            followerCount: 9,
            viewerIsFollowing: false,
            canFollow: false,
            isSelfProfile: false,
            actionLabel: 'Entrar para seguir',
            disabledReason: 'Entre para seguir este jogador.',
            ...overrides.follow,
        },
        relatedLinks: overrides.relatedLinks ?? [],
        posts: overrides.posts ?? [],
        emptyState: overrides.emptyState ?? null,
        publicSetup: Object.prototype.hasOwnProperty.call(overrides, 'publicSetup') ? overrides.publicSetup : {
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
    };
}

async function loadPageModule() {
    return import('./page');
}

async function renderPage(slug: string) {
    const { default: CommunityUserProfilePage } = await loadPageModule();
    const element = await CommunityUserProfilePage({
        params: Promise.resolve({ slug }),
    });

    return renderToStaticMarkup(element);
}

describe('/community/users/[slug] page contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue(null);
        mocks.getPublicCommunityProfileViewModel.mockResolvedValue(createPublicProfileViewModel());
        mocks.notFound.mockImplementation(() => {
            throw NOT_FOUND_ERROR;
        });
    });

    it('uses the public profile view model and keeps profile navigation shareable', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/getPublicCommunityProfileViewModel/);
        expect(source).toMatch(/canonicalPath|profileHref|\/community\/users\//);
        expect(source).toMatch(/href=\{?['"`]\/community['"`]\}?|href=["']\/community["']/);
        expect(source).toMatch(/ReportButton/);
        expect(source).toMatch(/FollowButton/);
    });

    it('renders factual trust signals with accessible text and stable layout markers', async () => {
        const markup = await renderPage('spray-doctor');
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(markup).toContain('Sinais publicos explicaveis do perfil');
        expect(markup).toContain('Creator aprovado');
        expect(markup).toContain('Status publico aprovado no programa de creators.');
        expect(markup).toContain('Setup publico');
        expect(markup).toContain('12 campos publicos de setup liberados no perfil.');
        expect(source).toMatch(/data-community-section=["']profile-trust-rail["']/);
        expect(source).toMatch(/data-community-layout=["']stable-trust-rail["']/);
        expect(source).toMatch(/data-community-layout=["']stable-metric-plate["']/);
    });

    it('keeps recent public work and proof surfaces near the top of the profile experience', async () => {
        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(createPublicProfileViewModel({
            posts: [
                {
                    id: 'post-beryl-lab',
                    slug: 'beryl-spray-lab',
                    href: '/community/beryl-spray-lab',
                    title: 'Beryl spray lab',
                    excerpt: 'Leitura publica mais recente para controlar recoil horizontal.',
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
                    ],
                    publishedAt: new Date('2026-04-19T12:00:00.000Z'),
                    publishedAtIso: '2026-04-19T12:00:00.000Z',
                    primaryAction: {
                        label: 'Ver post',
                        href: '/community/beryl-spray-lab',
                    },
                },
            ],
        }));

        const markup = await renderPage('spray-doctor');
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(markup).toContain('Trabalho recente');
        expect(markup).toContain('Beryl spray lab');
        expect(markup).toContain('Abrir post mais recente');
        expect(markup).toContain('Posts abertos');
        expect(markup).toContain('Saves + copias');
        expect(source).toMatch(/data-community-section=["']profile-spotlight["']/);
        expect(source).toMatch(/data-community-section=["']profile-recent-work["']/);
        expect(source).toMatch(/data-community-layout=["']profile-proof-grid["']/);
    });

    it('renders public-safe recognition surfaces for rewards, streaks and squad identity', async () => {
        const markup = await renderPage('spray-doctor');
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(markup).toContain('O que este perfil ja sustentou em publico');
        expect(markup).toContain('1 marca visivel');
        expect(markup).toContain('S36 Pioneer');
        expect(markup).toContain('Liberado por contribuicoes publicas elegiveis na janela da Season 36.');
        expect(markup).toContain('3 semana(s) seguidas');
        expect(markup).toContain('Spray Lab');
        expect(source).toMatch(/data-community-section=["']profile-reward-strip["']/);
        expect(source).toMatch(/data-community-section=["']profile-streak-summary["']/);
        expect(source).toMatch(/data-community-section=["']profile-squad-identity["']/);
        expect(source).toMatch(/data-community-layout=["']stable-reward-rail["']/);
        expect(markup).not.toContain('rewardKind');
        expect(markup).not.toContain('isEquipped');
    });

    it('keeps profile reporting visible while preserving login and self-profile states', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/entityType=["']profile["']/);
        expect(source).toMatch(/disabledHref=\{viewerCanReport \? undefined : ['"]\/login['"]\}/);
        expect(source).toMatch(/Entre na sua conta para reportar este perfil/);
        expect(source).toMatch(/viewModel\.follow\.isSelfProfile/);
        expect(source).toMatch(/viewModel\.follow\.actionLabel/);
    });

    it('keeps no-post profile states connected back to community discovery', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Sem posts ainda|emptyState\.title/);
        expect(source).toMatch(/Explorar comunidade|Voltar para comunidade|emptyState\.primaryAction/);
        expect(source).toMatch(/\/community/);
    });

    it('renders public bio, public links and setup plates from Meu Perfil data', async () => {
        const markup = await renderPage('spray-doctor');

        expect(mocks.getPublicCommunityProfileViewModel).toHaveBeenCalledWith({
            slug: 'spray-doctor',
            viewerUserId: null,
        });
        expect(markup).toContain('Meu Perfil bio with real setup context.');
        expect(markup).not.toContain('Acompanhe os posts publicos deste operador');
        expect(markup).toContain('href="https://x.com/spraydoctor"');
        expect(markup).toContain('href="https://twitch.tv/spraydoctor"');
        expect(markup).toContain('Mouse e sensor');
        expect(markup).toContain('Mousepad e grip');
        expect(markup).toContain('Sens do PUBG');
        expect(markup).toContain('Logitech G Pro X Superlight 2');
        expect(markup).toContain('Hero 2');
        expect(markup).toContain('800');
        expect(markup).toContain('2000');
        expect(markup).toContain('Artisan Zero XSoft');
        expect(markup).toContain('control');
        expect(markup).toContain('claw');
        expect(markup).toContain('arm');
        expect(markup).toContain('41.5');
        expect(markup).toContain('36');
        expect(markup).toContain('1.05');
        expect(markup).toContain('95');
    });

    it('renders neutral zero states when no public-safe reward or squad data exists', async () => {
        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(createPublicProfileViewModel({
            publicRewards: [],
            streak: {
                currentStreak: 0,
                longestStreak: 0,
                streakState: 'inactive',
                title: 'Sequencia ainda nao comecou',
                summary: 'Ainda nao ha participacoes publicas suficientes para mostrar uma sequencia visivel.',
            },
            squadIdentity: null,
        }));

        const markup = await renderPage('spray-doctor');

        expect(markup).toContain('Ainda nao existe reward publico liberado para este perfil.');
        expect(markup).toContain('Sequencia ainda nao comecou');
        expect(markup).toContain('Sem identidade coletiva aberta');
        expect(markup).not.toContain('privateReward');
    });

    it('uses composed headline or bio for public profile metadata', async () => {
        const { generateMetadata } = await loadPageModule();

        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(createPublicProfileViewModel({
            identity: {
                headline: null,
                bio: 'Bio publica real usada em cards de compartilhamento.',
            },
        }));

        const metadata = await generateMetadata({
            params: Promise.resolve({ slug: 'spray-doctor' }),
        });

        expect(metadata.description).toBe('Bio publica real usada em cards de compartilhamento.');
        expect(metadata.openGraph?.description).toBe('Bio publica real usada em cards de compartilhamento.');
        expect(metadata.twitter?.description).toBe('Bio publica real usada em cards de compartilhamento.');
    });

    it('renders an owner completion action when no public setup exists', async () => {
        mocks.auth.mockResolvedValueOnce({
            user: {
                id: 'owner-user',
            },
        });
        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(createPublicProfileViewModel({
            publicSetup: null,
            follow: {
                isSelfProfile: true,
                canFollow: false,
                actionLabel: 'Seu perfil',
                disabledReason: 'Este e o seu perfil.',
            },
        }));

        const markup = await renderPage('spray-doctor');

        expect(mocks.getPublicCommunityProfileViewModel).toHaveBeenCalledWith({
            slug: 'spray-doctor',
            viewerUserId: 'owner-user',
        });
        expect(markup).toContain('Mostre seu setup');
        expect(markup).toContain('href="/profile/settings"');
        expect(markup).toContain('Abrir meu perfil');
    });

    it('renders related public discovery links from profile tags without requiring raw database reads', async () => {
        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(createPublicProfileViewModel({
            relatedLinks: [
                {
                    key: 'weapon:beryl-m762',
                    label: 'Beryl M762',
                    href: '/community?weaponId=beryl-m762',
                    description: '2 snapshots desta arma no perfil publico.',
                    postCount: 2,
                },
                {
                    key: 'diagnosis:horizontal_drift',
                    label: 'Horizontal Drift',
                    href: '/community?diagnosisKey=horizontal_drift',
                    description: '2 snapshots deste diagnostico no perfil publico.',
                    postCount: 2,
                },
            ],
        }));

        const markup = await renderPage('spray-doctor');

        expect(markup).toContain('Caminhos relacionados');
        expect(markup).toContain('Beryl M762');
        expect(markup).toContain('/community?weaponId=beryl-m762');
        expect(markup).toContain('Horizontal Drift');
        expect(markup).toContain('/community?diagnosisKey=horizontal_drift');
        expect(markup).not.toContain('private-tag');
    });

    it('returns notFound when hidden profiles are rejected by the public view model', async () => {
        mocks.getPublicCommunityProfileViewModel.mockResolvedValueOnce(null);

        await expect(renderPage('hidden-operator')).rejects.toBe(NOT_FOUND_ERROR);
        expect(mocks.notFound).toHaveBeenCalledTimes(1);
        expect(mocks.getPublicCommunityProfileViewModel).toHaveBeenCalledWith({
            slug: 'hidden-operator',
            viewerUserId: null,
        });
    });

    it('keeps private posts, drafts and unpublished sessions outside the public profile route contract', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const viewModelSource = readFileSync(
            new URL('../../../../core/community-public-profile-view-model.ts', import.meta.url),
            'utf8',
        );

        expect(pageSource).toMatch(/getPublicCommunityProfileViewModel/);
        expect(pageSource).not.toMatch(/from ['"]@\/db['"]/);
        expect(viewModelSource).toMatch(/eq\(\s*communityProfiles\.visibility,\s*['"]public['"]\s*\)/);
        expect(viewModelSource).toMatch(/eq\(\s*communityPosts\.status,\s*['"]published['"]\s*\)/);
        expect(viewModelSource).toMatch(/eq\(\s*communityPosts\.visibility,\s*['"]public['"]\s*\)/);
        expect(viewModelSource).toMatch(/isNotNull\(\s*communityPosts\.publishedAt\s*\)/);
        expect(viewModelSource).not.toMatch(/\banalysisSessions\b/);
        expect(viewModelSource).not.toMatch(/sourceAnalysisSessionId|trajectoryData|fullResult/);
        expect(pageSource).not.toMatch(/communityProgressionEvents|communityRewardRecords|communitySquadMemberships/);
    });
});
