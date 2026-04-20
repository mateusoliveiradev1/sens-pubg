import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';

import {
    communityFollows,
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPostSaves,
    communityPosts,
    communityProfiles,
} from '@/db/schema';
import type {
    CommunityCreatorProgramStatus,
    CommunityProfileLink,
    CommunityProfileVisibility,
} from '@/db/schema';
import type {
    CommunityPostStatus,
    CommunityPostVisibility,
} from '@/types/community';
import {
    buildCommunityAnalysisTags,
    buildCommunityFallbackInitials,
    formatCommunityCreatorStatusBadge,
    normalizeCommunityExternalLinks,
    toSafeCommunityCount,
} from './community-public-formatting';

export interface CommunityPublicProfileSourceProfile {
    readonly userId: string;
    readonly profileId: string;
    readonly slug: string;
    readonly displayName: string;
    readonly headline: string | null;
    readonly bio: string | null;
    readonly avatarUrl: string | null;
    readonly links: readonly CommunityProfileLink[];
    readonly visibility: CommunityProfileVisibility;
    readonly creatorProgramStatus: CommunityCreatorProgramStatus;
}

export interface CommunityPublicProfileSourcePost {
    readonly id: string;
    readonly slug: string;
    readonly title: string;
    readonly excerpt: string;
    readonly status: CommunityPostStatus;
    readonly visibility: CommunityPostVisibility;
    readonly publishedAt: Date | null;
    readonly primaryWeaponId: string | null;
    readonly primaryPatchVersion: string | null;
    readonly primaryDiagnosisKey: string | null;
}

export interface CommunityPublicProfileCreatorMetrics {
    readonly publicPostCount: number;
    readonly likeCount: number;
    readonly commentCount: number;
    readonly copyCount: number;
    readonly saveCount: number;
}

export interface CommunityPublicProfileFollowState {
    readonly followerCount: number;
    readonly viewerIsFollowing: boolean;
}

export interface CommunityPublicProfilePostCard {
    readonly id: string;
    readonly slug: string;
    readonly href: string;
    readonly title: string;
    readonly excerpt: string;
    readonly analysisTags: readonly {
        readonly key: 'weapon' | 'patch' | 'diagnosis';
        readonly value: string;
        readonly label: string;
    }[];
    readonly publishedAt: Date;
    readonly publishedAtIso: string;
    readonly primaryAction: {
        readonly label: string;
        readonly href: string;
    };
}

export interface CommunityPublicProfileViewModel {
    readonly identity: {
        readonly profileId: string;
        readonly slug: string;
        readonly displayName: string;
        readonly headline: string | null;
        readonly bio: string | null;
        readonly avatarUrl: string | null;
        readonly fallbackInitials: string;
        readonly creatorProgramStatus: CommunityCreatorProgramStatus;
        readonly creatorBadge: {
            readonly label: string;
            readonly status: CommunityCreatorProgramStatus;
        } | null;
        readonly profileHref: string;
        readonly canonicalPath: string;
    };
    readonly links: readonly {
        readonly label: string;
        readonly url: string;
        readonly target: '_blank';
        readonly rel: 'noreferrer';
    }[];
    readonly metrics: {
        readonly followerCount: number;
        readonly publicPostCount: number;
        readonly likeCount: number;
        readonly commentCount: number;
        readonly copyCount: number;
        readonly saveCount: number;
    };
    readonly follow: {
        readonly followerCount: number;
        readonly viewerIsFollowing: boolean;
        readonly canFollow: boolean;
        readonly isSelfProfile: boolean;
        readonly actionLabel: string;
        readonly disabledReason: string | null;
    };
    readonly posts: readonly CommunityPublicProfilePostCard[];
    readonly emptyState: {
        readonly title: string;
        readonly body: string;
        readonly primaryAction: {
            readonly label: string;
            readonly href: string;
        };
    } | null;
}

export interface BuildPublicCommunityProfileViewModelInput {
    readonly profile: CommunityPublicProfileSourceProfile;
    readonly posts: readonly CommunityPublicProfileSourcePost[];
    readonly creatorMetrics: CommunityPublicProfileCreatorMetrics;
    readonly followState: CommunityPublicProfileFollowState;
    readonly viewerUserId: string | null;
}

