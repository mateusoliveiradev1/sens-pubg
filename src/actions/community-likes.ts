'use server';

import { and, count, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { communityPostLikes, communityPosts } from '@/db/schema';

export interface SetCommunityPostLikeInput {
    readonly slug: string;
    readonly liked: boolean;
}

type SetCommunityPostLikeResult =
    | {
        readonly success: true;
        readonly postId: string;
        readonly liked: boolean;
        readonly likeCount: number;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

async function getCommunityPostLikeCount(postId: string): Promise<number> {
    const [likeCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPostLikes)
        .where(eq(communityPostLikes.postId, postId))
        .limit(1);

    return Number(likeCountRow?.count ?? 0);
}

export async function setCommunityPostLike(
    input: SetCommunityPostLikeInput,
): Promise<SetCommunityPostLikeResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const normalizedSlug = input.slug.trim();
    const [storedPost] = await db
        .select({
            id: communityPosts.id,
        })
        .from(communityPosts)
        .where(eq(communityPosts.slug, normalizedSlug))
        .limit(1);

    if (!storedPost) {
        return {
            success: false,
            error: 'Post nao encontrado.',
        };
    }

    if (input.liked) {
        await db
            .insert(communityPostLikes)
            .values({
                postId: storedPost.id,
                userId: session.user.id,
            })
            .onConflictDoNothing({
                target: [communityPostLikes.postId, communityPostLikes.userId],
            });
    } else {
        await db
            .delete(communityPostLikes)
            .where(
                and(
                    eq(communityPostLikes.postId, storedPost.id),
                    eq(communityPostLikes.userId, session.user.id),
                ),
            );
    }

    const likeCount = await getCommunityPostLikeCount(storedPost.id);

    return {
        success: true,
        postId: storedPost.id,
        liked: input.liked,
        likeCount,
    };
}
