import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityPostSaves } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const checkCommunityActionRateLimit = vi.fn();
    const trackCommunityProgressionForAction = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const saveValues = vi.fn();
    const onConflictDoNothing = vi.fn();
    const deleteFn = vi.fn();
    const deleteWhere = vi.fn();

    return {
        auth,
        checkCommunityActionRateLimit,
        trackCommunityProgressionForAction,
        select,
        from,
        where,
        limit,
        insert,
        saveValues,
        onConflictDoNothing,
        deleteFn,
        deleteWhere,
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
        delete: mocks.deleteFn,
    },
}));

import { setCommunityPostSave } from './community-saves';

describe('setCommunityPostSave', () => {
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
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityPostSaves) {
                return {
                    values: mocks.saveValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.saveValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.onConflictDoNothing.mockResolvedValue(undefined);

        mocks.deleteFn.mockReturnValue({
            where: mocks.deleteWhere,
        });
        mocks.deleteWhere.mockResolvedValue(undefined);
    });

    it('requires auth before mutating a private community post save', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: true,
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('creates a private save idempotently without exposing any public counter', async () => {
        mocks.limit.mockResolvedValueOnce([{
            authorId: 'author-1',
            id: 'post-1',
            status: 'published',
            visibility: 'public',
        }]);

        const result = await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: true,
        });

        expect(result).toEqual({
            success: true,
            postId: 'post-1',
            saved: true,
        });
        expect(result).not.toHaveProperty('saveCount');
        expect(mocks.saveValues).toHaveBeenCalledWith({
            postId: 'post-1',
            userId: 'user-1',
        });
        expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
            target: [communityPostSaves.postId, communityPostSaves.userId],
        });
        expect(mocks.deleteFn).not.toHaveBeenCalled();
        expect(mocks.trackCommunityProgressionForAction).toHaveBeenCalledWith({
            actorUserId: 'user-1',
            beneficiaryUserId: 'author-1',
            eventType: 'receive_unique_save',
            entityType: 'post',
            entityId: 'post-1',
            isPubliclyVisible: true,
            metadata: {
                sourceAuthorId: 'author-1',
                sourcePostId: 'post-1',
            },
        });
    });

    it('keeps the private save state stable when the same save request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                authorId: 'author-1',
                id: 'post-1',
                status: 'published',
                visibility: 'public',
            }])
            .mockResolvedValueOnce([{
                authorId: 'author-1',
                id: 'post-1',
                status: 'published',
                visibility: 'public',
            }]);

        await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: true,
        });
        const secondResult = await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: true,
        });

        expect(secondResult).toEqual({
            success: true,
            postId: 'post-1',
            saved: true,
        });
        expect(mocks.saveValues).toHaveBeenCalledTimes(2);
        expect(mocks.onConflictDoNothing).toHaveBeenCalledTimes(2);
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('keeps the private unsave state stable when the same unsave request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                authorId: 'author-1',
                id: 'post-1',
                status: 'published',
                visibility: 'public',
            }])
            .mockResolvedValueOnce([{
                authorId: 'author-1',
                id: 'post-1',
                status: 'published',
                visibility: 'public',
            }]);

        await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: false,
        });
        const secondResult = await setCommunityPostSave({
            slug: 'beryl-control-lab',
            saved: false,
        });

        expect(secondResult).toEqual({
            success: true,
            postId: 'post-1',
            saved: false,
        });
        expect(mocks.deleteWhere).toHaveBeenCalledTimes(2);
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.trackCommunityProgressionForAction).not.toHaveBeenCalled();
    });
});
