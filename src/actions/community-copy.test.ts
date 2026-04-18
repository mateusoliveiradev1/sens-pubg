import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityPostCopyEvents } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const copyEventValues = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        copyEventValues,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
    },
}));

import { copyCommunityPostSens } from './community-copy';

function createPersistedCopySensPreset() {
    return {
        profiles: [
            {
                type: 'low',
                label: 'Low',
                description: 'Low control preset',
                general: 43,
                ads: 39,
                scopes: [
                    {
                        scopeName: '1x',
                        current: 40,
                        recommended: 38,
                        changePercent: -5,
                    },
                ],
                cmPer360: 47,
            },
            {
                type: 'balanced',
                label: 'Balanced',
                description: 'Balanced control preset',
                general: 50,
                ads: 47,
                scopes: [
                    {
                        scopeName: '1x',
                        current: 48,
                        recommended: 46,
                        changePercent: -4.16,
                    },
                    {
                        scopeName: '3x',
                        current: 41,
                        recommended: 39,
                        changePercent: -4.87,
                    },
                ],
                cmPer360: 41,
            },
            {
                type: 'high',
                label: 'High',
                description: 'High speed preset',
                general: 57,
                ads: 54,
                scopes: [
                    {
                        scopeName: '1x',
                        current: 52,
                        recommended: 51,
                        changePercent: -1.92,
                    },
                ],
                cmPer360: 35,
            },
        ] as const,
        recommended: 'balanced',
        tier: 'apply_ready',
        evidenceTier: 'strong',
        confidenceScore: 0.84,
        reasoning: 'Snapshot recommendation',
        suggestedVSM: 1.02,
    };
}

describe('copyCommunityPostSens', () => {
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
            if (table === communityPostCopyEvents) {
                return {
                    values: mocks.copyEventValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.copyEventValues.mockResolvedValue(undefined);
    });

    it('returns clipboard payload from persisted post copySensPreset and logs the copy event', async () => {
        const copySensPreset = createPersistedCopySensPreset();
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'post-1',
                slug: 'player-one-session-1',
                copySensPreset,
            },
        ]);

        const result = await copyCommunityPostSens({
            slug: 'player-one-session-1',
            target: 'clipboard',
        });

        expect(result).toEqual({
            success: true,
            postId: 'post-1',
            copyTarget: 'clipboard',
            copySensPreset,
            clipboardText: expect.stringContaining('Balanced'),
        });
        expect(result).toMatchObject({
            clipboardText: expect.stringContaining('General: 50'),
        });
        expect(result).toMatchObject({
            clipboardText: expect.stringContaining('ADS: 47'),
        });
        expect(result).toMatchObject({
            clipboardText: expect.stringContaining('1x: 46'),
        });
        expect(result).toMatchObject({
            clipboardText: expect.stringContaining('3x: 39'),
        });
        expect(result).toMatchObject({
            clipboardText: expect.stringContaining('Suggested VSM: 1.02'),
        });
        expect(mocks.copyEventValues).toHaveBeenCalledWith({
            postId: 'post-1',
            copiedByUserId: 'user-1',
            copyTarget: 'clipboard',
        });
    });

    it('allows anonymous copy by logging the event with copiedByUserId as null', async () => {
        mocks.auth.mockResolvedValue(null);
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'post-2',
                slug: 'public-post',
                copySensPreset: createPersistedCopySensPreset(),
            },
        ]);

        const result = await copyCommunityPostSens({
            slug: 'public-post',
            target: 'clipboard',
        });

        expect(result).toEqual(expect.objectContaining({
            success: true,
            postId: 'post-2',
            copyTarget: 'clipboard',
        }));
        expect(mocks.copyEventValues).toHaveBeenCalledWith({
            postId: 'post-2',
            copiedByUserId: null,
            copyTarget: 'clipboard',
        });
    });
});
