import { and, count, desc, eq, inArray, isNotNull, or } from 'drizzle-orm';

import {
    analysisSessions,
    communityFollows,
    communityMissions,
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPostSaves,
    communityPosts,
    communityProgressionEvents,
    communityProfiles,
    communityRewardRecords,
    communitySeasons,
    communitySquadMemberships,
    communitySquads,
} from '@/db/schema';
import type {
    CommunityCreatorProgramStatus,
    CommunityProfileVisibility,
} from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
    CommunityProgressionStreakState,
} from '@/types/community';
import {
    buildCommunityPersonalRecap,
    buildCommunityPrivateProgressionSummary,
    buildCommunitySquadRecap,
    resolveActiveCommunitySeason,
    resolveCommunityWeeklyChallenge,
    toCommunityProgressionHistoryEvent,
    type CommunityMissionProgressSnapshot,
    type CommunityProgressionHistoryEvent,
    type CommunityRewardRecordSource,
    type CommunitySeasonContext,
    type CommunitySeasonSource,
    type CommunityWeeklyChallengeResolution,
} from './community-progression';
import {
    buildCommunityAnalysisTags,
    buildCommunityFallbackInitials,
    formatCommunityCount,
    formatCommunityDiagnosisLabel,
    formatCommunityPatchLabel,
    formatCommunityWeaponLabel,
    toSafeCommunityCount,
} from './community-public-formatting';
import {
    buildCommunityCreatorHighlights,
    buildFeaturedCommunityPostHighlights,
    type CommunityCreatorHighlightsViewModel,
    type CommunityHighlightSourceCreator,
    type CommunityPostHighlightsViewModel,
} from './community-highlights';
import {
    buildCommunitySquadGoalProgressSnapshot,
} from './community-squads';

const COMMUNITY_DISCOVERY_QUERY_LIMIT = 50;
const COMMUNITY_FOLLOWING_FEED_LIMIT = 4;
const COMMUNITY_TREND_BOARD_LIMIT = 6;
const COMMUNITY_DISCOVERY_SEASON_LIMIT = 8;
const COMMUNITY_DISCOVERY_MISSION_LIMIT = 12;
const COMMUNITY_DISCOVERY_EVENT_LIMIT = 250;
const COMMUNITY_DISCOVERY_REWARD_LIMIT = 60;
const communityDiscoveryWindowDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
});

export interface CommunityDiscoveryFilters {
    readonly weaponId?: string;
    readonly patchVersion?: string;
    readonly diagnosisKey?: string;
}

export interface CommunityDiscoverySourceAuthor {
    readonly userId: string;
    readonly profileId: string;
    readonly profileSlug: string | null;
    readonly displayName: string | null;
    readonly avatarUrl: string | null;
    readonly visibility: CommunityProfileVisibility;
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
}

export interface CommunityDiscoverySourcePost {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly status: CommunityPostStatus;
    readonly visibility: CommunityPostVisibility;
    readonly publishedAt: Date | null;
    readonly featuredUntil?: Date | null;
    readonly primaryWeaponId: string | null;
    readonly primaryPatchVersion: string | null;
    readonly primaryDiagnosisKey: string | null;
    readonly author: CommunityDiscoverySourceAuthor | null;
    readonly engagement: {
        readonly likeCount: number;
        readonly commentCount: number;
        readonly copyCount: number;
        readonly saveCount: number;
    };
}

export type CommunityDiscoveryFilterKey = keyof CommunityDiscoveryFilters;

export interface CommunityDiscoveryFilterOption {
    readonly key: CommunityDiscoveryFilterKey;
    readonly value: string;
    readonly label: string;
    readonly href: string;
}

