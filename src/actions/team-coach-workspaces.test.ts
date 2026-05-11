import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';

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
    readonly tableName: string;
    readonly values: Record<string, unknown>;
};

type UpdateCall = {
    readonly tableName: string;
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
            insertedValues.push({ tableName: getTableConfig(table as Parameters<typeof getTableConfig>[0]).name, values });

            return {
                returning: vi.fn(async () => insertReturningQueue.shift() ?? []),
            };
        }),
    };
}

function createUpdateChain(table: unknown) {
    return {
        set: vi.fn((values: Record<string, unknown>) => {
            updatedValues.push({ tableName: getTableConfig(table as Parameters<typeof getTableConfig>[0]).name, values });

            return {
                where: vi.fn(async () => []),
            };
        }),
    };
}

async function loadWorkspaceActions() {
    const modulePath = './team-coach-workspaces';

    let actions: typeof import('./team-coach-workspaces');
    try {
        actions = await import(modulePath);
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach workspace actions at src/actions/team-coach-workspaces.ts.',
                'Expected authenticated workspace create, archive, role, and seat-aware status actions.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof actions.createTeamCoachWorkspace).toBe('function');
    expect(typeof actions.archiveTeamCoachWorkspace).toBe('function');
    expect(typeof actions.changeTeamCoachMemberRole).toBe('function');
    expect(typeof actions.updateTeamCoachMemberStatus).toBe('function');

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
        create_workspace: true,
        manage_workspace: true,
        manage_seats: true,
    }));
    mocks.hasTeamCoachCapability.mockImplementation((resolvedPolicy: MockPolicy, capability: string) => (
        Boolean(resolvedPolicy.capabilities[capability])
    ));
    mocks.select.mockImplementation(() => createSelectChain());
    mocks.insert.mockImplementation((table: unknown) => createInsertChain(table));
    mocks.update.mockImplementation((table: unknown) => createUpdateChain(table));
});

describe('Team Coach workspace actions', () => {
    it('blocks anonymous or non-Team users before workspace persistence', async () => {
        const { createTeamCoachWorkspace } = await loadWorkspaceActions();

        mocks.auth.mockResolvedValueOnce(null);
        await expect(createTeamCoachWorkspace({ name: 'Mesa Alpha' })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/autenticado/i),
        });

        mocks.auth.mockResolvedValueOnce({ user: { id: 'free-user', role: 'user' } });
        mocks.resolveTeamCoachAccessForUser.mockResolvedValueOnce(policy(
            { create_workspace: false },
            { create_workspace: ['team_entitlement_missing'] },
        ));
        await expect(createTeamCoachWorkspace({ name: 'Mesa Free' })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/team|mesa|acesso/i),
            denialReason: 'team_entitlement_missing',
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('creates a private workspace, owner membership, and workspace audit event from server-owned Team access', async () => {
        insertReturningQueue.push([{ id: 'workspace-1', status: 'active', seatLimit: 8 }]);
        const { createTeamCoachWorkspace } = await loadWorkspaceActions();

        const result = await createTeamCoachWorkspace({
            name: ' Mesa Alpha ',
            description: '  Review semanal  ',
            seatLimit: 8,
        });

        expect(result).toMatchObject({
            success: true,
            workspaceId: 'workspace-1',
            seatLimit: 8,
            status: 'active',
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.workspace_created' }),
            ]),
        });
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_workspaces',
                values: expect.objectContaining({
                    ownerUserId: 'owner-1',
                    name: 'Mesa Alpha',
                    description: 'Review semanal',
                    status: 'active',
                    seatLimit: 8,
                }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_workspace_memberships',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    userId: 'owner-1',
                    role: 'owner',
                    status: 'active',
                    seatState: 'occupied',
                }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    actorUserId: 'owner-1',
                    eventType: 'workspace_created',
                }),
            }),
        ]));
    });

    it('archives only after reloading workspace membership and writes an audit event', async () => {
        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 8 }],
            [{ id: 'membership-1', workspaceId: 'workspace-1', userId: 'owner-1', role: 'owner', status: 'active' }],
        );
        const { archiveTeamCoachWorkspace } = await loadWorkspaceActions();

        const result = await archiveTeamCoachWorkspace({
            workspaceId: 'workspace-1',
        });

        expect(result).toMatchObject({
            success: true,
            workspaceId: 'workspace-1',
            status: 'archived',
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.workspace_archived' }),
            ]),
        });
        expect(mocks.resolveTeamCoachAccessForUser).toHaveBeenCalledWith('owner-1', 'user', expect.objectContaining({
            workspaceRole: 'owner',
            workspaceStatus: 'active',
            membershipStatus: 'active',
        }));
        expect(updatedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_workspaces',
                values: expect.objectContaining({
                    status: 'archived',
                    archivedAt: expect.any(Date),
                }),
            }),
        ]));
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    actorUserId: 'owner-1',
                    eventType: 'workspace_archived',
                }),
            }),
        ]));
    });

    it('keeps role and member-status changes owner gated and auditable', async () => {
        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 8 }],
            [{ id: 'membership-1', workspaceId: 'workspace-1', userId: 'owner-1', role: 'owner', status: 'active' }],
            [{ id: 'target-membership', workspaceId: 'workspace-1', userId: 'player-1', role: 'player', status: 'active' }],
        );
        const { changeTeamCoachMemberRole, updateTeamCoachMemberStatus } = await loadWorkspaceActions();

        await expect(changeTeamCoachMemberRole({
            workspaceId: 'workspace-1',
            targetUserId: 'player-1',
            role: 'analyst',
        })).resolves.toMatchObject({
            success: true,
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.role_changed' }),
            ]),
        });

        selectQueue.push(
            [{ id: 'workspace-1', ownerUserId: 'owner-1', status: 'active', seatLimit: 8 }],
            [{ id: 'membership-1', workspaceId: 'workspace-1', userId: 'owner-1', role: 'owner', status: 'active' }],
            [{ id: 'target-membership', workspaceId: 'workspace-1', userId: 'player-1', role: 'player', status: 'active' }],
        );
        await expect(updateTeamCoachMemberStatus({
            workspaceId: 'workspace-1',
            targetUserId: 'player-1',
            status: 'suspended',
        })).resolves.toMatchObject({
            success: true,
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.seat_changed' }),
            ]),
        });
        expect(updatedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_workspace_memberships',
                values: expect.objectContaining({ role: 'analyst' }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_workspace_memberships',
                values: expect.objectContaining({
                    status: 'suspended',
                    seatState: 'blocked',
                    suspendedAt: expect.any(Date),
                }),
            }),
        ]));
    });
});
