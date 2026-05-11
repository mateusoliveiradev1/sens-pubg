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

function createUpdateChain(table: unknown) {
    return {
        set: vi.fn((values: Record<string, unknown>) => {
            updatedValues.push({
                tableName: getTableConfig(table as Parameters<typeof getTableConfig>[0]).name,
                values,
            });

            return {
                where: vi.fn(async () => []),
            };
        }),
    };
}

async function loadTeamCoachReports() {
    const modulePath = './team-coach-reports';

    let actions: typeof import('./team-coach-reports');
    try {
        actions = await import(modulePath);
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach report actions at src/actions/team-coach-reports.ts.',
                'Expected share, revoke, packet, link, and token-read lifecycle actions.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof actions.shareTeamCoachReportSource).toBe('function');
    expect(typeof actions.revokeTeamCoachReportShare).toBe('function');
    expect(typeof actions.requestTeamCoachExpandedContext).toBe('function');
    expect(typeof actions.approveTeamCoachExpandedContext).toBe('function');
    expect(typeof actions.createTeamCoachReviewPacket).toBe('function');
    expect(typeof actions.updateTeamCoachReviewPacketControls).toBe('function');
    expect(typeof actions.createTeamCoachPacketLink).toBe('function');
    expect(typeof actions.revokeTeamCoachPacketLink).toBe('function');
    expect(typeof actions.regenerateTeamCoachPacketLink).toBe('function');
    expect(typeof actions.readTeamCoachPacketByToken).toBe('function');

    return actions;
}

const workspaceRow = {
    id: 'workspace-1',
    ownerUserId: 'owner-1',
    status: 'active',
    seatLimit: 8,
};

const playerMembership = {
    id: 'membership-player',
    workspaceId: 'workspace-1',
    userId: 'player-1',
    role: 'player',
    status: 'active',
};

const coachMembership = {
    id: 'membership-coach',
    workspaceId: 'workspace-1',
    userId: 'coach-1',
    role: 'coach',
    status: 'active',
};

const analysisResult = {
    id: 'analysis-1',
    fullResult: {
        metrics: {
            confidence: 0.76,
            coverage: 0.68,
        },
        analysisDecision: {
            blockers: ['validation_pending'],
        },
        privateAccountData: {
            email: 'player@example.com',
        },
        rawAnalysisPayload: {
            frames: [1, 2, 3],
        },
        billingState: {
            stripeCustomerId: 'cus_private',
        },
    },
};

function activeShare(overrides: Record<string, unknown> = {}) {
    return {
        id: 'share-1',
        workspaceId: 'workspace-1',
        playerUserId: 'player-1',
        sharedByUserId: 'player-1',
        consentStatus: 'granted',
        consentScopes: ['analysis_summary', 'review_packet'],
        shareStatus: 'active',
        teamSafeSnapshot: {
            id: 'share-1',
            honesty: {
                confidence: 0.76,
                coverage: 0.68,
                blockers: ['validation_pending'],
                inconclusiveState: false,
                limitedSupport: ['team-safe snapshot'],
                validationState: 'pending',
                noOverclaimDisclaimer: 'Evidence review only.',
            },
            sourceSummary: {
                analysisSessionId: 'analysis-1',
                playerLabel: 'Player Alpha',
            },
            sections: {
                technical_proof: {
                    summary: 'Analysis source reloaded.',
                    sourceId: 'analysis-1',
                },
            },
        },
        sourceAnalysisSessionId: 'analysis-1',
        sourceHistorySessionId: null,
        sourceProtocolRevisionId: null,
        sourceSprayLabSessionId: null,
        sourceTrainingProgramCycleId: null,
        sourceValidationLinkId: null,
        ...overrides,
    };
}

function packetRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'packet-1',
        workspaceId: 'workspace-1',
        shareId: 'share-1',
        createdByUserId: 'coach-1',
        playerUserId: 'player-1',
        visibility: 'unlisted',
        status: 'published',
        title: 'Team Review Packet',
        teamSafeSnapshot: activeShare().teamSafeSnapshot,
        reviewStatus: 'validation_requested',
        requestedNextAction: 'request_validation',
        createdAt: '2026-05-11T02:00:00.000Z',
        updatedAt: '2026-05-11T02:10:00.000Z',
        ...overrides,
    };
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
            id: 'player-1',
            role: 'user',
        },
    });
    mocks.resolveTeamCoachAccessForUser.mockResolvedValue(policy({
        create_share: true,
        revoke_share: true,
        create_review_packet: true,
        edit_review_packet: true,
        manage_packet_links: true,
    }));
    mocks.hasTeamCoachCapability.mockImplementation((resolvedPolicy: MockPolicy, capability: string) => (
        Boolean(resolvedPolicy.capabilities[capability])
    ));
    mocks.select.mockImplementation(() => createSelectChain());
    mocks.insert.mockImplementation((table: unknown) => createInsertChain(table));
    mocks.update.mockImplementation((table: unknown) => createUpdateChain(table));
});