export interface CommunityDiscoveryEmptyState {
    readonly title: string;
    readonly body: string;
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
    readonly secondaryAction?: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityDiscoveryParticipationPrompt {
    readonly key: 'anonymous-reader' | 'publish-analysis' | 'complete-profile';
    readonly title: string;
    readonly body: string;
    readonly action: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityDiscoveryViewerContext {
    readonly viewerUserId: string | null;
    readonly hasPublicProfile: boolean;
    readonly publicProfileHref: string | null;
    readonly publishableAnalysisCount: number;
    readonly followedUserIds?: readonly string[];
}

export interface CommunityDiscoveryPostCard {
    readonly id: string;
    readonly slug: string;
    readonly href: string;
    readonly title: string;
    readonly excerpt: string;
    readonly author: {
        readonly displayName: string;
        readonly profileHref: string | null;
        readonly avatarUrl: string | null;
        readonly fallbackInitials: string;
        readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    };
    readonly analysisTags: readonly {
        readonly key: 'weapon' | 'patch' | 'diagnosis';
        readonly value: string;
        readonly label: string;
    }[];
    readonly engagement: {
        readonly likeCount: number;
        readonly commentCount: number;
        readonly copyCount: number;
        readonly saveCount: number;
    };
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
    readonly publishedAt: Date;
    readonly publishedAtIso: string;
}

export type CommunityDiscoveryTrendKind = 'weapon' | 'patch' | 'diagnosis';

export interface CommunityDiscoveryTrendItem {
    readonly key: string;
    readonly kind: CommunityDiscoveryTrendKind;
    readonly value: string;
    readonly label: string;
    readonly href: string;
    readonly postCount: number;
    readonly engagementCount: number;
    readonly reason: string;
}

export interface CommunityDiscoveryTrendBoard {
    readonly items: readonly CommunityDiscoveryTrendItem[];
    readonly emptyState: CommunityDiscoveryEmptyState | null;
}

export interface CommunityDiscoveryWeeklyDrillPrompt {
    readonly trendKey: string | null;
    readonly title: string;
    readonly body: string;
    readonly action: {
        readonly label: string;
        readonly href: string;
    };
    readonly secondaryAction: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityDiscoverySeasonContextCard {
    readonly title: string;
    readonly theme: string;
    readonly summary: string;
    readonly stateLabel: string;
    readonly windowLabel: string;
}

export interface CommunityDiscoveryWeeklyChallengeAction {
    readonly title: string;
    readonly description: string;
    readonly xpLabel: string;
    readonly href: string;
}

export interface CommunityDiscoveryWeeklyChallengeBoard {
    readonly source: 'mission' | 'trend' | 'fallback';
    readonly title: string;
    readonly description: string;
    readonly rationale: string;
    readonly theme: string;
    readonly windowLabel: string;
    readonly trendHref: string | null;
    readonly actions: readonly CommunityDiscoveryWeeklyChallengeAction[];
}

export interface CommunityDiscoveryViewerProgressSummary {
    readonly state: 'zero_state' | 'active';
    readonly title: string;
    readonly summary: string;
    readonly level: number;
    readonly totalXp: number;
    readonly currentLevelXp: number;
    readonly nextLevelXp: number;
    readonly xpToNextLevel: number;
    readonly progressRatio: number;
    readonly currentStreak: number;
    readonly streakState: CommunityProgressionStreakState;
    readonly nextAction: {
        readonly title: string;
        readonly description: string;
        readonly href: string;
    };
    readonly nextMilestone: {
        readonly title: string;
        readonly description: string;
    };
    readonly publicProfileHref: string | null;
}

export interface CommunityDiscoveryMissionBoardItem {
    readonly missionId: string;
    readonly title: string;
    readonly description: string;
    readonly progressLabel: string;
    readonly rewardLabel: string;
    readonly completionRatio: number;
    readonly state: 'zero_state' | 'in_progress' | 'complete';
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityDiscoveryMissionBoard {
    readonly title: string;
    readonly summary: string;
    readonly items: readonly CommunityDiscoveryMissionBoardItem[];
    readonly emptyState: CommunityDiscoveryEmptyState | null;
}

export interface CommunityDiscoveryRecapPanel {
    readonly state: 'zero_state' | 'recap' | 'reentry';
    readonly title: string;
    readonly summary: string;
    readonly ritualCount: number;
    readonly rewardCount: number;
    readonly earnedXp: number;
    readonly nextAction: {
        readonly title: string;
        readonly href: string;
    } | null;
}

export interface CommunityDiscoverySquadSpotlight {
    readonly title: string;
    readonly description: string;
    readonly visibilityLabel: string;
    readonly goalHeadline: string;
    readonly goalSummary: string;
    readonly progressLabel: string;
    readonly memberCount: number;
    readonly recapTitle: string;
    readonly recapSummary: string;
    readonly nextAction: {
        readonly title: string;
        readonly href: string;
    } | null;
}

export interface CommunityDiscoveryViewModel {
    readonly hubSummary: {
        readonly publicPostCount: number;
        readonly visiblePostCount: number;
    };
    readonly filters: {
        readonly selected: CommunityDiscoveryFilters;
        readonly hasActiveFilters: boolean;
        readonly activeFilters: readonly CommunityDiscoveryFilterOption[];
        readonly clearHref: string;
        readonly weaponOptions: readonly CommunityDiscoveryFilterOption[];
        readonly patchOptions: readonly CommunityDiscoveryFilterOption[];
        readonly diagnosisOptions: readonly CommunityDiscoveryFilterOption[];
    };
    readonly feed: {
        readonly summary: string;
        readonly cards: readonly CommunityDiscoveryPostCard[];
        readonly emptyState: CommunityDiscoveryEmptyState | null;
    };
    readonly followingFeed: {
        readonly summary: string;
        readonly cards: readonly CommunityDiscoveryPostCard[];
        readonly emptyState: CommunityDiscoveryEmptyState | null;
    };
    readonly trendBoard: CommunityDiscoveryTrendBoard;
    readonly weeklyDrillPrompt: CommunityDiscoveryWeeklyDrillPrompt;
    readonly seasonContext: CommunityDiscoverySeasonContextCard;
    readonly weeklyChallenge: CommunityDiscoveryWeeklyChallengeBoard;
    readonly viewerProgressionSummary: CommunityDiscoveryViewerProgressSummary | null;
    readonly missionBoard: CommunityDiscoveryMissionBoard | null;
    readonly personalRecap: CommunityDiscoveryRecapPanel | null;
    readonly squadSpotlight: CommunityDiscoverySquadSpotlight | null;
    readonly featuredPosts: CommunityPostHighlightsViewModel;
    readonly creatorHighlights: CommunityCreatorHighlightsViewModel;
    readonly participationPrompts: readonly CommunityDiscoveryParticipationPrompt[];
}

export interface BuildCommunityDiscoveryViewModelInput {
    readonly posts: readonly CommunityDiscoverySourcePost[];
    readonly filters?: CommunityDiscoveryFilters;
    readonly now?: Date;
    readonly creators?: readonly CommunityHighlightSourceCreator[];
    readonly viewer?: CommunityDiscoveryViewerContext;
    readonly trendBoard?: CommunityDiscoveryTrendBoard;
    readonly seasonContext?: CommunityDiscoverySeasonContextCard;
    readonly weeklyChallenge?: CommunityDiscoveryWeeklyChallengeBoard;
    readonly viewerProgressionSummary?: CommunityDiscoveryViewerProgressSummary | null;
    readonly missionBoard?: CommunityDiscoveryMissionBoard | null;
    readonly personalRecap?: CommunityDiscoveryRecapPanel | null;
    readonly squadSpotlight?: CommunityDiscoverySquadSpotlight | null;
}

export function buildCommunityDiscoveryViewModel(
    input: BuildCommunityDiscoveryViewModelInput,
): CommunityDiscoveryViewModel {
    const selectedFilters = normalizeDiscoveryFilters(input.filters ?? {});
    const publicPosts = input.posts
        .filter(isPublicDiscoveryPost)
        .sort(compareDiscoveryPostsByRecency);
    const visiblePosts = publicPosts.filter((post) =>
        matchesDiscoveryFilters(post, selectedFilters),
    );
    const now = input.now ?? new Date();
    const viewer = input.viewer ?? createAnonymousViewerContext();
    const followingPosts = buildFollowingFeedPosts(publicPosts, viewer);
    const trendBoard = input.trendBoard ?? buildCommunityTrendBoard({ posts: publicPosts });
    const seasonContext = input.seasonContext
        ?? toCommunityDiscoverySeasonContextCard(
            resolveActiveCommunitySeason({
                seasons: [],
                now,
            }),
        );
    const weeklyChallenge = input.weeklyChallenge
        ?? toCommunityDiscoveryWeeklyChallengeBoard(
            resolveCommunityWeeklyChallenge({
                seasonContext: resolveActiveCommunitySeason({
                    seasons: [],
                    now,
                }),
                trends: trendBoard.items,
                now,
            }),
            viewer.viewerUserId,
        );
    const viewerProgressionSummary = viewer.viewerUserId
        ? (input.viewerProgressionSummary ?? createZeroCommunityDiscoveryViewerProgressSummary(viewer))
        : null;
    const missionBoard = viewer.viewerUserId
        ? (input.missionBoard ?? createEmptyCommunityDiscoveryMissionBoard(viewer))
        : null;
    const personalRecap = viewer.viewerUserId
        ? (input.personalRecap ?? createZeroCommunityDiscoveryRecapPanel(viewer))
        : null;

    return {
        hubSummary: {
            publicPostCount: publicPosts.length,
            visiblePostCount: visiblePosts.length,
        },
        filters: {
            selected: selectedFilters,
            hasActiveFilters: hasActiveDiscoveryFilters(selectedFilters),
            activeFilters: buildActiveFilterOptions(selectedFilters),
            clearHref: '/community',
            weaponOptions: buildFilterOptions({
                posts: publicPosts,
                selectedValue: selectedFilters.weaponId,
                key: 'weaponId',
                selector: (post) => post.primaryWeaponId,
                formatter: formatCommunityWeaponLabel,
            }),
            patchOptions: buildFilterOptions({
                posts: publicPosts,
                selectedValue: selectedFilters.patchVersion,
                key: 'patchVersion',
                selector: (post) => post.primaryPatchVersion,
                formatter: formatCommunityPatchLabel,
            }),
            diagnosisOptions: buildFilterOptions({
                posts: publicPosts,
                selectedValue: selectedFilters.diagnosisKey,
                key: 'diagnosisKey',
                selector: (post) => post.primaryDiagnosisKey,
                formatter: formatCommunityDiagnosisLabel,
            }),
        },
        feed: {
            summary: buildFeedSummary(visiblePosts.length, selectedFilters),
            cards: visiblePosts.map(toDiscoveryPostCard),
            emptyState: buildFeedEmptyState(publicPosts.length, visiblePosts.length, selectedFilters),
        },
        followingFeed: {
            summary: buildFollowingFeedSummary(followingPosts.length, viewer),
            cards: followingPosts.slice(0, COMMUNITY_FOLLOWING_FEED_LIMIT).map(toDiscoveryPostCard),
            emptyState: buildFollowingFeedEmptyState(followingPosts.length, viewer),
        },
        trendBoard,
        weeklyDrillPrompt: buildWeeklyDrillPrompt(trendBoard),
        seasonContext,
        weeklyChallenge,
        viewerProgressionSummary,
        missionBoard,
        personalRecap,
        squadSpotlight: input.squadSpotlight ?? null,
        featuredPosts: buildFeaturedCommunityPostHighlights({
            now,
            posts: publicPosts.map((post) => ({
                id: post.id,
                slug: post.slug,
                title: post.title,
                excerpt: post.excerpt,
                status: post.status,
                visibility: post.visibility,
                publishedAt: post.publishedAt,
                featuredUntil: post.featuredUntil ?? null,
                primaryWeaponId: post.primaryWeaponId,
                primaryPatchVersion: post.primaryPatchVersion,
                primaryDiagnosisKey: post.primaryDiagnosisKey,
                engagement: post.engagement,
            })),
        }),
        creatorHighlights: buildCommunityCreatorHighlights({
            now,
            creators: input.creators ?? buildCreatorHighlightSources(publicPosts),
        }),
        participationPrompts: buildParticipationPrompts(viewer),
    };
}

export interface GetCommunityDiscoveryViewModelInput {
    readonly filters?: CommunityDiscoveryFilters;
    readonly viewerUserId?: string | null;
}

export async function getCommunityDiscoveryViewModel(
    input: GetCommunityDiscoveryViewModelInput = {},
): Promise<CommunityDiscoveryViewModel> {
    const { db } = await import('@/db');

    const rows = await db
        .select({
            id: communityPosts.id,
            slug: communityPosts.slug,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            status: communityPosts.status,
            visibility: communityPosts.visibility,
            publishedAt: communityPosts.publishedAt,
            featuredUntil: communityPosts.featuredUntil,
            primaryWeaponId: communityPosts.primaryWeaponId,
            primaryPatchVersion: communityPosts.primaryPatchVersion,
            primaryDiagnosisKey: communityPosts.primaryDiagnosisKey,
            authorUserId: communityProfiles.userId,
            authorProfileId: communityProfiles.id,
            authorProfileSlug: communityProfiles.slug,
            authorDisplayName: communityProfiles.displayName,
            authorAvatarUrl: communityProfiles.avatarUrl,
            authorVisibility: communityProfiles.visibility,
            authorCreatorProgramStatus: communityProfiles.creatorProgramStatus,
        })
        .from(communityPosts)
        .innerJoin(
            communityProfiles,
            eq(communityProfiles.id, communityPosts.communityProfileId),
        )
        .where(
            and(
                eq(communityPosts.status, 'published'),
                eq(communityPosts.visibility, 'public'),
                isNotNull(communityPosts.publishedAt),
                eq(communityProfiles.visibility, 'public'),
            ),
        )
        .orderBy(desc(communityPosts.publishedAt))
        .limit(COMMUNITY_DISCOVERY_QUERY_LIMIT);

    const [engagementByPostId, viewer] = await Promise.all([
        getEngagementCountsByPostId(rows.map((row) => row.id)),
        getCommunityDiscoveryViewerContext(input.viewerUserId ?? null),
    ]);
    const posts = rows.map((row): CommunityDiscoverySourcePost => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        status: row.status,
        visibility: row.visibility,
        publishedAt: row.publishedAt,
        featuredUntil: row.featuredUntil,
        primaryWeaponId: row.primaryWeaponId,
        primaryPatchVersion: row.primaryPatchVersion,
        primaryDiagnosisKey: row.primaryDiagnosisKey,
        author: {
            userId: row.authorUserId,
            profileId: row.authorProfileId,
            profileSlug: row.authorProfileSlug,
            displayName: row.authorDisplayName,
            avatarUrl: row.authorAvatarUrl,
            visibility: row.authorVisibility,
            creatorProgramStatus: row.authorCreatorProgramStatus,
        },
        engagement: engagementByPostId.get(row.id) ?? createEmptyEngagement(),
    }));
    const trendBoard = buildCommunityTrendBoard({ posts });
    const ritualContext = await getCommunityDiscoveryRitualContext({
        now: new Date(),
        trendBoard,
        viewer,
    });

    return buildCommunityDiscoveryViewModel({
        ...(input.filters ? { filters: input.filters } : {}),
        viewer,
        trendBoard,
        ...ritualContext,
        posts,
    });
}

function normalizeDiscoveryFilters(filters: CommunityDiscoveryFilters): CommunityDiscoveryFilters {
    const weaponId = normalizeOptionalFilter(filters.weaponId);
    const patchVersion = normalizeOptionalFilter(filters.patchVersion);
    const diagnosisKey = normalizeOptionalFilter(filters.diagnosisKey);

    return {
        ...(weaponId ? { weaponId } : {}),
        ...(patchVersion ? { patchVersion } : {}),
        ...(diagnosisKey ? { diagnosisKey } : {}),
    };
}

function normalizeOptionalFilter(value: string | undefined): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
}

function hasActiveDiscoveryFilters(filters: CommunityDiscoveryFilters): boolean {
    return Boolean(filters.weaponId || filters.patchVersion || filters.diagnosisKey);
}

function isPublicDiscoveryPost(post: CommunityDiscoverySourcePost): boolean {
    return post.status === 'published'
        && post.visibility === 'public'
        && post.publishedAt instanceof Date
        && (!post.author || post.author.visibility === 'public');
}

function compareDiscoveryPostsByRecency(
    left: CommunityDiscoverySourcePost,
    right: CommunityDiscoverySourcePost,
): number {
    return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
}

function matchesDiscoveryFilters(
    post: CommunityDiscoverySourcePost,
    filters: CommunityDiscoveryFilters,
): boolean {
    if (filters.weaponId && post.primaryWeaponId !== filters.weaponId) {
        return false;
    }

    if (filters.patchVersion && post.primaryPatchVersion !== filters.patchVersion) {
        return false;
    }

    if (filters.diagnosisKey && post.primaryDiagnosisKey !== filters.diagnosisKey) {
        return false;
    }

    return true;
}

function createFilterHref(key: CommunityDiscoveryFilterKey, value: string): string {
    return `/community?${new URLSearchParams({ [key]: value }).toString()}`;
}

function buildActiveFilterOptions(
    filters: CommunityDiscoveryFilters,
): readonly CommunityDiscoveryFilterOption[] {
    const activeFilters: CommunityDiscoveryFilterOption[] = [];

    if (filters.weaponId) {
        activeFilters.push({
            key: 'weaponId',
            value: filters.weaponId,
            label: formatCommunityWeaponLabel(filters.weaponId),
            href: createFilterHref('weaponId', filters.weaponId),
        });
    }

    if (filters.patchVersion) {
        activeFilters.push({
            key: 'patchVersion',
            value: filters.patchVersion,
            label: formatCommunityPatchLabel(filters.patchVersion),
            href: createFilterHref('patchVersion', filters.patchVersion),
        });
    }

    if (filters.diagnosisKey) {
        activeFilters.push({
            key: 'diagnosisKey',
            value: filters.diagnosisKey,
            label: formatCommunityDiagnosisLabel(filters.diagnosisKey),
            href: createFilterHref('diagnosisKey', filters.diagnosisKey),
        });
    }

    return activeFilters;
}

function buildFilterOptions(input: {
    readonly posts: readonly CommunityDiscoverySourcePost[];
    readonly selectedValue: string | undefined;
    readonly key: CommunityDiscoveryFilterKey;
    readonly selector: (post: CommunityDiscoverySourcePost) => string | null;
    readonly formatter: (value: string) => string;
}): readonly CommunityDiscoveryFilterOption[] {
    const options = new Map<string, CommunityDiscoveryFilterOption>();

    for (const post of input.posts) {
        const value = input.selector(post);

        if (!value || options.has(value)) {
            continue;
        }

        options.set(value, {
            key: input.key,
            value,
            label: input.formatter(value),
            href: createFilterHref(input.key, value),
        });
    }

    if (input.selectedValue && !options.has(input.selectedValue)) {
        options.set(input.selectedValue, {
            key: input.key,
            value: input.selectedValue,
            label: input.formatter(input.selectedValue),
            href: createFilterHref(input.key, input.selectedValue),
        });
    }

    return [...options.values()].sort((left, right) =>
        left.label.localeCompare(right.label, 'pt-BR'),
    );
}

function buildFeedSummary(
    visiblePostCount: number,
    filters: CommunityDiscoveryFilters,
): string {
    if (visiblePostCount === 0 && hasActiveDiscoveryFilters(filters)) {
        return 'Nenhuma publicacao corresponde aos filtros atuais.';
    }

    if (visiblePostCount === 0) {
        return 'Ainda nao existem publicacoes publicas para exibir.';
    }

    if (visiblePostCount === 1) {
        return '1 publicacao publica encontrada.';
    }

    return `${visiblePostCount} publicacoes publicas encontradas.`;
}

function buildFeedEmptyState(
    publicPostCount: number,
    visiblePostCount: number,
    filters: CommunityDiscoveryFilters,
): CommunityDiscoveryEmptyState | null {
    if (visiblePostCount > 0) {
        return null;
    }

    if (publicPostCount === 0) {
        return {
            title: 'Nenhuma analise publica ainda',
            body: 'Publique um snapshot de recoil para abrir o primeiro sinal da comunidade.',
            primaryAction: {
                label: 'Publicar analise',
                href: '/history',
            },
            secondaryAction: {
                label: 'Analisar recoil',
                href: '/analyze',
            },
        };
    }

    if (hasActiveDiscoveryFilters(filters)) {
        return {
            title: 'Nenhum setup nesse filtro',
            body: 'Limpe os filtros ou publique uma analise com esse contexto de arma, patch e diagnostico.',
            primaryAction: {
                label: 'Limpar filtros',
                href: '/community',
            },
            secondaryAction: {
                label: 'Explorar todos',
                href: '/community',
            },
        };
    }

    return null;
}

function buildFollowingFeedPosts(
    publicPosts: readonly CommunityDiscoverySourcePost[],
    viewer: CommunityDiscoveryViewerContext,
): readonly CommunityDiscoverySourcePost[] {
    if (!viewer.viewerUserId) {
        return [];
    }

    const followedUserIds = new Set(
        (viewer.followedUserIds ?? [])
            .map((userId) => userId.trim())
            .filter(Boolean),
    );

    if (followedUserIds.size === 0) {
        return [];
    }

    return publicPosts.filter((post) =>
        post.author?.userId ? followedUserIds.has(post.author.userId) : false,
    );
}

function buildFollowingFeedSummary(
    followingPostCount: number,
    viewer: CommunityDiscoveryViewerContext,
): string {
    if (!viewer.viewerUserId) {
        return 'Entre para acompanhar os creators que voce seguir.';
    }

    if ((viewer.followedUserIds ?? []).length === 0) {
        return 'Siga creators para montar um feed tecnico.';
    }

    if (followingPostCount === 0) {
        return 'Perfis seguidos ainda sem snapshots publicos recentes.';
    }

    if (followingPostCount === 1) {
        return '1 snapshot publico de perfis seguidos.';
    }

    return `${followingPostCount} snapshots publicos de perfis seguidos.`;
}

function buildFollowingFeedEmptyState(
    followingPostCount: number,
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryEmptyState | null {
    if (followingPostCount > 0) {
        return null;
    }

    if (!viewer.viewerUserId) {
        return {
            title: 'Entre para montar seu feed seguindo',
            body: 'O feed seguindo mostra apenas posts publicos dos creators que voce acompanha.',
            primaryAction: {
                label: 'Entrar',
                href: '/login',
            },
            secondaryAction: {
                label: 'Ver creators',
                href: '/community#creator-plates',
            },
        };
    }

    if ((viewer.followedUserIds ?? []).length === 0) {
        return {
            title: 'Voce ainda nao segue creators',
            body: 'Abra creator plates e siga operadores para preencher este feed com snapshots publicos.',
            primaryAction: {
                label: 'Descobrir creators',
                href: '/community#creator-plates',
            },
            secondaryAction: {
                label: 'Explorar todos',
                href: '/community',
            },
        };
    }

    return {
        title: 'Sem posts publicos dos perfis seguidos',
        body: 'Os creators que voce segue ainda nao publicaram snapshots publicos recentes.',
        primaryAction: {
            label: 'Explorar comunidade',
            href: '/community',
        },
        secondaryAction: {
            label: 'Publicar analise',
            href: '/history',
        },
    };
}

interface CommunityTrendAccumulator {
    readonly key: string;
    readonly kind: CommunityDiscoveryTrendKind;
    readonly value: string;
    readonly label: string;
    readonly href: string;
    readonly postIds: Set<string>;
    likeCount: number;
    commentCount: number;
    copyCount: number;
    saveCount: number;
    lastPublishedAt: Date | null;
}

export function buildCommunityTrendBoard(input: {
    readonly posts: readonly CommunityDiscoverySourcePost[];
    readonly maxItems?: number;
}): CommunityDiscoveryTrendBoard {
    const trends = new Map<string, CommunityTrendAccumulator>();

    for (const post of input.posts.filter(isPublicDiscoveryPost)) {
        addTrendSignal(trends, post, 'weapon', post.primaryWeaponId);
        addTrendSignal(trends, post, 'patch', post.primaryPatchVersion);
        addTrendSignal(trends, post, 'diagnosis', post.primaryDiagnosisKey);
    }

    const items = [...trends.values()]
        .filter((trend) => trend.postIds.size >= 2)
        .sort(compareTrendAccumulators)
        .slice(0, input.maxItems ?? COMMUNITY_TREND_BOARD_LIMIT)
        .map(toTrendItem);

    return {
        items,
        emptyState: items.length > 0
            ? null
            : {
                title: 'Sem tendencia publica suficiente',
                body: 'Publique ou explore analises para formar sinais por arma, patch e diagnostico.',
                primaryAction: {
                    label: 'Analisar recoil',
                    href: '/analyze',
                },
                secondaryAction: {
                    label: 'Abrir historico',
                    href: '/history',
                },
            },
    };
}

function addTrendSignal(
    trends: Map<string, CommunityTrendAccumulator>,
    post: CommunityDiscoverySourcePost,
    kind: CommunityDiscoveryTrendKind,
    value: string | null,
): void {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
        return;
    }

    const key = `${kind}:${normalizedValue}`;
    const existingTrend = trends.get(key) ?? createTrendAccumulator(kind, normalizedValue);

    existingTrend.postIds.add(post.id);
    existingTrend.likeCount += toSafeCommunityCount(post.engagement.likeCount);
    existingTrend.commentCount += toSafeCommunityCount(post.engagement.commentCount);
    existingTrend.copyCount += toSafeCommunityCount(post.engagement.copyCount);
    existingTrend.saveCount += toSafeCommunityCount(post.engagement.saveCount);

    if (
        post.publishedAt instanceof Date
        && (!existingTrend.lastPublishedAt || post.publishedAt > existingTrend.lastPublishedAt)
    ) {
        existingTrend.lastPublishedAt = post.publishedAt;
    }

    trends.set(key, existingTrend);
}

function createTrendAccumulator(
    kind: CommunityDiscoveryTrendKind,
    value: string,
): CommunityTrendAccumulator {
    const filterKeyByKind = {
        weapon: 'weaponId',
        patch: 'patchVersion',
        diagnosis: 'diagnosisKey',
    } as const;
    const labelByKind = {
        weapon: formatCommunityWeaponLabel,
        patch: formatCommunityPatchLabel,
        diagnosis: formatCommunityDiagnosisLabel,
    } as const;

    return {
        key: `${kind}:${value}`,
        kind,
        value,
        label: labelByKind[kind](value),
        href: createFilterHref(filterKeyByKind[kind], value),
        postIds: new Set<string>(),
        likeCount: 0,
        commentCount: 0,
        copyCount: 0,
        saveCount: 0,
        lastPublishedAt: null,
    };
}

function getTrendScore(trend: CommunityTrendAccumulator): number {
    return trend.postIds.size * 10
        + trend.copyCount * 4
        + trend.saveCount * 3
        + trend.commentCount * 2
        + trend.likeCount;
}

function compareTrendAccumulators(
    left: CommunityTrendAccumulator,
    right: CommunityTrendAccumulator,
): number {
    const scoreDelta = getTrendScore(right) - getTrendScore(left);

    if (scoreDelta !== 0) {
        return scoreDelta;
    }

    return (right.lastPublishedAt?.getTime() ?? 0) - (left.lastPublishedAt?.getTime() ?? 0);
}

function toTrendItem(trend: CommunityTrendAccumulator): CommunityDiscoveryTrendItem {
    return {
        key: trend.key,
        kind: trend.kind,
        value: trend.value,
        label: trend.label,
        href: trend.href,
        postCount: trend.postIds.size,
        engagementCount: trend.likeCount + trend.commentCount + trend.copyCount + trend.saveCount,
        reason: formatTrendReason(trend),
    };
}

function formatTrendReason(trend: CommunityTrendAccumulator): string {
    const postSummary = formatCommunityCount(
        trend.postIds.size,
        'post publico',
        'posts publicos',
    );

    if (trend.copyCount > 0) {
        return `${postSummary} com ${formatCommunityCount(trend.copyCount, 'preset copiado', 'presets copiados')}.`;
    }

    if (trend.saveCount > 0) {
        return `${postSummary} com ${formatCommunityCount(trend.saveCount, 'drill salvo', 'drills salvos')}.`;
    }

    if (trend.commentCount > 0) {
        return `${postSummary} com ${formatCommunityCount(trend.commentCount, 'comentario publico', 'comentarios publicos')}.`;
    }

    if (trend.likeCount > 0) {
        return `${postSummary} com ${formatCommunityCount(trend.likeCount, 'curtida publica', 'curtidas publicas')}.`;
    }

    return `${postSummary} recentes.`;
}

function buildWeeklyDrillPrompt(
    trendBoard: CommunityDiscoveryTrendBoard,
): CommunityDiscoveryWeeklyDrillPrompt {
    const topTrend = trendBoard.items[0];

    if (!topTrend) {
        return {
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
        };
    }

    const titlePrefixByKind = {
        weapon: 'estabilizar',
        patch: 'validar',
        diagnosis: 'corrigir',
    } as const;

    return {
        trendKey: topTrend.key,
        title: `Drill semanal: ${titlePrefixByKind[topTrend.kind]} ${topTrend.label}`,
        body: `${topTrend.reason} Grave um spray novo, compare o recoil e publique o snapshot quando o preset estiver consistente.`,
        action: {
            label: 'Ver tendencia',
            href: topTrend.href,
        },
        secondaryAction: {
            label: 'Analisar recoil',
            href: '/analyze',
        },
    };
}

function toDiscoveryPostCard(post: CommunityDiscoverySourcePost): CommunityDiscoveryPostCard {
    const href = `/community/${post.slug}`;
    const displayName = post.author?.displayName?.trim() || 'Operador publico';

    return {
        id: post.id,
        slug: post.slug,
        href,
        title: post.title,
        excerpt: post.excerpt,
        author: {
            displayName,
            profileHref: post.author?.profileSlug
                ? `/community/users/${post.author.profileSlug}`
                : null,
            avatarUrl: post.author?.avatarUrl ?? null,
            fallbackInitials: buildCommunityFallbackInitials(displayName),
            creatorProgramStatus: post.author?.creatorProgramStatus ?? 'none',
        },
        analysisTags: buildCommunityAnalysisTags({
            weaponId: post.primaryWeaponId,
            patchVersion: post.primaryPatchVersion,
            diagnosisKey: post.primaryDiagnosisKey,
        }),
        engagement: {
            likeCount: toSafeCommunityCount(post.engagement.likeCount),
            commentCount: toSafeCommunityCount(post.engagement.commentCount),
            copyCount: toSafeCommunityCount(post.engagement.copyCount),
            saveCount: toSafeCommunityCount(post.engagement.saveCount),
        },
        primaryAction: {
            label: 'Abrir analise',
            href,
        },
        publishedAt: post.publishedAt as Date,
        publishedAtIso: (post.publishedAt as Date).toISOString(),
    };
}

function buildCreatorHighlightSources(
    posts: readonly CommunityDiscoverySourcePost[],
): readonly CommunityHighlightSourceCreator[] {
    const creators = new Map<string, CommunityHighlightSourceCreator>();

    for (const post of posts) {
        if (!post.author?.profileSlug) {
            continue;
        }

        const existingCreator = creators.get(post.author.profileId);
        const lastPublicPostAt = existingCreator?.lastPublicPostAt
            && existingCreator.lastPublicPostAt > (post.publishedAt as Date)
            ? existingCreator.lastPublicPostAt
            : (post.publishedAt as Date);

        creators.set(post.author.profileId, {
            profileId: post.author.profileId,
            profileSlug: post.author.profileSlug,
            displayName: post.author.displayName?.trim() || 'Operador publico',
            visibility: post.author.visibility,
            creatorProgramStatus: post.author.creatorProgramStatus,
            followerCount: existingCreator?.followerCount ?? 0,
            publicPostCount: (existingCreator?.publicPostCount ?? 0) + 1,
            likeCount: (existingCreator?.likeCount ?? 0) + post.engagement.likeCount,
            commentCount: (existingCreator?.commentCount ?? 0) + post.engagement.commentCount,
            copyCount: (existingCreator?.copyCount ?? 0) + post.engagement.copyCount,
            lastPublicPostAt,
        });
    }

    return [...creators.values()];
}

function createAnonymousViewerContext(): CommunityDiscoveryViewerContext {
    return {
        viewerUserId: null,
        hasPublicProfile: false,
        publicProfileHref: null,
        publishableAnalysisCount: 0,
        followedUserIds: [],
    };
}

function buildParticipationPrompts(
    viewer: CommunityDiscoveryViewerContext,
): readonly CommunityDiscoveryParticipationPrompt[] {
    if (!viewer.viewerUserId) {
        return [{
            key: 'anonymous-reader',
            title: 'Siga creators e salve drills',
            body: 'Entre para seguir creators, salvar drills, comentar snapshots e copiar presets sem fechar a leitura publica.',
            action: {
                label: 'Entrar',
                href: '/login',
            },
        }];
    }

    const prompts: CommunityDiscoveryParticipationPrompt[] = [];

    if (!viewer.hasPublicProfile) {
        prompts.push({
            key: 'complete-profile',
            title: 'Ative sua operator plate',
            body: 'Complete o perfil publico antes de publicar analises, seguir creators e deixar sua squad reconhecer seus snapshots.',
            action: {
                label: 'Completar perfil',
                href: '/profile',
            },
        });
    }

    if (viewer.publishableAnalysisCount > 0) {
        prompts.push({
            key: 'publish-analysis',
            title: 'Transforme recoil em post',
            body: `${viewer.publishableAnalysisCount} ${viewer.publishableAnalysisCount === 1 ? 'analise pronta' : 'analises prontas'} no historico para publicar, comparar recoil e testar presets com a comunidade.`,
            action: {
                label: 'Publicar analise',
                href: '/history',
            },
        });
    }

    if (prompts.length === 0) {
        prompts.push({
            key: 'publish-analysis',
            title: 'Crie um novo sinal de treino',
            body: 'Analise um spray novo para comparar recoil, salvar drill e publicar um setup quando o snapshot estiver pronto.',
            action: {
                label: 'Analisar recoil',
                href: '/analyze',
            },
        });
    }

    return prompts;
}

function createEmptyEngagement(): CommunityDiscoverySourcePost['engagement'] {
    return {
        likeCount: 0,
        commentCount: 0,
        copyCount: 0,
        saveCount: 0,
    };
}

async function getCommunityDiscoveryViewerContext(
    viewerUserId: string | null,
): Promise<CommunityDiscoveryViewerContext> {
    const normalizedViewerUserId = viewerUserId?.trim() ?? null;

    if (!normalizedViewerUserId) {
        return createAnonymousViewerContext();
    }

    const { db } = await import('@/db');
    const [[profile], [analysisCountRow], followRows] = await Promise.all([
        db
            .select({
                slug: communityProfiles.slug,
                visibility: communityProfiles.visibility,
            })
            .from(communityProfiles)
            .where(eq(communityProfiles.userId, normalizedViewerUserId))
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(analysisSessions)
            .where(eq(analysisSessions.userId, normalizedViewerUserId))
            .limit(1),
        db
            .select({
                followedUserId: communityFollows.followedUserId,
            })
            .from(communityFollows)
            .where(eq(communityFollows.followerUserId, normalizedViewerUserId)),
    ]);

    const hasPublicProfile = profile?.visibility === 'public';

    return {
        viewerUserId: normalizedViewerUserId,
        hasPublicProfile,
        publicProfileHref: hasPublicProfile ? `/community/users/${profile.slug}` : null,
        publishableAnalysisCount: toSafeCommunityCount(analysisCountRow?.count),
        followedUserIds: followRows.map((row) => row.followedUserId),
    };
}

async function getEngagementCountsByPostId(
    postIds: readonly string[],
): Promise<Map<string, CommunityDiscoverySourcePost['engagement']>> {
    const { db } = await import('@/db');
    const engagementByPostId = new Map<string, CommunityDiscoverySourcePost['engagement']>();

    if (postIds.length === 0) {
        return engagementByPostId;
    }

    for (const postId of postIds) {
        engagementByPostId.set(postId, createEmptyEngagement());
    }

    const [likeRows, commentRows, copyRows, saveRows] = await Promise.all([
        db
            .select({
                postId: communityPostLikes.postId,
                count: count(),
            })
            .from(communityPostLikes)
            .where(inArray(communityPostLikes.postId, postIds))
            .groupBy(communityPostLikes.postId),
        db
            .select({
                postId: communityPostComments.postId,
                count: count(),
            })
            .from(communityPostComments)
            .where(
                and(
                    inArray(communityPostComments.postId, postIds),
                    eq(communityPostComments.status, 'visible'),
                ),
            )
            .groupBy(communityPostComments.postId),
        db
            .select({
                postId: communityPostCopyEvents.postId,
                count: count(),
            })
            .from(communityPostCopyEvents)
            .where(inArray(communityPostCopyEvents.postId, postIds))
            .groupBy(communityPostCopyEvents.postId),
        db
            .select({
                postId: communityPostSaves.postId,
                count: count(),
            })
            .from(communityPostSaves)
            .where(inArray(communityPostSaves.postId, postIds))
            .groupBy(communityPostSaves.postId),
    ]);

    for (const row of likeRows) {
        const engagement = engagementByPostId.get(row.postId) ?? createEmptyEngagement();
        engagementByPostId.set(row.postId, {
            ...engagement,
            likeCount: toSafeCommunityCount(row.count),
        });
    }

    for (const row of commentRows) {
        const engagement = engagementByPostId.get(row.postId) ?? createEmptyEngagement();
        engagementByPostId.set(row.postId, {
            ...engagement,
            commentCount: toSafeCommunityCount(row.count),
        });
    }

    for (const row of copyRows) {
        const engagement = engagementByPostId.get(row.postId) ?? createEmptyEngagement();
        engagementByPostId.set(row.postId, {
            ...engagement,
            copyCount: toSafeCommunityCount(row.count),
        });
    }

    for (const row of saveRows) {
        const engagement = engagementByPostId.get(row.postId) ?? createEmptyEngagement();
        engagementByPostId.set(row.postId, {
            ...engagement,
            saveCount: toSafeCommunityCount(row.count),
        });
    }

    return engagementByPostId;
}

interface CommunityDiscoveryRitualContext {
    readonly seasonContext: CommunityDiscoverySeasonContextCard;
    readonly weeklyChallenge: CommunityDiscoveryWeeklyChallengeBoard;
    readonly viewerProgressionSummary: CommunityDiscoveryViewerProgressSummary | null;
    readonly missionBoard: CommunityDiscoveryMissionBoard | null;
    readonly personalRecap: CommunityDiscoveryRecapPanel | null;
    readonly squadSpotlight: CommunityDiscoverySquadSpotlight | null;
}

function isMissingCommunityGamificationRelation(error: unknown): boolean {
    const candidates = [error];

    if (typeof error === 'object' && error !== null && 'cause' in error) {
        candidates.push((error as { readonly cause?: unknown }).cause);
    }

    return candidates.some((candidate) => {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }

        const code = 'code' in candidate && typeof candidate.code === 'string'
            ? candidate.code
            : null;
        const message = 'message' in candidate && typeof candidate.message === 'string'
            ? candidate.message
            : '';

        return code === '42P01'
            || /relation "community_[^"]+" does not exist/i.test(message);
    });
}

