import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const resolveTeamCoachAccessForUser = vi.fn();
    const hasTeamCoachCapability = vi.fn();
    const select = vi.fn();

    return {
        auth,
        resolveTeamCoachAccessForUser,
        hasTeamCoachCapability,
        select,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
    },
}));

vi.mock('@/lib/team-coach-access', () => ({
    resolveTeamCoachAccessForUser: mocks.resolveTeamCoachAccessForUser,
    hasTeamCoachCapability: mocks.hasTeamCoachCapability,
}));

interface MockPolicy {
    readonly capabilities: Record<string, boolean>;
    readonly capabilityDenials?: Record<string, readonly string[]>;
}

let selectQueue: unknown[][];

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
                orderBy: vi.fn(async () => selectQueue.shift() ?? []),
                limit: vi.fn(async () => selectQueue.shift() ?? []),
            })),
            orderBy: vi.fn(async () => selectQueue.shift() ?? []),
        })),
    };
}

async function loadTeamCoachCockpitActions() {
    const modulePath = './team-coach-cockpit';

    let actions: typeof import('./team-coach-cockpit');
    try {
        actions = await import(modulePath);
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach cockpit actions at src/actions/team-coach-cockpit.ts.',
                'Expected cockpit and player dossier snapshot loaders with Team access checks.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof actions.getTeamCoachCockpit).toBe('function');
    expect(typeof actions.getTeamCoachPlayerDossier).toBe('function');

    return actions;
}

const workspaceRow = {
    id: 'workspace-1',
    ownerUserId: 'owner-1',
    name: 'Mesa Alpha',
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

function teamSafeSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        id: 'share-1',
        sourceSummary: {
            analysisSessionId: 'analysis-1',
            protocolRevisionId: 'protocol-1',
            sprayLabSessionId: 'lab-1',
            trainingProgramCycleId: 'cycle-1',
            validationLinkId: 'validation-1',
            playerLabel: 'Player Alpha',
            contextLabel: 'Beryl / 3x / 40m',
        },
        honesty: {
            confidence: 0.72,
            coverage: 0.66,
            blockers: ['validation_pending'],
            inconclusiveState: false,
            limitedSupport: [],
            validationState: 'pending',
            noOverclaimDisclaimer: 'Evidence review only.',
        },
        sections: {
            technical_proof: { summary: 'Tracking supports bounded review.', sourceId: 'analysis-1' },
            compatible_validation: { summary: 'Validation pending.', sourceId: 'validation-1' },
            current_state: { summary: 'waiting_player' },
        },
        privateAccountData: {
            email: 'player@example.com',
        },
        rawAnalysisPayload: {
            frames: [1, 2, 3],
        },
        ...overrides,
    };
}

const activeShare = {
    id: 'share-1',
    workspaceId: 'workspace-1',
    playerUserId: 'player-1',
    sharedByUserId: 'player-1',
    consentStatus: 'granted',
    consentScopes: ['analysis_summary', 'review_packet', 'coach_notes'],
    shareStatus: 'active',
    reviewStatus: 'validation_requested',
    requestedNextAction: 'request_validation',
    teamSafeSnapshot: teamSafeSnapshot(),
    createdAt: new Date('2026-05-11T09:00:00.000Z'),
    updatedAt: new Date('2026-05-11T10:00:00.000Z'),
};

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectQueue = [];

    mocks.auth.mockResolvedValue({
        user: {
            id: 'coach-1',
            role: 'user',
        },
    });
    mocks.resolveTeamCoachAccessForUser.mockResolvedValue(policy({
        review_roster: true,
        open_player_dossier: true,
    }));
    mocks.hasTeamCoachCapability.mockImplementation((resolvedPolicy: MockPolicy, capability: string) => (
        Boolean(resolvedPolicy.capabilities[capability])
    ));
    mocks.select.mockImplementation(() => createSelectChain());
});

describe('Team Coach cockpit loader actions', () => {
    it('denies cockpit loading with stable Team access reasons before exposing roster evidence', async () => {
        selectQueue.push([workspaceRow], [coachMembership]);
        mocks.resolveTeamCoachAccessForUser.mockResolvedValueOnce(policy(
            { review_roster: false },
            { review_roster: ['team_entitlement_missing'] },
        ));
        const { getTeamCoachCockpit } = await loadTeamCoachCockpitActions();

        const result = await getTeamCoachCockpit({ workspaceId: 'workspace-1' });

        expect(result).toMatchObject({
            success: false,
            denialReason: 'team_entitlement_missing',
        });
        expect(selectQueue).toHaveLength(0);
    });

    it('loads a Team-safe cockpit snapshot from shares, status, and notes without player ranking', async () => {
        selectQueue.push(
            [workspaceRow],
            [coachMembership],
            [activeShare],
            [{ shareId: 'share-1', nextStatus: 'validation_requested', createdAt: new Date('2026-05-11T10:20:00.000Z') }],
        );
        const { getTeamCoachCockpit } = await loadTeamCoachCockpitActions();

        const result = await getTeamCoachCockpit({ workspaceId: 'workspace-1' });

        expect(result).toMatchObject({
            success: true,
            cockpit: {
                workspace: { id: 'workspace-1', name: 'Mesa Alpha' },
                attentionQueue: expect.arrayContaining([
                    expect.objectContaining({
                        playerId: 'player-1',
                        nextAction: expect.objectContaining({ kind: 'request_validation' }),
                    }),
                ]),
                operationalComparison: {
                    globalRankingEnabled: false,
                },
            },
        });
        expect(JSON.stringify(result).toLowerCase()).not.toMatch(/leaderboard|global rank|player@example\.com|rawanalysispayload|frames/);
    });

    it('loads player dossier snapshots through open-player access and shared-only rows', async () => {
        selectQueue.push(
            [workspaceRow],
            [coachMembership],
            [activeShare],
            [{ id: 'note-1', shareId: 'share-1', note: 'Gravar validacao compativel.', requestedNextAction: 'request_validation', createdAt: new Date('2026-05-11T10:30:00.000Z') }],
            [{ id: 'status-1', shareId: 'share-1', nextStatus: 'validation_requested', createdAt: new Date('2026-05-11T10:20:00.000Z') }],
            [{ eventType: 'share_created', shareId: 'share-1', actorUserId: 'player-1', targetUserId: 'player-1', workspaceId: 'workspace-1', createdAt: new Date('2026-05-11T09:00:00.000Z') }],
        );
        const { getTeamCoachPlayerDossier } = await loadTeamCoachCockpitActions();

        const result = await getTeamCoachPlayerDossier({
            workspaceId: 'workspace-1',
            playerUserId: 'player-1',
        });

        expect(result).toMatchObject({
            success: true,
            dossier: {
                player: { id: 'player-1' },
                sharedReports: [
                    expect.objectContaining({
                        shareId: 'share-1',
                        privateSourceReloadAllowed: true,
                    }),
                ],
                activeContext: {
                    latestReviewStatus: { key: 'validation_requested' },
                    requestedNextAction: { key: 'request_validation' },
                },
            },
        });
        expect(JSON.stringify(result)).not.toMatch(/player@example\.com|rawAnalysisPayload|frames/);
    });
});
