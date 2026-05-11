import { describe, expect, it } from 'vitest';

interface TeamCoachPlayerDossierModule {
    readonly buildTeamCoachPlayerDossierViewModel?: (input: Record<string, unknown>) => Record<string, unknown>;
}

async function loadTeamCoachPlayerDossier(): Promise<Required<TeamCoachPlayerDossierModule>> {
    const modulePath = './team-coach-player-dossier';

    let dossier: TeamCoachPlayerDossierModule;
    try {
        dossier = await import(modulePath) as TeamCoachPlayerDossierModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach player dossier module at src/core/team-coach-player-dossier.ts.',
                'Expected shared-only player dossier, evidence layers, review status, notes, and audit timeline builders.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof dossier.buildTeamCoachPlayerDossierViewModel).toBe('function');

    return dossier as Required<TeamCoachPlayerDossierModule>;
}

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
            unsharedHistorySessionId: 'history-private',
        },
        honesty: {
            confidence: 0.72,
            coverage: 0.66,
            blockers: ['validation_pending', 'coverage_low'],
            inconclusiveState: false,
            limitedSupport: ['Team-safe dossier hides private account and raw payloads.'],
            validationState: 'pending',
            noOverclaimDisclaimer: 'Evidence review only; no certified coach, rank proof, perfect sensitivity, or guaranteed improvement.',
        },
        sections: {
            technical_proof: { summary: 'Tracking supports a bounded review.', sourceId: 'analysis-1' },
            training_execution: { summary: 'Protocol was started; execution is not proof.', sourceId: 'protocol-1' },
            practical_transfer: { summary: 'TDM note is practical transfer only.' },
            compatible_validation: { summary: 'Compatible validation pending.', sourceId: 'validation-1' },
            blockers: { summary: 'validation_pending | coverage_low' },
            repairs: { summary: 'Repeat a compatible clip before changing sensitivity.' },
            coach_notes: { summary: 'Coach asked for a validation clip.' },
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

describe('Team Coach player dossier view model', () => {
    it('builds a shared-only player dossier with active context, evidence layers, notes, and requested next action', async () => {
        const { buildTeamCoachPlayerDossierViewModel } = await loadTeamCoachPlayerDossier();

        const dossier = buildTeamCoachPlayerDossierViewModel({
            now: '2026-05-11T12:00:00.000Z',
            workspace: { id: 'workspace-1', name: 'Mesa Alpha' },
            player: { id: 'player-1', displayName: 'Player Alpha' },
            shares: [
                {
                    id: 'share-1',
                    playerUserId: 'player-1',
                    shareStatus: 'active',
                    consentStatus: 'granted',
                    reviewStatus: 'validation_requested',
                    requestedNextAction: 'request_validation',
                    updatedAt: '2026-05-11T10:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot(),
                    privateSource: { hiddenHistory: ['do-not-read'] },
                },
            ],
            reviewNotes: [
                {
                    id: 'note-1',
                    shareId: 'share-1',
                    authorUserId: 'coach-1',
                    note: 'Gravar validacao compativel antes de mudar sens.',
                    requestedNextAction: 'request_validation',
                    createdAt: '2026-05-11T10:30:00.000Z',
                },
            ],
            reviewStatusEvents: [
                {
                    id: 'status-1',
                    shareId: 'share-1',
                    previousStatus: 'needs_review',
                    nextStatus: 'validation_requested',
                    reason: 'needs compatible validation',
                    createdAt: '2026-05-11T10:20:00.000Z',
                },
            ],
            activeCoachLoop: {
                status: 'validation_needed',
                statusLabel: 'Validation needed',
                ctaLabel: 'Gravar validacao compativel',
                ctaHref: '/analyze?mode=validation',
            },
            sprayLab: {
                labSessionId: 'lab-1',
                technicalProofState: 'pending',
                executionEvidence: { label: 'Lab execution only.', countsAsTechnicalProof: false },
                compatibleClipProof: { label: 'Validation pending.', countsAsTechnicalProof: false },
                practicalTransfer: { label: 'No transfer.', countsAsTechnicalProof: false },
                blockerReasons: ['validation_pending'],
                nextAction: { kind: 'record_validation', label: 'Gravar validacao compativel', href: '/analyze?mode=validation' },
            },
            trainingProgram: {
                cycleId: 'cycle-1',
                technicalProofState: 'pending',
                executionEvidence: { label: 'Program execution only.', countsAsTechnicalProof: false },
                compatibleValidation: { label: 'Clip pending.', countsAsTechnicalProof: false },
                practicalTransfer: { label: 'TDM does not replace validation.', countsAsTechnicalProof: false },
                blockerReasons: ['compatible_proof_missing'],
                nextAction: { kind: 'record_validation', label: 'Gravar validacao compativel', href: '/analyze?mode=validation' },
            },
        });

        expect(dossier).toMatchObject({
            workspace: { id: 'workspace-1', name: 'Mesa Alpha' },
            player: { id: 'player-1', displayName: 'Player Alpha' },
            activeContext: {
                latestReviewStatus: {
                    key: 'validation_requested',
                },
                requestedNextAction: {
                    key: 'request_validation',
                },
                compatibleValidation: {
                    state: 'pending',
                },
            },
            coachNotesSummary: {
                count: 1,
                latest: 'Gravar validacao compativel antes de mudar sens.',
                requestedNextAction: 'request_validation',
            },
        });
        expect(dossier.sharedReports).toEqual([
            expect.objectContaining({
                shareId: 'share-1',
                shareStatus: 'active',
                privateSourceReloadAllowed: true,
                safeSnapshotReadable: true,
                sourceList: expect.arrayContaining([
                    expect.objectContaining({ kind: 'analysis', sourceId: 'analysis-1' }),
                    expect.objectContaining({ kind: 'protocol', sourceId: 'protocol-1' }),
                    expect.objectContaining({ kind: 'spray_lab', sourceId: 'lab-1' }),
                    expect.objectContaining({ kind: 'program', sourceId: 'cycle-1' }),
                    expect.objectContaining({ kind: 'validation', sourceId: 'validation-1' }),
                ]),
            }),
        ]);
        expect(dossier.evidenceLayers).toEqual([
            expect.objectContaining({ kind: 'technical_proof', countsAsTechnicalTruth: true }),
            expect.objectContaining({ kind: 'training_execution', countsAsTechnicalTruth: false }),
            expect.objectContaining({ kind: 'practical_transfer', countsAsTechnicalTruth: false }),
            expect.objectContaining({ kind: 'compatible_validation' }),
            expect.objectContaining({ kind: 'blockers' }),
            expect.objectContaining({ kind: 'repairs' }),
            expect.objectContaining({ kind: 'coach_notes', countsAsDeterministicTruth: false }),
            expect.objectContaining({ kind: 'current_state' }),
        ]);
        expect(dossier.recentBlockers).toEqual(expect.arrayContaining([
            'validation_pending',
            'coverage_low',
            'compatible_proof_missing',
        ]));
        expect(JSON.stringify(dossier)).not.toMatch(/player@example\.com|rawAnalysisPayload|hiddenHistory|history-private|frames/);
    });

    it('keeps revoked shares readable only as safe snapshots and records revocation in the audit timeline', async () => {
        const { buildTeamCoachPlayerDossierViewModel } = await loadTeamCoachPlayerDossier();

        const dossier = buildTeamCoachPlayerDossierViewModel({
            player: { id: 'player-1', displayName: 'Player Alpha' },
            shares: [
                {
                    id: 'share-revoked',
                    playerUserId: 'player-1',
                    shareStatus: 'revoked',
                    consentStatus: 'revoked',
                    reviewStatus: 'archived',
                    revokedAt: '2026-05-10T10:00:00.000Z',
                    updatedAt: '2026-05-10T10:00:00.000Z',
                    teamSafeSnapshot: teamSafeSnapshot({
                        id: 'share-revoked',
                        sourceSummary: {
                            analysisSessionId: 'analysis-1',
                            playerLabel: 'Player Alpha',
                            contextLabel: 'Beryl / 3x / 40m',
                        },
                    }),
                },
            ],
            auditEvents: [
                {
                    eventType: 'share_revoked',
                    actorUserId: 'player-1',
                    targetUserId: 'player-1',
                    workspaceId: 'workspace-1',
                    shareId: 'share-revoked',
                    createdAt: '2026-05-10T10:00:00.000Z',
                    reasonCode: 'player_revoked',
                },
            ],
        });

        expect(dossier.sharedReports).toEqual([
            expect.objectContaining({
                shareId: 'share-revoked',
                shareStatus: 'revoked',
                privateSourceReloadAllowed: false,
                safeSnapshotReadable: true,
                revokedAt: '2026-05-10T10:00:00.000Z',
            }),
        ]);
        expect(dossier.activeContext).toMatchObject({
            latestReviewStatus: { key: 'archived' },
            sourceAccess: 'revoked_snapshot_only',
        });
        expect(dossier.auditTimeline).toEqual(expect.arrayContaining([
            expect.objectContaining({
                eventType: 'share_revoked',
                reasonCode: 'player_revoked',
                shareId: 'share-revoked',
            }),
        ]));
        expect(JSON.stringify(dossier).toLowerCase()).not.toMatch(/certified coach|rank proof|perfect sensitivity|guaranteed improvement/);
    });
});
