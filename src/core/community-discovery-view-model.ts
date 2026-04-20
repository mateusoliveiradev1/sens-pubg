import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';

import {
    analysisSessions,
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPostSaves,
    communityPosts,
    communityProfiles,
} from '@/db/schema';
import type {
    CommunityCreatorProgramStatus,
    CommunityProfileVisibility,
} from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
} from '@/types/community';
import {
    buildCommunityAnalysisTags,
    buildCommunityFallbackInitials,
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

const COMMUNITY_DISCOVERY_QUERY_LIMIT = 50;

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
        participationPrompts: buildParticipationPrompts(input.viewer ?? createAnonymousViewerContext()),
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

    return buildCommunityDiscoveryViewModel({
        ...(input.filters ? { filters: input.filters } : {}),
        viewer,
        posts: rows.map((row): CommunityDiscoverySourcePost => ({
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
        })),
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
    const [[profile], [analysisCountRow]] = await Promise.all([
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
    ]);

    const hasPublicProfile = profile?.visibility === 'public';

    return {
        viewerUserId: normalizedViewerUserId,
        hasPublicProfile,
        publicProfileHref: hasPublicProfile ? `/community/users/${profile.slug}` : null,
        publishableAnalysisCount: toSafeCommunityCount(analysisCountRow?.count),
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
