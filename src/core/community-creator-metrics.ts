import { and, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPosts,
} from '@/db/schema';

export interface GetCommunityCreatorMetricsInput {
    readonly authorId: string;
}

export interface CommunityCreatorMetrics {
    readonly authorId: string;
    readonly postCount: number;
    readonly likeCount: number;
    readonly commentCount: number;
    readonly copyCount: number;
}

interface CountRow {
    readonly count?: number | string | null;
}

function createEmptyCommunityCreatorMetrics(authorId: string): CommunityCreatorMetrics {
    return {
        authorId,
        postCount: 0,
        likeCount: 0,
        commentCount: 0,
        copyCount: 0,
    };
}

function resolveCountValue(row: CountRow | undefined): number {
    return Number(row?.count ?? 0);
}

function buildPublishedPublicAuthorPostsWhere(authorId: string) {
    return and(
        eq(communityPosts.authorId, authorId),
        eq(communityPosts.status, 'published'),
        eq(communityPosts.visibility, 'public'),
    );
}

export async function getCommunityCreatorMetrics(
    input: GetCommunityCreatorMetricsInput,
): Promise<CommunityCreatorMetrics> {
    const normalizedAuthorId = input.authorId.trim();

    if (!normalizedAuthorId) {
        return createEmptyCommunityCreatorMetrics(normalizedAuthorId);
    }

    // Basic creator analytics intentionally stay on persisted community tables only.
    const [postCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .where(buildPublishedPublicAuthorPostsWhere(normalizedAuthorId))
        .limit(1);

    const [likeCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .innerJoin(communityPostLikes, eq(communityPostLikes.postId, communityPosts.id))
        .where(buildPublishedPublicAuthorPostsWhere(normalizedAuthorId))
        .limit(1);

    const [commentCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .innerJoin(communityPostComments, eq(communityPostComments.postId, communityPosts.id))
        .where(
            and(
                buildPublishedPublicAuthorPostsWhere(normalizedAuthorId),
                eq(communityPostComments.status, 'visible'),
            ),
        )
        .limit(1);

    const [copyCountRow] = await db
        .select({
            count: count(),
        })
        .from(communityPosts)
        .innerJoin(communityPostCopyEvents, eq(communityPostCopyEvents.postId, communityPosts.id))
        .where(buildPublishedPublicAuthorPostsWhere(normalizedAuthorId))
        .limit(1);

    return {
        authorId: normalizedAuthorId,
        postCount: resolveCountValue(postCountRow),
        likeCount: resolveCountValue(likeCountRow),
        commentCount: resolveCountValue(commentCountRow),
        copyCount: resolveCountValue(copyCountRow),
    };
}
