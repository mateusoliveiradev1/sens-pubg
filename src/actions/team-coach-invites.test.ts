import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    teamCoachAuditEvents,
    teamCoachSeatLedger,
    teamCoachWorkspaceInvites,
    teamCoachWorkspaceMemberships,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const resolveTeamCoachAccessForUser = vi.fn();
    const hasTeamCoachCapability = vi.fn();
    const select = vi.fn();
    const insert = vi.fn();
    const update = vi.fn();

    return {
        auth,
        resolveTeamCoachAccessForUser,
        hasTeamCoachCapability,
        select,
        insert,
        update,
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

vi.mock('@/lib/team-coach-access', () => ({
    resolveTeamCoachAccessForUser: mocks.resolveTeamCoachAccessForUser,
    hasTeamCoachCapability: mocks.hasTeamCoachCapability,
}));

type InsertCall = {
    readonly table: unknown;
    readonly values: Record<string, unknown>;
};

type UpdateCall = {
    readonly table: unknown;
    readonly values: Record<string, unknown>;
};

interface MockPolicy {
    readonly capabilities: Record<string, boolean>;
    readonly capabilityDenials?: Record<string, readonly string[]>;
}

let selectQueue: unknown[][];
let insertReturningQueue: unknown[][];
let insertedValues: InsertCall[];
let updatedValues: UpdateCall[];

const future = new Date('2026-05-18T12:00:00.000Z');

function policy(capabilities: Record<string, boolean>, denials: Record<string, readonly string[]> = {}): MockPolicy {
    return {
        capabilities,
        capabilityDenials: denials,
    };
}

function createSelectChain() {
    return {
        from: vi.fn(() => ({
            where: vi.fn(() => ({
                limit: vi.fn(async () => selectQueue.shift() ?? []),
            })),
        })),
    };
}

function createInsertChain(table: unknown) {
    return {
        values: vi.fn((values: Record<string, unknown>) => {
            insertedValues.push({ table, values });

            return {
                returning: vi.fn(async () => insertReturningQueue.shift() ?? []),
            };
        }),
    };
}

function createUpdateChain(table: unknown) {
    return {
        set: vi.fn((values: Record<string, unknown>) => {
            updatedValues.push({ table, values });

            return {
                where: vi.fn(async () => []),
            };
        }),
    };
}

async function loadInviteActions() {
    const modulePath = './team-coach-invites';

    let actions: typeof import('./team-coach-invites');
    try {
        actions = await import(modulePath);
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach invite actions at src/actions/team-coach-invites.ts.',
                'Expected invite create, accept, revoke, and expire actions with seat and audit behavior.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof actions.createTeamCoachInvite).toBe('function');
    expect(typeof actions.acceptTeamCoachInvite).toBe('function');
    expect(typeof actions.revokeTeamCoachInvite).toBe('function');
    expect(typeof actions.expireTeamCoachInvite).toBe('function');

    return actions;
}

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectQueue = [];
    insertReturningQueue = [];
    insertedValues = [];
    updatedValues = [];

    mocks.auth.mockResolvedValue({
        user: {
            id: 'owner-1',
            role: 'user',
        },
    });
    mocks.resolveTeamCoachAccessForUser.mockResolvedValue(policy({
        invite_member: true,
        accept_invite: true,
        manage_workspace: true,
    }));
    mocks.hasTeamCoachCapability.mockImplementation((resolvedPolicy: MockPolicy, capability: string) => (
        Boolean(resolvedPolicy.capabilities[capability])
    ));
    mocks.select.mockImplementation(() => createSelectChain());
    mocks.insert.mockImplementation((table: unknown) => createInsertChain(table));
    mocks.update.mockImplementation((table: unknown) => createUpdateChain(table));
});