async function withCommunityGamificationFallback<T>(
    query: () => Promise<T>,
    fallback: T,
): Promise<T> {
    try {
        return await query();
    } catch (error) {
        if (isMissingCommunityGamificationRelation(error)) {
            return fallback;
        }

        throw error;
    }
}

async function getCommunityDiscoveryRitualContext(input: {
    readonly viewer: CommunityDiscoveryViewerContext;
    readonly trendBoard: CommunityDiscoveryTrendBoard;
    readonly now: Date;
}): Promise<CommunityDiscoveryRitualContext> {
    const { db } = await import('@/db');
    const [seasonRows, missionRows] = await withCommunityGamificationFallback(
        () => Promise.all([
            db
                .select({
                    id: communitySeasons.id,
                    slug: communitySeasons.slug,
                    title: communitySeasons.title,
                    theme: communitySeasons.theme,
                    summary: communitySeasons.summary,
                    status: communitySeasons.status,
                    startsAt: communitySeasons.startsAt,
                    endsAt: communitySeasons.endsAt,
                })
                .from(communitySeasons)
                .orderBy(desc(communitySeasons.startsAt))
                .limit(COMMUNITY_DISCOVERY_SEASON_LIMIT),
            db
                .select({
                    cadence: communityMissions.cadence,
                    config: communityMissions.config,
                    description: communityMissions.description,
                    eligibleActions: communityMissions.eligibleActions,
                    endsAt: communityMissions.endsAt,
                    id: communityMissions.id,
                    missionType: communityMissions.missionType,
                    rewardXp: communityMissions.rewardXp,
                    seasonId: communityMissions.seasonId,
                    startsAt: communityMissions.startsAt,
                    status: communityMissions.status,
                    targetCount: communityMissions.targetCount,
                    theme: communityMissions.theme,
                    title: communityMissions.title,
                })
                .from(communityMissions)
                .orderBy(desc(communityMissions.startsAt))
                .limit(COMMUNITY_DISCOVERY_MISSION_LIMIT),
        ]),
        [[], []] as const,
    );
    const seasonContext = resolveActiveCommunitySeason({
        seasons: seasonRows satisfies readonly CommunitySeasonSource[],
        now: input.now,
    });
    const weeklyChallengeResolution = resolveCommunityWeeklyChallenge({
        seasonContext,
        seasons: seasonRows,
        missions: missionRows,
        trends: input.trendBoard.items,
        now: input.now,
    });

    if (!input.viewer.viewerUserId) {
        return {
            seasonContext: toCommunityDiscoverySeasonContextCard(seasonContext),
            weeklyChallenge: toCommunityDiscoveryWeeklyChallengeBoard(
                weeklyChallengeResolution,
                null,
            ),
            viewerProgressionSummary: null,
            missionBoard: null,
            personalRecap: null,
            squadSpotlight: null,
        };
    }

    const viewerUserId = input.viewer.viewerUserId;
    const [storedViewerEvents, storedViewerRewards, storedViewerSquad] = await withCommunityGamificationFallback(
        () => Promise.all([
            db
                .select({
                    idempotencyKey: communityProgressionEvents.idempotencyKey,
                    eventType: communityProgressionEvents.eventType,
                    actorUserId: communityProgressionEvents.actorUserId,
                    beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
                    entityType: communityProgressionEvents.entityType,
                    entityId: communityProgressionEvents.entityId,
                    rawXp: communityProgressionEvents.rawXp,
                    effectiveXp: communityProgressionEvents.effectiveXp,
                    occurredAt: communityProgressionEvents.occurredAt,
                    seasonId: communityProgressionEvents.seasonId,
                    missionId: communityProgressionEvents.missionId,
                    squadId: communityProgressionEvents.squadId,
                })
                .from(communityProgressionEvents)
                .where(
                    or(
                        eq(communityProgressionEvents.actorUserId, viewerUserId),
                        eq(communityProgressionEvents.beneficiaryUserId, viewerUserId),
                    ),
                )
                .orderBy(desc(communityProgressionEvents.occurredAt))
                .limit(COMMUNITY_DISCOVERY_EVENT_LIMIT),
            db
                .select({
                    displayState: communityRewardRecords.displayState,
                    earnedAt: communityRewardRecords.earnedAt,
                    id: communityRewardRecords.id,
                    isPublicSafe: communityRewardRecords.isPublicSafe,
                    label: communityRewardRecords.label,
                    ownerType: communityRewardRecords.ownerType,
                    rewardKind: communityRewardRecords.rewardKind,
                    squadId: communityRewardRecords.squadId,
                    status: communityRewardRecords.status,
                    userId: communityRewardRecords.userId,
                })
                .from(communityRewardRecords)
                .where(eq(communityRewardRecords.userId, viewerUserId))
                .orderBy(desc(communityRewardRecords.earnedAt))
                .limit(COMMUNITY_DISCOVERY_REWARD_LIMIT),
            db
                .select({
                    squadId: communitySquadMemberships.squadId,
                    squadName: communitySquads.name,
                    squadDescription: communitySquads.description,
                    squadVisibility: communitySquads.visibility,
                    squadActiveGoal: communitySquads.activeGoal,
                })
                .from(communitySquadMemberships)
                .innerJoin(communitySquads, eq(communitySquadMemberships.squadId, communitySquads.id))
                .where(
                    and(
                        eq(communitySquadMemberships.userId, viewerUserId),
                        eq(communitySquadMemberships.status, 'active'),
                        eq(communitySquads.status, 'active'),
                    ),
                )
                .orderBy(desc(communitySquadMemberships.joinedAt))
                .limit(1),
        ]),
        [[], [], []] as const,
    );
    const viewerEvents = storedViewerEvents.map((event) =>
        toCommunityProgressionHistoryEvent(event),
    );
    const viewerSummary = buildCommunityPrivateProgressionSummary({
        userId: viewerUserId,
        events: viewerEvents,
        missions: missionRows,
        now: input.now,
    });
    const personalRecap = buildCommunityPersonalRecap({
        userId: viewerUserId,
        events: viewerEvents,
        missions: missionRows,
        rewards: storedViewerRewards satisfies readonly CommunityRewardRecordSource[],
        seasons: seasonRows,
        now: input.now,
    });

    let squadSpotlight: CommunityDiscoverySquadSpotlight | null = null;
    const storedSquad = storedViewerSquad[0];

    if (storedSquad) {
        const [storedSquadMemberships, storedSquadEvents, storedSquadRewards] = await withCommunityGamificationFallback(
            () => Promise.all([
                db
                    .select({
                        userId: communitySquadMemberships.userId,
                    })
                    .from(communitySquadMemberships)
                    .where(
                        and(
                            eq(communitySquadMemberships.squadId, storedSquad.squadId),
                            eq(communitySquadMemberships.status, 'active'),
                        ),
                    ),
                db
                    .select({
                        idempotencyKey: communityProgressionEvents.idempotencyKey,
                        eventType: communityProgressionEvents.eventType,
                        actorUserId: communityProgressionEvents.actorUserId,
                        beneficiaryUserId: communityProgressionEvents.beneficiaryUserId,
                        entityType: communityProgressionEvents.entityType,
                        entityId: communityProgressionEvents.entityId,
                        rawXp: communityProgressionEvents.rawXp,
                        effectiveXp: communityProgressionEvents.effectiveXp,
                        occurredAt: communityProgressionEvents.occurredAt,
                        seasonId: communityProgressionEvents.seasonId,
                        missionId: communityProgressionEvents.missionId,
                        squadId: communityProgressionEvents.squadId,
                    })
                    .from(communityProgressionEvents)
                    .where(eq(communityProgressionEvents.squadId, storedSquad.squadId))
                    .orderBy(desc(communityProgressionEvents.occurredAt))
                    .limit(COMMUNITY_DISCOVERY_EVENT_LIMIT),
                db
                    .select({
                        displayState: communityRewardRecords.displayState,
                        earnedAt: communityRewardRecords.earnedAt,
                        id: communityRewardRecords.id,
                        isPublicSafe: communityRewardRecords.isPublicSafe,
                        label: communityRewardRecords.label,
                        ownerType: communityRewardRecords.ownerType,
                        rewardKind: communityRewardRecords.rewardKind,
                        squadId: communityRewardRecords.squadId,
                        status: communityRewardRecords.status,
                        userId: communityRewardRecords.userId,
                    })
                    .from(communityRewardRecords)
                    .where(eq(communityRewardRecords.squadId, storedSquad.squadId))
                    .orderBy(desc(communityRewardRecords.earnedAt))
                    .limit(COMMUNITY_DISCOVERY_REWARD_LIMIT),
            ]),
            [[], [], []] as const,
        );
        const squadMemberUserIds = storedSquadMemberships.map((membership) => membership.userId);
        const squadEvents = storedSquadEvents.map((event) =>
            toCommunityProgressionHistoryEvent(event),
        );
        const squadGoal = buildCommunitySquadGoalProgressSnapshot({
            squadId: storedSquad.squadId,
            memberUserIds: squadMemberUserIds,
            activeGoal: storedSquad.squadActiveGoal,
            events: squadEvents,
            now: input.now,
        });
        const squadRecap = buildCommunitySquadRecap({
            squadId: storedSquad.squadId,
            squadName: storedSquad.squadName,
            memberUserIds: squadMemberUserIds,
            events: squadEvents,
            missions: missionRows,
            rewards: storedSquadRewards satisfies readonly CommunityRewardRecordSource[],
            seasons: seasonRows,
            now: input.now,
        });

        squadSpotlight = toCommunityDiscoverySquadSpotlight({
            squad: storedSquad,
            goal: squadGoal,
            recap: squadRecap,
        });
    }

    return {
        seasonContext: toCommunityDiscoverySeasonContextCard(seasonContext),
        weeklyChallenge: toCommunityDiscoveryWeeklyChallengeBoard(
            weeklyChallengeResolution,
            viewerUserId,
        ),
        viewerProgressionSummary: toCommunityDiscoveryViewerProgressSummary(
            viewerSummary,
            input.viewer,
        ),
        missionBoard: toCommunityDiscoveryMissionBoard(
            viewerSummary,
            input.viewer,
        ),
        personalRecap: toCommunityDiscoveryRecapPanel(personalRecap),
        squadSpotlight,
    };
}

