import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const revalidatePath = vi.fn();
    const resolveTeamCoachAccessForUser = vi.fn();
    const hasTeamCoachCapability = vi.fn();
    const select = vi.fn();
    const insert = vi.fn();
    const update = vi.fn();

    return {
        auth,
        revalidatePath,
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

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
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

interface MockPolicy {
    readonly capabilities: Record<string, boolean>;
    readonly capabilityDenials?: Record<string, readonly string[]>;
}

let selectQueue: unknown[][];
let insertReturningQueue: unknown[][];
let insertedValues: InsertCall[];

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
            insertedValues.push({
                tableName: getTableConfig(table as Parameters<typeof getTableConfig>[0]).name,
                values,
            });

            return {
                returning: vi.fn(async () => insertReturningQueue.shift() ?? []),
            };
        }),
    };
}

async function loadTeamCoachReviewActions() {
    const modulePath = './team-coach-review';

    let actions: typeof import('./team-coach-review');
    try {
        actions = await import(modulePath);
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach review actions at src/actions/team-coach-review.ts.',
                'Expected create note, update review status, and next-action request server actions.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof actions.createTeamCoachReviewNote).toBe('function');
    expect(typeof actions.updateTeamCoachReviewStatus).toBe('function');
    expect(typeof actions.requestTeamCoachNextAction).toBe('function');

    return actions;
}

const workspaceRow = {
    id: 'workspace-1',
    ownerUserId: 'owner-1',
    status: 'active',
    seatLimit: 8,
};

const coachMembership = {
    id: 'membership-coach',
    workspaceId: 'workspace-1',
    userId: 'coach-1',
    role: 'coach',
    status: 'active',
};

const activeShare = {
    id: 'share-1',
    workspaceId: 'workspace-1',
    playerUserId: 'player-1',
    sharedByUserId: 'player-1',
    consentStatus: 'granted',
    consentScopes: ['analysis_summary', 'review_packet', 'coach_notes'],
    shareStatus: 'active',
    teamSafeSnapshot: {
        id: 'share-1',
        honesty: {
            confidence: 0.72,
            coverage: 0.66,
            blockers: ['validation_pending'],
            inconclusiveState: false,
            limitedSupport: [],
            validationState: 'pending',
            noOverclaimDisclaimer: 'Evidence review only.',
        },
        sourceSummary: {
            analysisSessionId: 'analysis-1',
            playerLabel: 'Player Alpha',
        },
    },
    sourceAnalysisSessionId: 'analysis-1',
    sourceHistorySessionId: null,
    sourceProtocolRevisionId: null,
    sourceSprayLabSessionId: null,
    sourceTrainingProgramCycleId: null,
    sourceValidationLinkId: null,
};

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectQueue = [];
    insertReturningQueue = [];
    insertedValues = [];

    mocks.auth.mockResolvedValue({
        user: {
            id: 'coach-1',
            role: 'user',
        },
    });
    mocks.resolveTeamCoachAccessForUser.mockResolvedValue(policy({
        write_coach_note: true,
        update_review_status: true,
    }));
    mocks.hasTeamCoachCapability.mockImplementation((resolvedPolicy: MockPolicy, capability: string) => (
        Boolean(resolvedPolicy.capabilities[capability])
    ));
    mocks.select.mockImplementation(() => createSelectChain());
    mocks.insert.mockImplementation((table: unknown) => createInsertChain(table));
});

describe('Team Coach review actions', () => {
    it('blocks note creation when Team role, membership, consent, or share access denies the capability', async () => {
        selectQueue.push([activeShare], [workspaceRow], [coachMembership]);
        mocks.resolveTeamCoachAccessForUser.mockResolvedValueOnce(policy(
            { write_coach_note: false },
            { write_coach_note: ['role_blocked'] },
        ));
        const { createTeamCoachReviewNote } = await loadTeamCoachReviewActions();

        const result = await createTeamCoachReviewNote({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            note: 'Review blocked.',
        });

        expect(result).toMatchObject({
            success: false,
            denialReason: 'role_blocked',
        });
        expect(insertedValues).toHaveLength(0);
    });

    it('creates private coach notes with next-action context and persisted audit without mutating analysis truth', async () => {
        selectQueue.push([activeShare], [workspaceRow], [coachMembership]);
        insertReturningQueue.push([{ id: 'note-1' }]);
        const { createTeamCoachReviewNote } = await loadTeamCoachReviewActions();

        const result = await createTeamCoachReviewNote({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            note: 'Gravar validacao compativel antes de mudar sens.',
            requestedNextAction: 'request_validation',
        });

        expect(result).toMatchObject({
            success: true,
            note: {
                id: 'note-1',
                requestedNextAction: 'request_validation',
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.review_note_created' }),
            ]),
        });
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_review_notes',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    shareId: 'share-1',
                    authorUserId: 'coach-1',
                    playerUserId: 'player-1',
                    note: 'Gravar validacao compativel antes de mudar sens.',
                    requestedNextAction: 'request_validation',
                    payload: expect.objectContaining({ visibility: 'workspace_private' }),
                }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    actorUserId: 'coach-1',
                    targetUserId: 'player-1',
                    shareId: 'share-1',
                    eventType: 'review_note_created',
                }),
            }),
        ]));
        expect(mocks.update).not.toHaveBeenCalled();
        expect(JSON.stringify(insertedValues)).not.toMatch(/analysis_sessions|confidence|coverage|rawAnalysisPayload|coachPlan/);
    });

    it('updates review status and requests loop-specific next actions through review events and audit rows only', async () => {
        selectQueue.push(
            [activeShare],
            [workspaceRow],
            [coachMembership],
            [activeShare],
            [workspaceRow],
            [coachMembership],
        );
        const { requestTeamCoachNextAction, updateTeamCoachReviewStatus } = await loadTeamCoachReviewActions();

        const statusResult = await updateTeamCoachReviewStatus({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            nextStatus: 'validation_requested',
            reason: 'Need compatible clip before stronger call.',
            requestedNextAction: 'request_validation',
        });
        const nextActionResult = await requestTeamCoachNextAction({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            target: 'spray_lab_session',
            reason: 'Repair capture quality before another review.',
        });

        expect(statusResult).toMatchObject({
            success: true,
            reviewStatus: 'validation_requested',
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.review_status_updated' }),
            ]),
        });
        expect(nextActionResult).toMatchObject({
            success: true,
            reviewStatus: 'repair_requested',
            requestedNextAction: {
                target: 'spray_lab_session',
                kind: 'request_repair',
            },
        });
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_review_status_events',
                values: expect.objectContaining({
                    nextStatus: 'validation_requested',
                    payload: expect.objectContaining({
                        requestedNextAction: 'request_validation',
                    }),
                }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_review_status_events',
                values: expect.objectContaining({
                    nextStatus: 'repair_requested',
                    payload: expect.objectContaining({
                        requestedLoop: 'spray_lab_session',
                        requestedNextAction: 'request_repair',
                    }),
                }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    eventType: 'review_status_updated',
                }),
            }),
        ]));
        expect(mocks.update).not.toHaveBeenCalled();
    });
});