describe('Team Coach invite actions', () => {
    it('creates high-entropy player invites only after reloading workspace, role, and persisted seat state', async () => {
        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 3 }],
            [{ id: 'membership-owner', userId: 'owner-1', role: 'owner', status: 'active' }],
            [{ userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' }],
            [],
        );
        insertReturningQueue.push([{ id: 'invite-1', workspaceId: 'workspace-1', expiresAt: future }]);
        const { createTeamCoachInvite } = await loadInviteActions();

        const result = await createTeamCoachInvite({
            workspaceId: 'workspace-1',
            invitedEmail: ' Player@Example.COM ',
            intendedRole: 'player',
            now: '2026-05-11T12:00:00.000Z',
        });

        expect(result).toMatchObject({
            success: true,
            inviteId: 'invite-1',
            workspaceId: 'workspace-1',
            inviteCode: expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/),
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.invite_created' }),
                expect.objectContaining({ type: 'team_coach.seat_changed' }),
            ]),
        });
        expect(mocks.resolveTeamCoachAccessForUser).toHaveBeenCalledWith('owner-1', 'user', expect.objectContaining({
            workspaceRole: 'owner',
            workspaceStatus: 'active',
            membershipStatus: 'active',
        }));
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                table: teamCoachWorkspaceInvites,
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    createdByUserId: 'owner-1',
                    invitedEmail: 'player@example.com',
                    intendedRole: 'player',
                    status: 'pending',
                    inviteCode: expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/),
                }),
            }),
            expect.objectContaining({
                table: teamCoachSeatLedger,
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    eventType: 'seat_reserved',
                    invitedSeats: 1,
                    occupiedSeats: 1,
                    seatLimit: 3,
                }),
            }),
            expect.objectContaining({
                table: teamCoachAuditEvents,
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    eventType: 'invite_created',
                }),
            }),
        ]));
    });

    it('denies invite creation with stable seat_limit_reached from server-owned rows before writing', async () => {
        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 2 }],
            [{ id: 'membership-owner', userId: 'owner-1', role: 'owner', status: 'active' }],
            [
                { userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' },
                { userId: 'player-2', role: 'player', status: 'active', seatState: 'occupied' },
            ],
            [],
        );
        const { createTeamCoachInvite } = await loadInviteActions();

        await expect(createTeamCoachInvite({
            workspaceId: 'workspace-1',
            invitedUserId: 'player-3',
            intendedRole: 'player',
        })).resolves.toMatchObject({
            success: false,
            denialReason: 'seat_limit_reached',
            error: expect.stringMatching(/vaga|limite|seat/i),
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('keeps coaches and analysts from managing seats unless the server role policy allows it', async () => {
        mocks.resolveTeamCoachAccessForUser.mockResolvedValueOnce(policy(
            { invite_member: false },
            { invite_member: ['role_blocked'] },
        ));
        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 3 }],
            [{ id: 'membership-coach', userId: 'owner-1', role: 'coach', status: 'active' }],
        );
        const { createTeamCoachInvite } = await loadInviteActions();

        await expect(createTeamCoachInvite({
            workspaceId: 'workspace-1',
            invitedEmail: 'player@example.com',
            intendedRole: 'player',
        })).resolves.toMatchObject({
            success: false,
            denialReason: 'role_blocked',
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('accepts an invite only after reloading invite, workspace, membership, access, and seat state', async () => {
        mocks.auth.mockResolvedValueOnce({ user: { id: 'player-3', role: 'user' } });
        selectQueue.push(
            [{
                id: 'invite-1',
                workspaceId: 'workspace-1',
                invitedUserId: 'player-3',
                intendedRole: 'player',
                status: 'pending',
                expiresAt: future,
            }],
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 3 }],
            [],
            [
                { userId: 'player-1', role: 'player', status: 'active', seatState: 'occupied' },
            ],
            [],
        );
        insertReturningQueue.push([{ id: 'membership-player-3' }]);
        const { acceptTeamCoachInvite } = await loadInviteActions();

        const result = await acceptTeamCoachInvite({
            inviteCode: 'INVITE_TOKEN',
            now: '2026-05-11T12:00:00.000Z',
        });

        expect(result).toMatchObject({
            success: true,
            workspaceId: 'workspace-1',
            role: 'player',
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.invite_accepted' }),
                expect.objectContaining({ type: 'team_coach.seat_changed' }),
            ]),
        });
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                table: teamCoachWorkspaceMemberships,
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    userId: 'player-3',
                    role: 'player',
                    status: 'active',
                    seatState: 'occupied',
                }),
            }),
            expect.objectContaining({
                table: teamCoachSeatLedger,
                values: expect.objectContaining({
                    eventType: 'seat_occupied',
                    occupiedSeats: 2,
                }),
            }),
        ]));
        expect(updatedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                table: teamCoachWorkspaceInvites,
                values: expect.objectContaining({
                    status: 'accepted',
                    acceptedByUserId: 'player-3',
                }),
            }),
        ]));
    });

    it('revokes and expires invites with audit evidence instead of deleting rows', async () => {
        selectQueue.push(
            [{ id: 'invite-1', workspaceId: 'workspace-1', invitedUserId: 'player-3', intendedRole: 'player', status: 'pending', expiresAt: future }],
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 3 }],
            [{ id: 'membership-owner', userId: 'owner-1', role: 'owner', status: 'active' }],
        );
        const { revokeTeamCoachInvite, expireTeamCoachInvite } = await loadInviteActions();

        await expect(revokeTeamCoachInvite({
            workspaceId: 'workspace-1',
            inviteId: 'invite-1',
        })).resolves.toMatchObject({
            success: true,
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.invite_revoked' }),
            ]),
        });

        selectQueue.push([{ id: 'invite-2', workspaceId: 'workspace-1', status: 'pending' }]);
        await expect(expireTeamCoachInvite({
            inviteId: 'invite-2',
            now: '2026-05-11T12:00:00.000Z',
        })).resolves.toMatchObject({
            success: true,
            status: 'expired',
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.invite_expired' }),
            ]),
        });

        expect(updatedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                table: teamCoachWorkspaceInvites,
                values: expect.objectContaining({ status: 'revoked' }),
            }),
            expect.objectContaining({
                table: teamCoachWorkspaceInvites,
                values: expect.objectContaining({ status: 'expired' }),
            }),
        ]));
    });
});
