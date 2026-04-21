import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityPostComments } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const checkCommunityActionRateLimit = vi.fn();
    const trackCommunityProgressionForAction = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const innerJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const commentValues = vi.fn();
    const commentReturning = vi.fn();
    const revalidatePath = vi.fn();

    return {
        auth,
        checkCommunityActionRateLimit,
        trackCommunityProgressionForAction,
        select,
        from,
        innerJoin,
        where,
        limit,
        orderBy,
        insert,
        commentValues,
        commentReturning,
        revalidatePath,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/rate-limit', () => ({
    checkCommunityActionRateLimit: mocks.checkCommunityActionRateLimit,
}));

vi.mock('@/lib/community-progression-recorder', () => ({
    trackCommunityProgressionForAction: mocks.trackCommunityProgressionForAction,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

import {
    createCommunityPostComment,
    listVisibleCommunityPostComments,
} from './community-comments';

describe('community comments', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.checkCommunityActionRateLimit.mockReturnValue({
            success: true,
            remaining: 2,
            resetMs: 1000,
        });
        mocks.trackCommunityProgressionForAction.mockResolvedValue(undefined);

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            innerJoin: mocks.innerJoin,
            where: mocks.where,
        });

        mocks.innerJoin.mockReturnValue({
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityPostComments) {
                return {
                    values: mocks.commentValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.commentValues.mockReturnValue({
            returning: mocks.commentReturning,
        });
        mocks.commentReturning.mockResolvedValue([
            {
                id: 'comment-1',
            },
        ]);
    });

    it('requires auth before creating a flat community comment', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await createCommunityPostComment({
            slug: 'beryl-control-lab',
            bodyMarkdown: 'Primeiro comentario tecnico.',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('creates a visible comment on a published public post and persists diagnosisContextKey when provided', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'post-1',
                authorId: 'user-2',
                status: 'published',
                visibility: 'public',
            },
        ]);

        const result = await createCommunityPostComment({
            slug: 'beryl-control-lab',
            bodyMarkdown: 'Fechei melhor o tracking no bloco final.',
            diagnosisContextKey: 'horizontal_drift',
        });

        expect(result).toEqual({
            success: true,
            postId: 'post-1',
        });
        expect(mocks.commentValues).toHaveBeenCalledWith({
            postId: 'post-1',
            authorId: 'user-1',
            status: 'visible',
            bodyMarkdown: 'Fechei melhor o tracking no bloco final.',
            diagnosisContextKey: 'horizontal_drift',
        });
        expect(mocks.trackCommunityProgressionForAction).toHaveBeenCalledWith({
            actorUserId: 'user-1',
            eventType: 'comment_with_context',
            entityType: 'comment',
            entityId: 'post-1',
            dedupeKey: 'comment-1',
            hasRequiredContext: true,
            isPubliclyVisible: true,
            metadata: {
                diagnosisContextKey: 'horizontal_drift',
                sourcePostAuthorId: 'user-2',
                sourceCommentId: 'comment-1',
                sourcePostId: 'post-1',
            },
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/community/beryl-control-lab');
    });

    it('rejects comment creation when the target post is not publicly published yet', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'post-1',
                authorId: 'user-2',
                status: 'draft',
                visibility: 'public',
            },
        ]);

        const result = await createCommunityPostComment({
            slug: 'beryl-control-lab',
            bodyMarkdown: 'Ainda nao deveria ser possivel comentar.',
        });

        expect(result).toEqual({
            success: false,
            error: 'Post indisponivel para comentario.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.trackCommunityProgressionForAction).not.toHaveBeenCalled();
    });

    it('lists visible comments in chronological order and keeps diagnosisContextKey optional', async () => {
        const firstCreatedAt = new Date('2026-04-19T13:00:00.000Z');
        const secondCreatedAt = new Date('2026-04-19T13:05:00.000Z');

        mocks.orderBy.mockResolvedValueOnce([
            {
                id: 'comment-1',
                authorId: 'user-1',
                authorName: 'Coach Ace',
                authorImage: null,
                bodyMarkdown: 'Primeiro comentario visivel.',
                diagnosisContextKey: null,
                createdAt: firstCreatedAt,
            },
            {
                id: 'comment-2',
                authorId: 'user-2',
                authorName: 'Coach B',
                authorImage: 'https://example.com/coach-b.png',
                bodyMarkdown: 'Segundo comentario vinculado ao diagnostico.',
                diagnosisContextKey: 'horizontal_drift',
                createdAt: secondCreatedAt,
            },
        ]);

        const result = await listVisibleCommunityPostComments('post-1');

        expect(result).toEqual([
            {
                id: 'comment-1',
                author: {
                    id: 'user-1',
                    name: 'Coach Ace',
                    image: null,
                },
                bodyMarkdown: 'Primeiro comentario visivel.',
                diagnosisContextKey: null,
                createdAt: firstCreatedAt,
            },
            {
                id: 'comment-2',
                author: {
                    id: 'user-2',
                    name: 'Coach B',
                    image: 'https://example.com/coach-b.png',
                },
                bodyMarkdown: 'Segundo comentario vinculado ao diagnostico.',
                diagnosisContextKey: 'horizontal_drift',
                createdAt: secondCreatedAt,
            },
        ]);
    });
});
