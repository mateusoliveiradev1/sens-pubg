import { describe, expect, it } from 'vitest';

interface TeamCoachReportRedactionModule {
    readonly redactTeamCoachReportForWorkspace?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly assertTeamCoachReportCopySafe?: (copy: string) => void;
}

async function loadTeamCoachReportRedaction(): Promise<Required<TeamCoachReportRedactionModule>> {
    const modulePath = './team-coach-report-redaction';

    let teamCoachReportRedaction: TeamCoachReportRedactionModule;
    try {
        teamCoachReportRedaction = await import(modulePath) as TeamCoachReportRedactionModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Team Coach report redaction module at src/core/team-coach-report-redaction.ts.',
                'Expected team-safe output that preserves honesty fields and strips private account/payment/raw payload data.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof teamCoachReportRedaction.redactTeamCoachReportForWorkspace).toBe('function');
    expect(typeof teamCoachReportRedaction.assertTeamCoachReportCopySafe).toBe('function');

    return teamCoachReportRedaction as Required<TeamCoachReportRedactionModule>;
}

describe('Team Coach report redaction contract', () => {
    it('redacts private account, billing, raw analysis, private history, link reader, support, payment, and sensitive preparation data', async () => {
        const { redactTeamCoachReportForWorkspace } = await loadTeamCoachReportRedaction();

        const redacted = redactTeamCoachReportForWorkspace({
            id: 'analysis-1',
            privateAccountData: { email: 'player@example.com' },
            billingState: { stripeCustomerId: 'cus_123' },
            rawAnalysisPayload: { frames: [1, 2, 3] },
            privateHistory: [{ id: 'history-private' }],
            privateLinks: [{ token: 'secret' }],
            privateReaders: [{ userId: 'reader-1' }],
            supportNotes: [{ body: 'support private note' }],
            paymentMetadata: { invoiceId: 'in_123' },
            sensitivePreparation: { painHistory: 'private' },
            honesty: {
                confidence: 0.78,
                coverage: 0.81,
                blockers: ['distance_missing'],
                inconclusiveState: false,
                limitedSupport: ['optic_estimated'],
                validationState: 'validation_requested',
                noOverclaimDisclaimer: 'Sem certificacao, rank proof ou melhora garantida.',
            },
        });

        const serialized = JSON.stringify(redacted);

        expect(serialized).not.toContain('player@example.com');
        expect(serialized).not.toContain('cus_123');
        expect(serialized).not.toContain('frames');
        expect(serialized).not.toContain('history-private');
        expect(serialized).not.toContain('secret');
        expect(serialized).not.toContain('reader-1');
        expect(serialized).not.toContain('support private note');
        expect(serialized).not.toContain('in_123');
        expect(serialized).not.toContain('painHistory');
        expect(redacted.honesty).toMatchObject({
            confidence: 0.78,
            coverage: 0.81,
            blockers: ['distance_missing'],
            inconclusiveState: false,
            limitedSupport: ['optic_estimated'],
            validationState: 'validation_requested',
            noOverclaimDisclaimer: 'Sem certificacao, rank proof ou melhora garantida.',
        });
    });

    it('preserves mandatory honesty fields even when packet controls try to hide them', async () => {
        const { redactTeamCoachReportForWorkspace } = await loadTeamCoachReportRedaction();

        const redacted = redactTeamCoachReportForWorkspace({
            id: 'analysis-2',
            controls: {
                showConfidence: false,
                showCoverage: false,
                showBlockers: false,
                showInconclusiveState: false,
                showLimitedSupport: false,
                showValidationState: false,
                showDisclaimer: false,
                showCoachNotes: true,
            },
            honesty: {
                confidence: 0.64,
                coverage: 0.59,
                blockers: ['camera_motion'],
                inconclusiveState: true,
                limitedSupport: ['short_clip'],
                validationState: 'pending',
                noOverclaimDisclaimer: 'Team packet is evidence review, not certification.',
            },
        });

        expect(redacted.controls).toMatchObject({
            showConfidence: true,
            showCoverage: true,
            showBlockers: true,
            showInconclusiveState: true,
            showLimitedSupport: true,
            showValidationState: true,
            showDisclaimer: true,
            showCoachNotes: true,
        });
        expect(redacted.requiredHonestyFields).toEqual([
            'confidence',
            'coverage',
            'blockers',
            'inconclusive_state',
            'limited_support',
            'validation_state',
            'no_overclaim_disclaimer',
        ]);
    });

    it('keeps team-safe evidence layers separate and filters non-allowlisted sections', async () => {
        const { redactTeamCoachReportForWorkspace } = await loadTeamCoachReportRedaction();

        const redacted = redactTeamCoachReportForWorkspace({
            id: 'analysis-3',
            sourceSummary: {
                analysisSessionId: 'analysis-3',
                playerLabel: 'Player Alpha',
                weapon: 'Beryl',
                privateEmail: 'alpha@example.com',
            },
            sections: {
                technical_proof: { summary: 'Tracking had limited coverage.', sourceId: 'analysis-3' },
                training_execution: { summary: 'Spray Lab session completed.', sourceId: 'lab-1' },
                practical_transfer: { summary: 'TDM note only.', sourceId: null },
                compatible_validation: { summary: 'Validation pending.', sourceId: 'validation-1' },
                blockers: { summary: 'camera_motion' },
                repairs: { summary: 'repeat controlled clip' },
                coach_notes: { summary: 'Coach requested validation.' },
                current_state: { summary: 'waiting_player' },
                private_admin_notes: { body: 'do not expose' },
                payment_metadata: { invoice: 'in_123' },
            },
            honesty: {
                confidence: 0.71,
                coverage: 0.69,
                blockers: ['camera_motion'],
                inconclusiveState: false,
                limitedSupport: ['validation_pending'],
                validationState: 'pending',
                noOverclaimDisclaimer: 'Evidence review only.',
            },
        });

        expect(redacted.sourceSummary).toMatchObject({
            analysisSessionId: 'analysis-3',
            playerLabel: 'Player Alpha',
            weapon: 'Beryl',
        });
        expect(JSON.stringify(redacted.sourceSummary)).not.toContain('alpha@example.com');
        expect(Object.keys(redacted.sections as Record<string, unknown>)).toEqual([
            'technical_proof',
            'training_execution',
            'practical_transfer',
            'compatible_validation',
            'blockers',
            'repairs',
            'coach_notes',
            'current_state',
        ]);
        expect(JSON.stringify(redacted)).not.toContain('do not expose');
        expect(JSON.stringify(redacted)).not.toContain('in_123');
    });

    it('rejects Team report copy that claims certification, rank proof, guaranteed improvement, or official PUBG/KRAFTON status', async () => {
        const { assertTeamCoachReportCopySafe } = await loadTeamCoachReportRedaction();

        expect(() => assertTeamCoachReportCopySafe('Mesa do Coach organiza revisao com consentimento e evidencia limitada.')).not.toThrow();
        expect(() => assertTeamCoachReportCopySafe('Coach packet is rank proof for the player.')).toThrow();
        expect(() => assertTeamCoachReportCopySafe('Certificacao oficial PUBG da equipe.')).toThrow();
        expect(() => assertTeamCoachReportCopySafe('Melhora garantida depois do review.')).toThrow();
    });
});
