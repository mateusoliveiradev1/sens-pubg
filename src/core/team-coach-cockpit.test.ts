import { describe, expect, it } from 'vitest';

interface TeamCoachCockpitModule {
    readonly createTeamCoachCockpitViewModel?: (input: Record<string, unknown>) => Record<string, unknown>;
}

async function loadTeamCoachCockpit(): Promise<Required<TeamCoachCockpitModule>> {
    const modulePath = './team-coach-cockpit';

    let teamCoachCockpit: TeamCoachCockpitModule;
    try {
        teamCoachCockpit = await import(modulePath) as TeamCoachCockpitModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach cockpit module at src/core/team-coach-cockpit.ts.',
                'Expected roster triage, blocker lanes, validation status, next actions, and dossier summaries without global rankings.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof teamCoachCockpit.createTeamCoachCockpitViewModel).toBe('function');

    return teamCoachCockpit as Required<TeamCoachCockpitModule>;
}

const now = '2026-05-11T12:00:00.000Z';

function teamSafeSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        id: 'share',
        honesty: {
            confidence: 0.74,
            coverage: 0.67,
            blockers: [],
            inconclusiveState: false,
            limitedSupport: [],
            validationState: 'pending',
            noOverclaimDisclaimer: 'Evidence review only; no certification, rank proof, perfect sensitivity, or guaranteed improvement.',
        },
        sourceSummary: {
            weapon: 'Beryl',
            optic: '3x',
            distanceMeters: 40,
            contextLabel: 'Beryl / 3x / 40m',
        },
        sections: {
            technical_proof: { summary: 'Tracking is available.' },
            compatible_validation: { summary: 'Validation pending.' },
            current_state: { summary: 'Needs coach review.' },
        },
        ...overrides,
    };
}