export function buildPublicCommunityProfileViewModel(
    input: BuildPublicCommunityProfileViewModelInput,
): CommunityPublicProfileViewModel {
    const profileHref = `/community/users/${input.profile.slug}`;
    const publicPosts = input.posts
        .filter(isPublicProfilePost)
        .sort(compareProfilePostsByRecency)
        .map(toProfilePostCard);
    const isSelfProfile = input.viewerUserId === input.profile.userId;
    const canFollow = Boolean(input.viewerUserId) && !isSelfProfile;

    return {
        identity: {
            profileId: input.profile.profileId,
            slug: input.profile.slug,
            displayName: input.profile.displayName,
            headline: input.profile.headline,
            bio: input.profile.bio,
            avatarUrl: input.profile.avatarUrl,
            fallbackInitials: buildCommunityFallbackInitials(input.profile.displayName),
            creatorProgramStatus: input.profile.creatorProgramStatus,
            creatorBadge: formatCommunityCreatorStatusBadge(input.profile.creatorProgramStatus),
            profileHref,
            canonicalPath: profileHref,
        },
        links: normalizeCommunityExternalLinks(input.profile.links),
        metrics: {
            followerCount: toSafeCommunityCount(input.followState.followerCount),
            publicPostCount: toSafeCommunityCount(input.creatorMetrics.publicPostCount),
            likeCount: toSafeCommunityCount(input.creatorMetrics.likeCount),
            commentCount: toSafeCommunityCount(input.creatorMetrics.commentCount),
            copyCount: toSafeCommunityCount(input.creatorMetrics.copyCount),
            saveCount: toSafeCommunityCount(input.creatorMetrics.saveCount),
        },
        follow: {
            followerCount: toSafeCommunityCount(input.followState.followerCount),
            viewerIsFollowing: canFollow ? input.followState.viewerIsFollowing : false,
            canFollow,
            isSelfProfile,
            actionLabel: resolveFollowActionLabel({
                canFollow,
                isSelfProfile,
                viewerIsFollowing: input.followState.viewerIsFollowing,
            }),
            disabledReason: resolveFollowDisabledReason({
                canFollow,
                isSelfProfile,
                viewerUserId: input.viewerUserId,
            }),
        },
        posts: publicPosts,
        emptyState: publicPosts.length > 0
            ? null
            : {
                title: 'Sem analises publicas ainda',
                body: 'Este perfil ainda nao publicou snapshots publicos. Continue explorando outros setups da comunidade.',
                primaryAction: {
                    label: 'Explorar comunidade',
                    href: '/community',
                },
            },
    };
}

export interface GetPublicCommunityProfileViewModelInput {
    readonly slug: string;
    readonly viewerUserId: string | null;
}

export async function getPublicCommunityProfileViewModel(
    input: GetPublicCommunityProfileViewModelInput,
): Promise<CommunityPublicProfileViewModel | null> {
    const normalizedSlug = input.slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const { db } = await import('@/db');

    const [storedProfile] = await db
        .select({
            userId: communityProfiles.userId,
            profileId: communityProfiles.id,
            slug: communityProfiles.slug,
            displayName: communityProfiles.displayName,
            headline: communityProfiles.headline,
            bio: communityProfiles.bio,
            avatarUrl: communityProfiles.avatarUrl,
            links: communityProfiles.links,
            visibility: communityProfiles.visibility,
            creatorProgramStatus: communityProfiles.creatorProgramStatus,
        })
        .from(communityProfiles)
        .where(
            and(
                eq(communityProfiles.slug, normalizedSlug),
                eq(communityProfiles.visibility, 'public'),
            ),
        )
        .limit(1);

    if (!storedProfile) {
        return null;
    }

    const storedPosts = await db
        .select({
            id: communityPosts.id,
            slug: communityPosts.slug,
            title: communityPosts.title,
            excerpt: communityPosts.excerpt,
            status: communityPosts.status,
            visibility: communityPosts.visibility,
            publishedAt: communityPosts.publishedAt,
            primaryWeaponId: communityPosts.primaryWeaponId,
            primaryPatchVersion: communityPosts.primaryPatchVersion,
            primaryDiagnosisKey: communityPosts.primaryDiagnosisKey,
        })
        .from(communityPosts)
        .where(
            and(
                eq(communityPosts.communityProfileId, storedProfile.profileId),
                eq(communityPosts.status, 'published'),
                eq(communityPosts.visibility, 'public'),
                isNotNull(communityPosts.publishedAt),
            ),
        )
        .orderBy(desc(communityPosts.publishedAt));
    const postIds = storedPosts.map((post) => post.id);
    const [creatorMetrics, followState] = await Promise.all([
        getPublicProfileMetrics(postIds),
        getPublicProfileFollowState({
            profileUserId: storedProfile.userId,
            viewerUserId: input.viewerUserId,
        }),
    ]);

    return buildPublicCommunityProfileViewModel({
        profile: storedProfile,
        posts: storedPosts,
        creatorMetrics,
        followState,
        viewerUserId: input.viewerUserId,
    });
}