function toCommunityDiscoverySeasonContextCard(
    seasonContext: CommunitySeasonContext,
): CommunityDiscoverySeasonContextCard {
    return {
        title: seasonContext.title,
        theme: seasonContext.theme,
        summary: seasonContext.summary,
        stateLabel: seasonContext.kind === 'active' ? 'Temporada ativa' : 'Modo evergreen',
        windowLabel: formatCommunityDiscoveryWindowLabel(
            seasonContext.startsAt,
            seasonContext.endsAt,
        ),
    };
}

function toCommunityDiscoveryWeeklyChallengeBoard(
    challenge: CommunityWeeklyChallengeResolution,
    viewerUserId: string | null,
): CommunityDiscoveryWeeklyChallengeBoard {
    return {
        source: challenge.source,
        title: challenge.title,
        description: challenge.description,
        rationale: challenge.rationale,
        theme: challenge.theme,
        windowLabel: formatCommunityDiscoveryWindowLabel(
            challenge.startsAt,
            challenge.endsAt,
        ),
        trendHref: challenge.trend?.href ?? null,
        actions: challenge.eligibleActions.map((action) => ({
            title: action.title,
            description: action.description,
            xpLabel: `${action.defaultXp} XP`,
            href: resolveCommunityDiscoveryActionHref(action.eventType, viewerUserId),
        })),
    };
}

