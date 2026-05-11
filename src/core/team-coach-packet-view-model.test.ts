import { describe, expect, it } from 'vitest';

import { redactTeamCoachReportForWorkspace } from './team-coach-report-redaction';

interface TeamCoachPacketViewModelModule {
    readonly buildTeamCoachPacketViewModel?: (input: Record<string, unknown>) => Record<string, unknown>;
}

async function loadTeamCoachPacketViewModel(): Promise<Required<TeamCoachPacketViewModelModule>> {
    const modulePath = './team-coach-packet-view-model';

    let packetViewModel: TeamCoachPacketViewModelModule;
    try {
        packetViewModel = await import(modulePath) as TeamCoachPacketViewModelModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach packet view model at src/core/team-coach-packet-view-model.ts.',
                'Expected secure web packet and print-friendly Team Review Packet builders.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof packetViewModel.buildTeamCoachPacketViewModel).toBe('function');

    return packetViewModel as Required<TeamCoachPacketViewModelModule>;
}

function teamSafeSnapshot() {
    return redactTeamCoachReportForWorkspace({
        id: 'share-1',
        sourceSummary: {
            analysisSessionId: 'analysis-1',
            sprayLabSessionId: 'lab-1',
            trainingProgramCycleId: 'cycle-1',
            playerLabel: 'Player Alpha',
            weapon: 'Beryl',
            distanceMeters: 40,
        },
        honesty: {
            confidence: 0.74,
            coverage: 0.67,
            blockers: ['validation_pending'],
            inconclusiveState: false,
            limitedSupport: ['optic_estimated'],
            validationState: 'pending',
            noOverclaimDisclaimer: 'Team packet is evidence review, not certification or guaranteed improvement.',
        },
        sections: {
            technical_proof: { summary: 'Tracking supports a bounded review.', sourceId: 'analysis-1' },
            training_execution: { summary: 'Spray Lab is execution evidence only.', sourceId: 'lab-1' },
            practical_transfer: { summary: 'TDM note does not prove technical change.' },
            compatible_validation: { summary: 'Validation is pending.', sourceId: 'validation-1' },
            blockers: { summary: 'validation_pending' },
            repairs: { summary: 'Repeat a compatible clip.' },
            coach_notes: { summary: 'Coach asked for validation.' },
            current_state: { summary: 'waiting_player' },
        },
    });
}

describe('Team Coach packet view model', () => {
    it('builds a secure Team Review Packet with context, sources, review status, coach notes, next action, audit, and honesty rows', async () => {
        const { buildTeamCoachPacketViewModel } = await loadTeamCoachPacketViewModel();

        const packet = buildTeamCoachPacketViewModel({
            packet: {
                id: 'packet-1',
                title: 'Team Review Packet - Player Alpha',
                status: 'ready',
                visibility: 'unlisted',
                reviewStatus: 'validation_requested',
                requestedNextAction: 'request_validation',
                teamSafeSnapshot: teamSafeSnapshot(),
                createdAt: '2026-05-11T02:00:00.000Z',
                updatedAt: '2026-05-11T02:10:00.000Z',
            },
            workspace: {
                id: 'workspace-1',
                name: 'Mesa Alpha',
            },
            player: {
                id: 'player-1',
                displayName: 'Player Alpha',
            },
            coachNoteSummary: {
                count: 2,
                latest: 'Gravar validacao compativel antes de mudar sens.',
                requestedNextAction: 'request_validation',
            },
            auditEvents: [
                {
                    eventType: 'share_created',
                    actorUserId: 'player-1',
                    targetUserId: 'workspace-1',
                    workspaceId: 'workspace-1',
                    createdAt: '2026-05-11T01:55:00.000Z',
                },
            ],
        });

        expect(packet).toMatchObject({
            packetId: 'packet-1',
            caseLabel: 'Team Review Packet',
            workspace: { id: 'workspace-1', name: 'Mesa Alpha' },
            player: { id: 'player-1', displayName: 'Player Alpha' },
            reviewStatus: {
                key: 'validation_requested',
                label: expect.stringMatching(/validation/i),
            },
            requestedNextAction: {
                key: 'request_validation',
                label: expect.stringMatching(/validation/i),
            },
            coachNoteSummary: {
                count: 2,
                latest: 'Gravar validacao compativel antes de mudar sens.',
            },
        });
        expect(packet.sourceList).toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'analysis', sourceId: 'analysis-1' }),
            expect.objectContaining({ kind: 'spray_lab', sourceId: 'lab-1' }),
            expect.objectContaining({ kind: 'program', sourceId: 'cycle-1' }),
        ]));
        expect(packet.requiredHonesty).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: 'confidence', visible: true, value: '74%' }),
            expect.objectContaining({ key: 'coverage', visible: true, value: '67%' }),
            expect.objectContaining({ key: 'no_overclaim_disclaimer', visible: true }),
        ]));
        expect(packet.workspaceAudit).toEqual(expect.arrayContaining([
            expect.objectContaining({ eventType: 'share_created', actorUserId: 'player-1' }),
        ]));
    });

    it('keeps evidence layers distinct and exposes print-friendly data without requiring PDF infrastructure', async () => {
        const { buildTeamCoachPacketViewModel } = await loadTeamCoachPacketViewModel();

        const packet = buildTeamCoachPacketViewModel({
            packet: {
                id: 'packet-print',
                title: 'Print Packet',
                status: 'published',
                visibility: 'unlisted',
                reviewStatus: 'waiting_player',
                requestedNextAction: 'request_repair',
                teamSafeSnapshot: teamSafeSnapshot(),
            },
            workspace: { id: 'workspace-1', name: 'Mesa Alpha' },
            player: { id: 'player-1', displayName: 'Player Alpha' },
        });

        expect(packet.evidenceLayers).toEqual([
            expect.objectContaining({ kind: 'technical_proof' }),
            expect.objectContaining({ kind: 'training_execution' }),
            expect.objectContaining({ kind: 'practical_transfer' }),
            expect.objectContaining({ kind: 'compatible_validation' }),
            expect.objectContaining({ kind: 'blockers' }),
            expect.objectContaining({ kind: 'repairs' }),
            expect.objectContaining({ kind: 'coach_notes' }),
            expect.objectContaining({ kind: 'current_state' }),
        ]);
        expect(packet.printLayout).toMatchObject({
            format: 'browser_print',
            pdfRequired: false,
            preserveHonestyFields: true,
            sections: expect.arrayContaining([
                'required_honesty',
                'evidence_layers',
                'coach_review',
                'workspace_audit',
            ]),
        });
        expect(JSON.stringify(packet)).not.toMatch(/certification|rank proof|guaranteed improvement|official PUBG/i);
    });
});
