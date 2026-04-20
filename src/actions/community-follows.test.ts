import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityFollows } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const checkCommunityActionRateLimit = vi.fn();
    const trackCommunityProgressionForAction = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const followValues = vi.fn();
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
        followValues,
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

import {
    getCommunityProfileFollowState,
    setCommunityProfileFollow,
} from './community-follows';

describe('setCommunityProfileFollow', () => {
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
            if (table === communityFollows) {
                return {
                    values: mocks.followValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.followValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.onConflictDoNothing.mockResolvedValue(undefined);

        mocks.deleteFn.mockReturnValue({
            where: mocks.deleteWhere,
        });
        mocks.deleteWhere.mockResolvedValue(undefined);
    });

    it('requires auth before mutating a community follow', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: true,
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('rejects self-follow even when the profile slug exists', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                profileId: 'profile-1',
                userId: 'user-1',
            },
        ]);

        const result = await setCommunityProfileFollow({
            slug: 'self-profile',
            following: true,
        });

        expect(result).toEqual({
            success: false,
            error: 'Voce nao pode seguir o proprio perfil.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('creates a follow idempotently and returns followerCount for future counters', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 5 }]);

        const result = await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: true,
        });

        expect(result).toEqual({
            success: true,
            followedUserId: 'user-2',
            following: true,
            followerCount: 5,
        });
        expect(mocks.followValues).toHaveBeenCalledWith({
            followerUserId: 'user-1',
            followedUserId: 'user-2',
        });
        expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
            target: [communityFollows.followerUserId, communityFollows.followedUserId],
        });
        expect(mocks.deleteFn).not.toHaveBeenCalled();
        expect(mocks.trackCommunityProgressionForAction).toHaveBeenCalledWith({
            actorUserId: 'user-1',
            eventType: 'follow_profile',
            entityType: 'profile',
            entityId: 'profile-2',
            isPubliclyVisible: true,
            metadata: {
                followedUserId: 'user-2',
            },
        });
    });

    it('keeps the follow state stable when the same follow request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 5 }])
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 5 }]);

        await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: true,
        });
        const secondResult = await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: true,
        });

        expect(secondResult).toEqual({
            success: true,
            followedUserId: 'user-2',
            following: true,
            followerCount: 5,
        });
        expect(mocks.followValues).toHaveBeenCalledTimes(2);
        expect(mocks.onConflictDoNothing).toHaveBeenCalledTimes(2);
        expect(mocks.deleteFn).not.toHaveBeenCalled();
    });

    it('keeps the unfollow state stable when the same unfollow request is sent twice', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 4 }])
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 4 }]);

        await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: false,
        });
        const secondResult = await setCommunityProfileFollow({
            slug: 'spray-doctor',
            following: false,
        });

        expect(secondResult).toEqual({
            success: true,
            followedUserId: 'user-2',
            following: false,
            followerCount: 4,
        });
        expect(mocks.deleteWhere).toHaveBeenCalledTimes(2);
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.trackCommunityProgressionForAction).not.toHaveBeenCalled();
    });
});

describe('getCommunityProfileFollowState', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });
    });

    it('returns followerCount for the public profile even when the viewer is anonymous', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 8 }]);

        const result = await getCommunityProfileFollowState({
            slug: 'spray-doctor',
            viewerUserId: null,
        });

        expect(result).toEqual({
            followerCount: 8,
            viewerIsFollowing: false,
            canFollow: true,
        });
    });

    it('marks the owner profile as non-followable while keeping followerCount available', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-1',
                    userId: 'user-1',
                },
            ])
            .mockResolvedValueOnce([{ count: 3 }]);

        const result = await getCommunityProfileFollowState({
            slug: 'self-profile',
            viewerUserId: 'user-1',
        });

        expect(result).toEqual({
            followerCount: 3,
            viewerIsFollowing: false,
            canFollow: false,
        });
    });

    it('returns viewerIsFollowing when the logged user already follows the author', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    profileId: 'profile-2',
                    userId: 'user-2',
                },
            ])
            .mockResolvedValueOnce([{ count: 9 }])
            .mockResolvedValueOnce([
                {
                    followerUserId: 'user-1',
                },
            ]);

        const result = await getCommunityProfileFollowState({
            slug: 'spray-doctor',
            viewerUserId: 'user-1',
        });

        expect(result).toEqual({
            followerCount: 9,
            viewerIsFollowing: true,
            canFollow: true,
        });
    });
});
