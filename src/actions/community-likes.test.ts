import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityPostLikes } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const likeValues = vi.fn();
    const onConflictDoNothing = vi.fn();
    const deleteFn = vi.fn();
    const deleteWhere = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        likeValues,
        onConflictDoNothing,
        deleteFn,
        deleteWhere,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.deleteFn,
    },
}));

import { setCommunityPostLike } from './community-likes';

describe('setCommunityPostLike', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityPostLikes) {
                return {
                    values: mocks.likeValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.likeValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.onConflictDoNothing.mockResolvedValue(undefined);

        mocks.deleteFn.mockReturnValue({
            where: mocks.deleteWhere,
        });
        mocks.deleteWhere.mockResolvedValue(undefined);
    });

    it('requires auth before mutating a community post like', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: true,
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('creates a like idempotently and respects the unique constraint', async () => {
        mocks.limit
            .mockResolvedValueOnce([{ id: 'post-1' }])
            .mockResolvedValueOnce([{ count: 1 }]);

        const result = await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: true,
        });

        expect(result).toEqual({
            success: true,
            postId: 'post-1',
            liked: true,
            likeCount: 1,
        });
        expect(mocks.likeValues).toHaveBeenCalledWith({
            postId: 'post-1',
            userId: 'user-1',
        });
        expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
            target: [communityPostLikes.postId, communityPostLikes.userId],
        });
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('keeps the like state stable when the same like request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([{ id: 'post-1' }])
            .mockResolvedValueOnce([{ count: 1 }])
            .mockResolvedValueOnce([{ id: 'post-1' }])
            .mockResolvedValueOnce([{ count: 1 }]);

        await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: true,
        });
        const secondResult = await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: true,
        });

        expect(secondResult).toEqual({
            success: true,
            postId: 'post-1',
            liked: true,
            likeCount: 1,
        });
        expect(mocks.likeValues).toHaveBeenCalledTimes(2);
        expect(mocks.onConflictDoNothing).toHaveBeenCalledTimes(2);
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('keeps the unlike state stable when the same unlike request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([{ id: 'post-1' }])
            .mockResolvedValueOnce([{ count: 0 }])
            .mockResolvedValueOnce([{ id: 'post-1' }])
            .mockResolvedValueOnce([{ count: 0 }]);

        await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: false,
        });
        const secondResult = await setCommunityPostLike({
            slug: 'beryl-control-lab',
            liked: false,
        });

        expect(secondResult).toEqual({
            success: true,
            postId: 'post-1',
            liked: false,
            likeCount: 0,
        });
        expect(mocks.deleteWhere).toHaveBeenCalledTimes(2);
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
