'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { communityPostComments, communityPosts, users } from '@/db/schema';
import { trackCommunityProgressionForAction } from '@/lib/community-progression-recorder';
import { checkCommunityActionRateLimit } from '@/lib/rate-limit';

export interface CreateCommunityPostCommentInput {
    readonly slug: string;
    readonly bodyMarkdown: string;
    readonly diagnosisContextKey?: string | null;
}

type CreateCommunityPostCommentResult =
    | {
        readonly success: true;
        readonly postId: string;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

export interface VisibleCommunityPostComment {
    readonly id: string;
    readonly author: {
        readonly id: string;
        readonly name: string | null;
        readonly image: string | null;
    };
    readonly bodyMarkdown: string;
    readonly diagnosisContextKey: string | null;
    readonly createdAt: Date;
}

export async function createCommunityPostComment(
    input: CreateCommunityPostCommentInput,
): Promise<CreateCommunityPostCommentResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            error: 'Nao autenticado.',
        };
    }

    const normalizedSlug = input.slug.trim();
    const normalizedBodyMarkdown = input.bodyMarkdown.trim();
    const normalizedDiagnosisContextKey = input.diagnosisContextKey?.trim() || null;

    if (!normalizedSlug || !normalizedBodyMarkdown) {
        return {
            success: false,
            error: 'Comentario invalido.',
        };
    }

    const rateLimitResult = await checkCommunityActionRateLimit({
        action: 'community.comment.create',
        userId: session.user.id,
    });

    if (!rateLimitResult.success) {
        return {
            success: false,
            error: 'Muitos comentarios em pouco tempo. Tente novamente.',
        };
    }

    const [storedPost] = await db
        .select({
            id: communityPosts.id,
            authorId: communityPosts.authorId,
            status: communityPosts.status,
            visibility: communityPosts.visibility,
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

    if (storedPost.status !== 'published' || storedPost.visibility !== 'public') {
        return {
            success: false,
            error: 'Post indisponivel para comentario.',
        };
    }

    const [createdComment] = await db
        .insert(communityPostComments)
        .values({
            postId: storedPost.id,
            authorId: session.user.id,
            status: 'visible',
            bodyMarkdown: normalizedBodyMarkdown,
            diagnosisContextKey: normalizedDiagnosisContextKey,
        })
        .returning({
            id: communityPostComments.id,
        });

    if (normalizedDiagnosisContextKey && createdComment) {
        await trackCommunityProgressionForAction({
            actorUserId: session.user.id,
            eventType: 'comment_with_context',
            entityType: 'comment',
            entityId: createdComment.id,
            dedupeKey: createdComment.id,
            hasRequiredContext: true,
            isPubliclyVisible: true,
            metadata: {
                diagnosisContextKey: normalizedDiagnosisContextKey,
                sourcePostAuthorId: storedPost.authorId,
                sourceCommentId: createdComment.id,
                sourcePostId: storedPost.id,
            },
        });
    }

    revalidatePath(`/community/${normalizedSlug}`);

    return {
        success: true,
        postId: storedPost.id,
    };
}

export async function listVisibleCommunityPostComments(
    postId: string,
): Promise<VisibleCommunityPostComment[]> {
    const normalizedPostId = postId.trim();

    if (!normalizedPostId) {
        return [];
    }

    const storedComments = await db
        .select({
            id: communityPostComments.id,
            authorId: communityPostComments.authorId,
            authorName: users.name,
            authorImage: users.image,
            bodyMarkdown: communityPostComments.bodyMarkdown,
            diagnosisContextKey: communityPostComments.diagnosisContextKey,
            createdAt: communityPostComments.createdAt,
        })
        .from(communityPostComments)
        .innerJoin(users, eq(users.id, communityPostComments.authorId))
        .where(
            and(
                eq(communityPostComments.postId, normalizedPostId),
                eq(communityPostComments.status, 'visible'),
            ),
        )
        .orderBy(asc(communityPostComments.createdAt));

    return storedComments.map((comment) => ({
        id: comment.id,
        author: {
            id: comment.authorId,
            name: comment.authorName,
            image: comment.authorImage,
        },
        bodyMarkdown: comment.bodyMarkdown,
        diagnosisContextKey: comment.diagnosisContextKey,
        createdAt: comment.createdAt,
    }));
}
