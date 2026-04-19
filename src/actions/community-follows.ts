'use server';

import { and, count, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { communityFollows, communityProfiles } from '@/db/schema';
import { checkCommunityActionRateLimit } from '@/lib/rate-limit';

export interface SetCommunityProfileFollowInput {
    readonly slug: string;
    readonly following: boolean;
}

type SetCommunityProfileFollowResult =
    | {
        readonly success: true;
        readonly followedUserId: string;
        readonly following: boolean;
        readonly followerCount: number;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

export interface GetCommunityProfileFollowStateInput {
    readonly slug: string;
    readonly viewerUserId: string | null;
}

export interface CommunityProfileFollowState {
    readonly followerCount: number;
    readonly viewerIsFollowing: boolean;
    readonly canFollow: boolean;
}

interface ResolvedCommunityFollowTarget {
    readonly userId: string;
}

async function resolveCommunityFollowTarget(
    slug: string,
): Promise<ResolvedCommunityFollowTarget | null> {
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
        return null;
    }

    const [storedProfile] = await db
        .select({
            userId: communityProfiles.userId,
        })
        .from(communityProfiles)
        .where(
            and(
                eq(communityProfiles.slug, normalizedSlug),
                eq(communityProfiles.visibility, 'public'),
            ),
        )
        .limit(1);

    return storedProfile ?? null;
}

async function getCommunityProfileFollowerCount(userId: string): Promise<number> {
    const [followerCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityFollows)
        .where(eq(communityFollows.followedUserId, userId))
        .limit(1);

    return Number(followerCountRow?.count ?? 0);
}

export async function setCommunityProfileFollow(
    input: SetCommunityProfileFollowInput,
): Promise<SetCommunityProfileFollowResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.profile.follow',
        userId: session.user.id,
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitas acoes de seguir em pouco tempo. Tente novamente.',
        };
    }

    const storedProfile = await resolveCommunityFollowTarget(input.slug);

    if (!storedProfile) {
        return {
            success: false,
            error: 'Perfil nao encontrado.',
        };
    }

    if (storedProfile.userId === session.user.id) {
        return {
            success: false,
            error: 'Voce nao pode seguir o proprio perfil.',
        };
    }

    if (input.following) {
        await db
            .insert(communityFollows)
            .values({
                followerUserId: session.user.id,
                followedUserId: storedProfile.userId,
            })
            .onConflictDoNothing({
                target: [communityFollows.followerUserId, communityFollows.followedUserId],
            });
    } else {
        await db
            .delete(communityFollows)
            .where(
                and(
                    eq(communityFollows.followerUserId, session.user.id),
                    eq(communityFollows.followedUserId, storedProfile.userId),
                ),
            );
    }

    const followerCount = await getCommunityProfileFollowerCount(storedProfile.userId);

    return {
        success: true,
        followedUserId: storedProfile.userId,
        following: input.following,
        followerCount,
    };
}

export async function getCommunityProfileFollowState(
    input: GetCommunityProfileFollowStateInput,
): Promise<CommunityProfileFollowState | null> {
    const storedProfile = await resolveCommunityFollowTarget(input.slug);

    if (!storedProfile) {
        return null;
    }

    const followerCount = await getCommunityProfileFollowerCount(storedProfile.userId);
    const normalizedViewerUserId = input.viewerUserId?.trim() ?? null;

    if (!normalizedViewerUserId) {
        return {
            followerCount,
            viewerIsFollowing: false,
            canFollow: true,
        };
    }

    if (normalizedViewerUserId === storedProfile.userId) {
        return {
            followerCount,
            viewerIsFollowing: false,
            canFollow: false,
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
                eq(communityFollows.followedUserId, storedProfile.userId),
            ),
        )
        .limit(1);

    return {
        followerCount,
        viewerIsFollowing: Boolean(storedFollow),
        canFollow: true,
    };
}