function toCommunityDiscoveryViewerProgressSummary(
    summary: ReturnType<typeof buildCommunityPrivateProgressionSummary>,
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryViewerProgressSummary {
    return {
        state: summary.isZeroState ? 'zero_state' : 'active',
        title: summary.isZeroState
            ? 'Sua progressao ainda esta zerada'
            : `Nivel ${summary.currentLevel} em progresso`,
        summary: summary.isZeroState
            ? 'Complete o perfil publico ou publique uma analise util para abrir seu primeiro loop comunitario.'
            : `${summary.totalXp} XP acumulados, ${summary.activeMissionCount} missao(oes) ativa(s) e streak ${summary.streak.currentStreak}.`,
        level: summary.currentLevel,
        totalXp: summary.totalXp,
        currentLevelXp: summary.currentLevelXp,
        nextLevelXp: summary.nextLevelXp,
        xpToNextLevel: summary.aggregate.levelState.xpToNextLevel,
        progressRatio: summary.aggregate.levelState.progressRatio,
        currentStreak: summary.streak.currentStreak,
        streakState: summary.streak.streakState,
        nextAction: {
            title: summary.nextMeaningfulAction.title,
            description: summary.nextMeaningfulAction.description,
            href: resolveCommunityDiscoveryActionHref(
                summary.nextMeaningfulAction.eventType,
                viewer.viewerUserId,
            ),
        },
        nextMilestone: {
            title: summary.nextMilestone.title,
            description: summary.nextMilestone.description,
        },
        publicProfileHref: viewer.publicProfileHref,
    };
}

function toCommunityDiscoveryMissionBoard(
    summary: ReturnType<typeof buildCommunityPrivateProgressionSummary>,
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryMissionBoard {
    const activeMissions = summary.missionProgress
        .filter((mission) => mission.status === 'active' && !mission.isComplete)
        .slice(0, 3);

    return {
        title: 'Mission board semanal',
        summary: activeMissions.length > 0
            ? `${activeMissions.length} missao(oes) abertas para manter seu ritmo sem trocar qualidade por volume.`
            : 'Sem missao ativa agora. O proximo ritual aparece assim que uma janela nova abrir.',
        items: activeMissions.map((mission) =>
            toCommunityDiscoveryMissionBoardItem(mission, viewer),
        ),
        emptyState: activeMissions.length > 0
            ? null
            : {
                title: 'Mission board em zero state',
                body: 'Enquanto isso, siga a proxima acao sugerida para manter sua progressao ativa sem containers vazios.',
                primaryAction: {
                    label: summary.nextMeaningfulAction.title,
                    href: resolveCommunityDiscoveryActionHref(
                        summary.nextMeaningfulAction.eventType,
                        viewer.viewerUserId,
                    ),
                },
            },
    };
}

function toCommunityDiscoveryMissionBoardItem(
    mission: CommunityMissionProgressSnapshot,
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryMissionBoardItem {
    const primaryEventType = mission.eligibleEventTypes[0] ?? 'publish_post';

    return {
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        progressLabel: `${mission.currentCount}/${mission.targetCount} passos`,
        rewardLabel: `${mission.rewardXp} XP`,
        completionRatio: mission.completionRatio,
        state: mission.currentCount === 0
            ? 'zero_state'
            : mission.isComplete
                ? 'complete'
                : 'in_progress',
        primaryAction: {
            label: 'Abrir proxima acao',
            href: resolveCommunityDiscoveryActionHref(primaryEventType, viewer.viewerUserId),
        },
    };
}

function toCommunityDiscoveryRecapPanel(
    recap: ReturnType<typeof buildCommunityPersonalRecap>,
): CommunityDiscoveryRecapPanel {
    return {
        state: recap.state,
        title: recap.headline,
        summary: recap.summary,
        ritualCount: recap.completedRituals.length,
        rewardCount: recap.unlockedRewards.length,
        earnedXp: recap.earnedXp,
        nextAction: recap.nextAction
            ? {
                title: recap.nextAction.title,
                href: resolveCommunityDiscoveryActionHref(recap.nextAction.eventType, recap.userId),
            }
            : null,
    };
}

function toCommunityDiscoverySquadSpotlight(input: {
    readonly squad: {
        readonly squadId: string;
        readonly squadName: string;
        readonly squadDescription: string | null;
        readonly squadVisibility: typeof communitySquads.$inferSelect.visibility;
        readonly squadActiveGoal: typeof communitySquads.$inferSelect.activeGoal;
    };
    readonly goal: ReturnType<typeof buildCommunitySquadGoalProgressSnapshot>;
    readonly recap: ReturnType<typeof buildCommunitySquadRecap>;
}): CommunityDiscoverySquadSpotlight {
    return {
        title: input.squad.squadName,
        description: input.squad.squadDescription?.trim()
            || 'Squad configurado para loops leves, assincronos e baseados em contribuicao util.',
        visibilityLabel: input.squad.squadVisibility === 'public'
            ? 'Squad publico'
            : 'Squad privado',
        goalHeadline: input.goal.headline,
        goalSummary: input.goal.summary,
        progressLabel: `${input.goal.currentCount}/${input.goal.targetCount} acoes`,
        memberCount: input.recap.memberCount,
        recapTitle: input.recap.headline,
        recapSummary: input.recap.summary,
        nextAction: input.goal.nextAction
            ? {
                title: input.goal.nextAction.title,
                href: resolveCommunityDiscoveryActionHref(
                    input.goal.nextAction.eventType,
                    'viewer',
                ),
            }
            : input.recap.nextAction
                ? {
                    title: input.recap.nextAction.title,
                    href: resolveCommunityDiscoveryActionHref(
                        input.recap.nextAction.eventType,
                        'viewer',
                    ),
                }
                : null,
    };
}

function createZeroCommunityDiscoveryViewerProgressSummary(
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryViewerProgressSummary {
    const nextAction = viewer.hasPublicProfile
        ? {
            title: 'Publique uma analise publica',
            description: 'Transforme um snapshot em contribuicao publica para abrir seu primeiro XP.',
            href: '/history',
        }
        : {
            title: 'Complete seu perfil publico',
            description: 'Ative sua operator plate para destravar missões e progresso viewer-aware.',
            href: '/profile',
        };

    return {
        state: 'zero_state',
        title: 'Sua progressao ainda esta zerada',
        summary: 'As primeiras placas aparecem assim que voce ativa seu perfil ou publica uma analise util.',
        level: 1,
        totalXp: 0,
        currentLevelXp: 0,
        nextLevelXp: 100,
        xpToNextLevel: 100,
        progressRatio: 0,
        currentStreak: 0,
        streakState: 'inactive',
        nextAction,
        nextMilestone: {
            title: 'Nivel 2',
            description: 'Faltam 100 XP para abrir o proximo nivel comunitario.',
        },
        publicProfileHref: viewer.publicProfileHref,
    };
}

function createEmptyCommunityDiscoveryMissionBoard(
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryMissionBoard {
    const primaryAction = viewer.hasPublicProfile
        ? {
            label: 'Publicar analise',
            href: '/history',
        }
        : {
            label: 'Completar perfil',
            href: '/profile',
        };

    return {
        title: 'Mission board semanal',
        summary: 'Sem missao ativa agora. O proximo ritual aparece assim que uma janela nova abrir.',
        items: [],
        emptyState: {
            title: 'Mission board em zero state',
            body: 'Use a proxima acao sugerida para abrir seu primeiro objetivo semanal sem ruido artificial.',
            primaryAction,
        },
    };
}

function createZeroCommunityDiscoveryRecapPanel(
    viewer: CommunityDiscoveryViewerContext,
): CommunityDiscoveryRecapPanel {
    return {
        state: 'zero_state',
        title: 'Recap ainda em branco',
        summary: 'Seus rituais, XP da semana e recompensas desbloqueadas aparecem aqui quando voce registrar a primeira contribuicao util.',
        ritualCount: 0,
        rewardCount: 0,
        earnedXp: 0,
        nextAction: {
            title: viewer.hasPublicProfile ? 'Publicar analise' : 'Completar perfil',
            href: viewer.hasPublicProfile ? '/history' : '/profile',
        },
    };
}

function formatCommunityDiscoveryWindowLabel(
    startsAt: Date | null,
    endsAt: Date | null,
): string {
    if (!startsAt || !endsAt) {
        return 'Sempre disponivel';
    }

    return `${communityDiscoveryWindowDateFormatter.format(startsAt)} - ${communityDiscoveryWindowDateFormatter.format(endsAt)}`;
}

function resolveCommunityDiscoveryActionHref(
    eventType: CommunityProgressionHistoryEvent['eventType'],
    viewerUserId: string | null,
): string {
    switch (eventType) {
        case 'complete_public_profile':
            return viewerUserId ? '/profile' : '/login';

        case 'publish_post':
            return viewerUserId ? '/history' : '/login';

        case 'follow_profile':
            return viewerUserId ? '/community#creator-plates' : '/login';

        case 'comment_with_context':
        case 'receive_unique_save':
        case 'receive_unique_copy':
        case 'weekly_challenge_complete':
        case 'mission_complete':
        case 'squad_goal_contribution':
            return '/community';

        case 'streak_participation':
            return viewerUserId ? '/analyze' : '/login';
    }
}