describe('Team Coach report actions', () => {
    it('shares only player-owned source evidence into a workspace and stores a redacted team-safe snapshot plus audit event', async () => {
        selectQueue.push(
            [workspaceRow],
            [playerMembership],
            [analysisResult],
        );
        insertReturningQueue.push([{ id: 'share-1', shareStatus: 'active', teamSafeSnapshot: activeShare().teamSafeSnapshot }]);
        const { shareTeamCoachReportSource } = await loadTeamCoachReports();

        const result = await shareTeamCoachReportSource({
            workspaceId: 'workspace-1',
            sourceAnalysisSessionId: 'analysis-1',
            consentScopes: ['analysis_summary', 'review_packet'],
            snapshot: {
                sections: {
                    technical_proof: {
                        summary: 'Analysis source reloaded.',
                        sourceId: 'analysis-1',
                    },
                },
                privateLinks: [{ token: 'secret-token' }],
            },
        });

        expect(result).toMatchObject({
            success: true,
            share: {
                id: 'share-1',
                shareStatus: 'active',
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'team_coach.share_created' }),
            ]),
        });
        const shareInsert = insertedValues.find((call) => call.tableName === 'team_coach_report_shares');
        expect(shareInsert?.values).toMatchObject({
            workspaceId: 'workspace-1',
            playerUserId: 'player-1',
            sharedByUserId: 'player-1',
            shareStatus: 'active',
            consentStatus: 'granted',
            sourceAnalysisSessionId: 'analysis-1',
        });
        const serializedSnapshot = JSON.stringify(shareInsert?.values.teamSafeSnapshot);
        expect(serializedSnapshot).toContain('validation_pending');
        expect(serializedSnapshot).not.toContain('player@example.com');
        expect(serializedSnapshot).not.toContain('cus_private');
        expect(serializedSnapshot).not.toContain('frames');
        expect(serializedSnapshot).not.toContain('secret-token');
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    workspaceId: 'workspace-1',
                    actorUserId: 'player-1',
                    targetUserId: 'player-1',
                    eventType: 'share_created',
                }),
            }),
        ]));
    });

    it('revokes a share without reloading private source data and leaves audit evidence for the safe snapshot policy', async () => {
        selectQueue.push(
            [activeShare()],
            [workspaceRow],
            [playerMembership],
        );
        const { revokeTeamCoachReportShare } = await loadTeamCoachReports();

        const result = await revokeTeamCoachReportShare({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            reason: 'player_revoked',
        });

        expect(result).toMatchObject({
            success: true,
            share: {
                id: 'share-1',
                shareStatus: 'revoked',
            },
            safeSnapshotReadable: true,
        });
        expect(updatedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_report_shares',
                values: expect.objectContaining({
                    shareStatus: 'revoked',
                    revokedByUserId: 'player-1',
                    revokedAt: expect.any(Date),
                }),
            }),
        ]));
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({
                    eventType: 'share_revoked',
                    reasonCode: 'player_revoked',
                }),
            }),
        ]));
    });

    it('creates packets and private links only after Team membership/access checks and never stores raw link tokens', async () => {
        mocks.auth.mockResolvedValue({ user: { id: 'coach-1', role: 'user' } });
        selectQueue.push(
            [activeShare()],
            [workspaceRow],
            [coachMembership],
            [packetRow()],
            [activeShare()],
            [workspaceRow],
            [coachMembership],
        );
        insertReturningQueue.push(
            [{ id: 'packet-1', status: 'ready', visibility: 'unlisted', teamSafeSnapshot: activeShare().teamSafeSnapshot }],
            [{ id: 'link-1', status: 'active', expiresAt: new Date('2026-05-12T02:00:00.000Z') }],
        );
        const { createTeamCoachPacketLink, createTeamCoachReviewPacket } = await loadTeamCoachReports();

        const packetResult = await createTeamCoachReviewPacket({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            title: 'Team Review Packet',
            reviewStatus: 'validation_requested',
            requestedNextAction: 'request_validation',
        });
        const linkResult = await createTeamCoachPacketLink({
            workspaceId: 'workspace-1',
            packetId: 'packet-1',
            expiresAt: '2026-05-12T02:00:00.000Z',
        });

        expect(packetResult).toMatchObject({
            success: true,
            packet: expect.objectContaining({
                id: 'packet-1',
                status: 'ready',
            }),
        });
        expect(linkResult).toMatchObject({
            success: true,
            link: {
                id: 'link-1',
                token: expect.any(String),
                status: 'active',
                expiresAt: '2026-05-12T02:00:00.000Z',
            },
        });
        const linkInsert = insertedValues.find((call) => call.tableName === 'team_coach_packet_links');
        expect(linkInsert?.values).toMatchObject({
            packetId: 'packet-1',
            workspaceId: 'workspace-1',
            ownerUserId: 'coach-1',
            status: 'active',
            tokenVerifierHash: expect.any(String),
            tokenVerifierPrefix: expect.any(String),
        });
        expect(JSON.stringify(linkInsert?.values)).not.toContain((linkResult as { link: { token: string } }).link.token);
        expect(insertedValues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({ eventType: 'packet_created' }),
            }),
            expect.objectContaining({
                tableName: 'team_coach_audit_events',
                values: expect.objectContaining({ eventType: 'packet_link_created' }),
            }),
        ]));
    });

    it('reads packets by active token only, blocks disabled links, and projects the redacted packet view model', async () => {
        mocks.auth.mockResolvedValue(null);
        const { createTeamCoachPacketLinkTokenVerifier, generateTeamCoachPacketLinkToken } = await import('@/lib/team-coach-link-token');
        const token = generateTeamCoachPacketLinkToken();
        const verifier = createTeamCoachPacketLinkTokenVerifier(token);
        selectQueue.push(
            [{
                id: 'link-1',
                packetId: 'packet-1',
                status: 'active',
                tokenVerifierHash: verifier.tokenVerifierHash,
                expiresAt: new Date('2026-05-12T02:00:00.000Z'),
            }],
            [packetRow()],
            [{
                id: 'link-disabled',
                packetId: 'packet-1',
                status: 'disabled',
                tokenVerifierHash: verifier.tokenVerifierHash,
                expiresAt: null,
            }],
        );
        const { readTeamCoachPacketByToken } = await loadTeamCoachReports();

        const result = await readTeamCoachPacketByToken(token, {
            now: '2026-05-11T02:00:00.000Z',
        });
        const disabled = await readTeamCoachPacketByToken(token, {
            now: '2026-05-11T02:00:00.000Z',
        });

        expect(result).toMatchObject({
            success: true,
            packet: {
                packetId: 'packet-1',
                caseLabel: 'Team Review Packet',
                requiredHonesty: expect.arrayContaining([
                    expect.objectContaining({ key: 'confidence', visible: true }),
                    expect.objectContaining({ key: 'coverage', visible: true }),
                ]),
                sourceList: expect.arrayContaining([
                    expect.objectContaining({ sourceId: 'analysis-1' }),
                ]),
            },
        });
        expect(disabled).toMatchObject({
            success: false,
            error: expect.stringMatching(/disabled|revoked|invalid/i),
        });
    });

    it('blocks new packet/link mutations after Team entitlement loss while preserving existing safe packet readability', async () => {
        mocks.auth.mockResolvedValue({ user: { id: 'coach-1', role: 'user' } });
        mocks.resolveTeamCoachAccessForUser.mockResolvedValue(policy(
            { create_review_packet: false, manage_packet_links: false },
            {
                create_review_packet: ['team_entitlement_missing'],
                manage_packet_links: ['team_entitlement_missing'],
            },
        ));
        selectQueue.push(
            [activeShare()],
            [workspaceRow],
            [coachMembership],
            [packetRow()],
            [activeShare()],
            [workspaceRow],
            [coachMembership],
        );
        const { createTeamCoachPacketLink, createTeamCoachReviewPacket } = await loadTeamCoachReports();

        await expect(createTeamCoachReviewPacket({
            workspaceId: 'workspace-1',
            shareId: 'share-1',
            title: 'Blocked Packet',
        })).resolves.toMatchObject({
            success: false,
            denialReason: 'team_entitlement_missing',
        });
        await expect(createTeamCoachPacketLink({
            workspaceId: 'workspace-1',
            packetId: 'packet-1',
        })).resolves.toMatchObject({
            success: false,
            denialReason: 'team_entitlement_missing',
        });
        expect(insertedValues).toHaveLength(0);
    });
});