function isPublicProfilePost(post: CommunityPublicProfileSourcePost): boolean {
    return post.status === 'published'
        && post.visibility === 'public'
        && post.publishedAt instanceof Date;
}

function compareProfilePostsByRecency(
    left: CommunityPublicProfileSourcePost,
    right: CommunityPublicProfileSourcePost,
): number {
    return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
}

function toProfilePostCard(post: CommunityPublicProfileSourcePost): CommunityPublicProfilePostCard {
    const href = `/community/${post.slug}`;

    return {
        id: post.id,
        slug: post.slug,
        href,
        title: post.title,
        excerpt: post.excerpt,
        analysisTags: buildCommunityAnalysisTags({
            weaponId: post.primaryWeaponId,
            patchVersion: post.primaryPatchVersion,
            diagnosisKey: post.primaryDiagnosisKey,
        }),
        publishedAt: post.publishedAt as Date,
        publishedAtIso: (post.publishedAt as Date).toISOString(),
        primaryAction: {
            label: 'Abrir analise',
            href,
        },
    };
}

function resolveFollowActionLabel(input: {
    readonly canFollow: boolean;
    readonly isSelfProfile: boolean;
    readonly viewerIsFollowing: boolean;
}): string {
    if (input.isSelfProfile) {
        return 'Seu perfil publico';
    }

    if (!input.canFollow) {
        return 'Entrar para seguir';
    }

    return input.viewerIsFollowing ? 'Deixar de seguir' : 'Seguir creator';
}

function resolveFollowDisabledReason(input: {
    readonly canFollow: boolean;
    readonly isSelfProfile: boolean;
    readonly viewerUserId: string | null;
}): string | null {
    if (input.isSelfProfile) {
        return 'Este e o seu perfil publico.';
    }

    if (!input.canFollow && !input.viewerUserId) {
        return 'Entre para seguir este perfil.';
    }

    return null;
}

async function getPublicProfileMetrics(
    postIds: readonly string[],
): Promise<CommunityPublicProfileCreatorMetrics> {
    const { db } = await import('@/db');

    if (postIds.length === 0) {
        return {
            publicPostCount: 0,
            likeCount: 0,
            commentCount: 0,
            copyCount: 0,
            saveCount: 0,
        };
    }

    const [likeRows, commentRows, copyRows, saveRows] = await Promise.all([
        db
            .select({
                count: count(),
            })
            .from(communityPostLikes)
            .where(inArray(communityPostLikes.postId, postIds))
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostComments)
            .where(
                and(
                    inArray(communityPostComments.postId, postIds),
                    eq(communityPostComments.status, 'visible'),
                ),
            )
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostCopyEvents)
            .where(inArray(communityPostCopyEvents.postId, postIds))
            .limit(1),
        db
            .select({
                count: count(),
            })
            .from(communityPostSaves)
            .where(inArray(communityPostSaves.postId, postIds))
            .limit(1),
    ]);

    return {
        publicPostCount: postIds.length,
        likeCount: toSafeCommunityCount(likeRows[0]?.count),
        commentCount: toSafeCommunityCount(commentRows[0]?.count),
        copyCount: toSafeCommunityCount(copyRows[0]?.count),
        saveCount: toSafeCommunityCount(saveRows[0]?.count),
    };
}

async function getPublicProfileFollowState(input: {
    readonly profileUserId: string;
    readonly viewerUserId: string | null;
}): Promise<CommunityPublicProfileFollowState> {
    const { db } = await import('@/db');
    const [followerCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityFollows)
        .where(eq(communityFollows.followedUserId, input.profileUserId))
        .limit(1);
    const followerCount = toSafeCommunityCount(followerCountRow?.count);
    const normalizedViewerUserId = input.viewerUserId?.trim() ?? null;

    if (!normalizedViewerUserId || normalizedViewerUserId === input.profileUserId) {
        return {
            followerCount,
            viewerIsFollowing: false,
        };
    }

    const [storedFollow] = await db
        .select({
            followerUserId: communityFollows.followerUserId,
        })
        .from(communityFollows)
        .where(
            and(
                eq(communityFollows.followerUserId, normalizedViewerUserId),
                eq(communityFollows.followedUserId, input.profileUserId),
            ),
        )
        .limit(1);

    return {
        followerCount,
        viewerIsFollowing: Boolean(storedFollow),
    };
}
