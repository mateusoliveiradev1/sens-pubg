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
        });
    });

    it('rejects Team report copy that claims certification, rank proof, guaranteed improvement, or official PUBG/KRAFTON status', async () => {
        const { assertTeamCoachReportCopySafe } = await loadTeamCoachReportRedaction();

        expect(() => assertTeamCoachReportCopySafe('Mesa do Coach organiza revisao com consentimento e evidencia limitada.')).not.toThrow();
        expect(() => assertTeamCoachReportCopySafe('Coach packet is rank proof for the player.')).toThrow();
        expect(() => assertTeamCoachReportCopySafe('Certificacao oficial PUBG da equipe.')).toThrow();
        expect(() => assertTeamCoachReportCopySafe('Melhora garantida depois do review.')).toThrow();
    });
});
