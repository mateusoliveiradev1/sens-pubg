import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    communitySquadInvites,
    communitySquadMemberships,
    communitySquads,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const squadValues = vi.fn();
    const membershipValues = vi.fn();
    const inviteValues = vi.fn();
    const returning = vi.fn();
    const update = vi.fn();
    const set = vi.fn();
    const updateWhere = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        squadValues,
        membershipValues,
        inviteValues,
        returning,
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
        insert: mocks.insert,
        update: mocks.update,
    },
}));

import {
    acceptCommunitySquadInvite,
    createCommunitySquad,
    leaveCommunitySquad,
    setCommunitySquadMembershipVisibility,
} from './community-squads';

const futureInviteExpiry = (): Date => new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

describe('community squad actions', () => {
    beforeEach(() => {
        vi.resetAllMocks();

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
            if (table === communitySquads) {
                return {
                    values: mocks.squadValues,
                };
            }

            if (table === communitySquadMemberships) {
                return {
                    values: mocks.membershipValues,
                };
            }

            if (table === communitySquadInvites) {
                return {
                    values: mocks.inviteValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.squadValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([]);
        mocks.membershipValues.mockResolvedValue(undefined);
        mocks.inviteValues.mockReturnValue({
            returning: mocks.returning,
        });

        mocks.update.mockReturnValue({
            set: mocks.set,
        });
        mocks.set.mockReturnValue({
            where: mocks.updateWhere,
        });
        mocks.updateWhere.mockResolvedValue(undefined);
    });

    it('creates a squad with the owner membership and a default shared goal', async () => {
        mocks.returning.mockResolvedValueOnce([
            {
                id: 'squad-1',
                slug: 'alpha-spray-user1',
                visibility: 'private',
                memberLimit: 4,
                activeGoal: {
                    goalKey: 'weekly-squad-rhythm:2026-04-20T00:00:00.000Z',
                    title: 'Ritmo semanal do squad',
                    description: 'Goal copy',
                    targetCount: 3,
                    currentCount: 0,
                    eligibleEventTypes: ['publish_post', 'comment_with_context'],
                    windowStartedAt: '2026-04-20T00:00:00.000Z',
                    windowEndsAt: '2026-04-26T23:59:59.999Z',
                },
            },
        ]);

        const result = await createCommunitySquad({
            name: 'Alpha Spray',
        });

        expect(result).toMatchObject({
            success: true,
            squadId: 'squad-1',
            slug: 'alpha-spray-user1',
            visibility: 'private',
            memberLimit: 4,
            activeGoal: {
                currentCount: 0,
                targetCount: 3,
            },
        });
        expect(mocks.squadValues).toHaveBeenCalledWith(expect.objectContaining({
            ownerUserId: 'user-1',
            name: 'Alpha Spray',
            visibility: 'private',
            memberLimit: 4,
            activeGoal: expect.objectContaining({
                currentCount: 0,
                eligibleEventTypes: ['publish_post', 'comment_with_context'],
            }),
        }));
        expect(mocks.membershipValues).toHaveBeenCalledWith({
            squadId: 'squad-1',
            userId: 'user-1',
            role: 'owner',
            status: 'active',
            isPubliclyVisible: true,
            joinedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        });
    });

    it('rejects an invalid invite before creating any membership', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await acceptCommunitySquadInvite({
            inviteCode: 'missing-code',
        });

        expect(result).toEqual({
            success: false,
            error: 'Convite invalido.',
        });
        expect(mocks.membershipValues).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('blocks invite acceptance when the squad member limit is already reached', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    id: 'invite-1',
                    squadId: 'squad-1',
                    invitedUserId: null,
                    status: 'pending',
                    expiresAt: futureInviteExpiry(),
                    inviteCode: 'invite-code-1',
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'squad-1',
                    ownerUserId: 'owner-1',
                    slug: 'alpha-spray-owner1',
                    visibility: 'private',
                    status: 'active',
                    memberLimit: 4,
                    activeGoal: null,
                },
            ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ count: 4 }]);

        const result = await acceptCommunitySquadInvite({
            inviteCode: 'invite-code-1',
        });

        expect(result).toEqual({
            success: false,
            error: 'Squad cheio. Aguarde uma vaga ou solicite outro convite.',
        });
        expect(mocks.membershipValues).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('accepts a valid invite, creates the membership, and marks the invite as accepted', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    id: 'invite-1',
                    squadId: 'squad-1',
                    invitedUserId: null,
                    status: 'pending',
                    expiresAt: futureInviteExpiry(),
                    inviteCode: 'invite-code-1',
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'squad-1',
                    ownerUserId: 'owner-1',
                    slug: 'alpha-spray-owner1',
                    visibility: 'private',
                    status: 'active',
                    memberLimit: 4,
                    activeGoal: {
                        goalKey: 'weekly-squad-rhythm:2026-04-20T00:00:00.000Z',
                        title: 'Ritmo semanal do squad',
                        description: 'Goal copy',
                        targetCount: 3,
                        currentCount: 0,
                        eligibleEventTypes: ['publish_post', 'comment_with_context'],
                    },
                },
            ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ count: 1 }]);

        const result = await acceptCommunitySquadInvite({
            inviteCode: 'invite-code-1',
        });

        expect(result).toEqual({
            success: true,
            squadId: 'squad-1',
            membershipVisibility: true,
            activeGoal: {
                goalKey: 'weekly-squad-rhythm:2026-04-20T00:00:00.000Z',
                title: 'Ritmo semanal do squad',
                description: 'Goal copy',
                targetCount: 3,
                currentCount: 0,
                eligibleEventTypes: ['publish_post', 'comment_with_context'],
            },
        });
        expect(mocks.membershipValues).toHaveBeenCalledWith({
            squadId: 'squad-1',
            userId: 'user-1',
            role: 'member',
            status: 'active',
            isPubliclyVisible: true,
            joinedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        });
        expect(mocks.update).toHaveBeenCalledWith(communitySquadInvites);
        expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({
            status: 'accepted',
            acceptedByUserId: 'user-1',
            acceptedAt: expect.any(Date),
        }));
    });

    it('lets the last owner leave by archiving the squad and marking the membership as left', async () => {
        mocks.limit
            .mockResolvedValueOnce([
                {
                    squadId: 'squad-1',
                    userId: 'user-1',
                    role: 'owner',
                    status: 'active',
                    isPubliclyVisible: true,
                },
            ])
            .mockResolvedValueOnce([{ count: 1 }]);

        const result = await leaveCommunitySquad({
            squadId: 'squad-1',
        });

        expect(result).toEqual({
            success: true,
            squadId: 'squad-1',
            archivedSquad: true,
        });
        expect(mocks.update).toHaveBeenNthCalledWith(1, communitySquadMemberships);
        expect(mocks.set).toHaveBeenNthCalledWith(1, expect.objectContaining({
            status: 'left',
            leftAt: expect.any(Date),
        }));
        expect(mocks.update).toHaveBeenNthCalledWith(2, communitySquads);
        expect(mocks.set).toHaveBeenNthCalledWith(2, expect.objectContaining({
            status: 'archived',
        }));
    });

    it('updates membership visibility for active members only', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                squadId: 'squad-1',
                userId: 'user-1',
                role: 'member',
                status: 'active',
                isPubliclyVisible: true,
            },
        ]);

        const result = await setCommunitySquadMembershipVisibility({
            squadId: 'squad-1',
            isPubliclyVisible: false,
        });

        expect(result).toEqual({
            success: true,
            squadId: 'squad-1',
            isPubliclyVisible: false,
        });
        expect(mocks.update).toHaveBeenCalledWith(communitySquadMemberships);
        expect(mocks.set).toHaveBeenCalledWith({
            isPubliclyVisible: false,
            updatedAt: expect.any(Date),
        });
    });
});