describe('Team Coach cockpit contract', () => {
    it('prioritizes players needing attention by evidence state and smallest safe next action', async () => {
        const { createTeamCoachCockpitViewModel } = await loadTeamCoachCockpit();

        const viewModel = createTeamCoachCockpitViewModel({
            now,
            workspace: {
                id: 'workspace-1',
                name: 'Mesa Alpha',
            },
            players: [
                { id: 'ready-player', displayName: 'Ready Player', membershipStatus: 'active' },
                { id: 'weak-player', displayName: 'Weak Capture', membershipStatus: 'active' },
                { id: 'validation-player', displayName: 'Needs Validation', membershipStatus: 'active' },
                { id: 'repair-player', displayName: 'Repair Player', membershipStatus: 'active' },
                { id: 'stale-player', displayName: 'Stale Context', membershipStatus: 'active' },
            ],
            shares: [
                {
                    id: 'share-ready',
                    playerUserId: 'ready-player',
                    shareStatus: 'active',
                    reviewStatus: 'reviewed',
                    requestedNextAction: 'no_action',
                    updatedAt: '2026-05-11T09:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.83,
                            coverage: 0.8,
                            blockers: [],
                            inconclusiveState: false,
                            limitedSupport: [],
                            validationState: 'validacao_confirmada',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
                {
                    id: 'share-weak',
                    playerUserId: 'weak-player',
                    shareStatus: 'active',
                    reviewStatus: 'needs_review',
                    updatedAt: '2026-05-11T08:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.34,
                            coverage: 0.28,
                            blockers: ['weak_capture', 'coverage_low'],
                            inconclusiveState: true,
                            limitedSupport: ['tracking coverage low'],
                            validationState: 'pending',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
                {
                    id: 'share-validation',
                    playerUserId: 'validation-player',
                    shareStatus: 'active',
                    reviewStatus: 'validation_requested',
                    requestedNextAction: 'request_validation',
                    updatedAt: '2026-05-11T07:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.7,
                            coverage: 0.68,
                            blockers: ['validation_pending'],
                            inconclusiveState: false,
                            limitedSupport: [],
                            validationState: 'pending',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
                {
                    id: 'share-repair',
                    playerUserId: 'repair-player',
                    shareStatus: 'active',
                    reviewStatus: 'repair_requested',
                    requestedNextAction: 'request_repair',
                    updatedAt: '2026-05-11T06:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.62,
                            coverage: 0.58,
                            blockers: ['regression_validated', 'no_clear_change'],
                            inconclusiveState: false,
                            limitedSupport: [],
                            validationState: 'regressao_validada',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
                {
                    id: 'share-stale',
                    playerUserId: 'stale-player',
                    shareStatus: 'active',
                    reviewStatus: 'reviewed',
                    updatedAt: '2026-04-01T06:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.78,
                            coverage: 0.72,
                            blockers: [],
                            inconclusiveState: false,
                            limitedSupport: [],
                            validationState: 'validacao_confirmada',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
            ],
        });

        expect(viewModel).toMatchObject({
            workspace: {
                id: 'workspace-1',
                name: 'Mesa Alpha',
            },
            rosterSummary: {
                totalPlayers: 5,
                activePlayers: 5,
                playersNeedingAttention: 4,
                staleContextCount: 1,
            },
            operationalComparison: {
                mode: 'triage_only',
                globalRankingEnabled: false,
            },
        });
        expect(viewModel.attentionQueue).toEqual([
            expect.objectContaining({
                playerId: 'weak-player',
                attentionReasonCodes: expect.arrayContaining(['weak_capture', 'coverage_low']),
                nextAction: expect.objectContaining({ kind: 'request_repair' }),
            }),
            expect.objectContaining({
                playerId: 'validation-player',
                attentionReasonCodes: expect.arrayContaining(['validation_pending']),
                nextAction: expect.objectContaining({ kind: 'request_validation' }),
            }),
            expect.objectContaining({
                playerId: 'repair-player',
                attentionReasonCodes: expect.arrayContaining(['regression_validated', 'no_clear_change']),
                nextAction: expect.objectContaining({ kind: 'request_repair' }),
            }),
            expect.objectContaining({
                playerId: 'stale-player',
                attentionReasonCodes: expect.arrayContaining(['stale_context']),
                nextAction: expect.objectContaining({ kind: 'review_report' }),
            }),
        ]);
        expect(JSON.stringify(viewModel).toLowerCase()).not.toMatch(/leaderboard|global rank|global grade|certification/);
    });

    it('builds blocker, validation, and review lanes while keeping revoked shares audit-safe', async () => {
        const { createTeamCoachCockpitViewModel } = await loadTeamCoachCockpit();

        const viewModel = createTeamCoachCockpitViewModel({
            now,
            players: [
                { id: 'active-player', displayName: 'Active Player', membershipStatus: 'active' },
                { id: 'revoked-player', displayName: 'Revoked Player', membershipStatus: 'active' },
                { id: 'removed-player', displayName: 'Removed Player', membershipStatus: 'removed' },
            ],
            shares: [
                {
                    id: 'share-active',
                    playerUserId: 'active-player',
                    shareStatus: 'active',
                    reviewStatus: 'needs_review',
                    updatedAt: '2026-05-11T09:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.55,
                            coverage: 0.51,
                            blockers: ['hard_cut_detected'],
                            inconclusiveState: true,
                            limitedSupport: ['cut detected'],
                            validationState: 'inconclusivo',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
                {
                    id: 'share-revoked',
                    playerUserId: 'revoked-player',
                    shareStatus: 'revoked',
                    reviewStatus: 'archived',
                    revokedAt: '2026-05-10T10:00:00.000Z',
                    updatedAt: '2026-05-10T10:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        honesty: {
                            confidence: 0.8,
                            coverage: 0.78,
                            blockers: [],
                            inconclusiveState: false,
                            limitedSupport: [],
                            validationState: 'validacao_confirmada',
                            noOverclaimDisclaimer: 'Evidence review only.',
                        },
                    }),
                },
            ],
        });

        expect(viewModel.reviewStatusCounts).toMatchObject({
            needs_review: 1,
            archived: 1,
        });
        expect(viewModel.blockerLanes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                blocker: 'hard_cut_detected',
                playerCount: 1,
                players: expect.arrayContaining([
                    expect.objectContaining({ playerId: 'active-player' }),
                ]),
            }),
            expect.objectContaining({
                blocker: 'share_revoked',
                playerCount: 1,
                players: expect.arrayContaining([
                    expect.objectContaining({
                        playerId: 'revoked-player',
                        shareStatus: 'revoked',
                    }),
                ]),
            }),
        ]));
        expect(viewModel.validationLanes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                state: 'inconclusivo',
                playerCount: 1,
            }),
            expect.objectContaining({
                state: 'validacao_confirmada',
                playerCount: 1,
            }),
        ]));
        expect(viewModel.rosterSummary).toMatchObject({
            totalPlayers: 3,
            activePlayers: 2,
            revokedShareCount: 1,
        });
        expect(JSON.stringify(viewModel)).not.toContain('privateAccountData');
    });
});
