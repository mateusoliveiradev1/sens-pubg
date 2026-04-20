import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    communityRewardRecords,
    communitySquads,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const update = vi.fn();
    const set = vi.fn();
    const updateWhere = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        update,
        set,
        updateWhere,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        update: mocks.update,
    },
}));

import { setCommunityRewardDisplayState } from './community-rewards';

describe('setCommunityRewardDisplayState', () => {
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

        mocks.update.mockReturnValue({
            set: mocks.set,
        });
        mocks.set.mockReturnValue({
            where: mocks.updateWhere,
        });
        mocks.updateWhere.mockResolvedValue(undefined);
    });

    it('lets the owner equip a public-safe reward and demotes sibling equipped rewards of the same kind', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'reward-1',
                ownerType: 'user',
                rewardKind: 'title',
                status: 'earned',
                displayState: 'visible',
                isPublicSafe: true,
                userId: 'user-1',
                squadId: null,
            },
        ]);

        const result = await setCommunityRewardDisplayState({
            rewardId: 'reward-1',
            displayState: 'equipped',
        });

        expect(result).toEqual({
            success: true,
            rewardId: 'reward-1',
            displayState: 'equipped',
        });
        expect(mocks.update).toHaveBeenNthCalledWith(1, communityRewardRecords);
        expect(mocks.set).toHaveBeenNthCalledWith(1, {
            displayState: 'visible',
        });
        expect(mocks.update).toHaveBeenNthCalledWith(2, communityRewardRecords);
        expect(mocks.set).toHaveBeenNthCalledWith(2, {
            displayState: 'equipped',
        });
    });

    it('blocks squad reward changes when the viewer is not the squad owner', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    id: 'reward-squad-1',
                    ownerType: 'squad',
                    rewardKind: 'squad_mark',
                    status: 'earned',
                    displayState: 'visible',
                    isPublicSafe: true,
                    userId: null,
                    squadId: 'squad-1',
                },
            ])
            .mockResolvedValueOnce([
                {
                    ownerUserId: 'owner-2',
                },
            ]);

        const result = await setCommunityRewardDisplayState({
            rewardId: 'reward-squad-1',
            displayState: 'visible',
        });

        expect(result).toEqual({
            success: false,
            error: 'Apenas o owner do squad pode alterar este reward.',
        });
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.from).toHaveBeenLastCalledWith(communitySquads);
    });
});
