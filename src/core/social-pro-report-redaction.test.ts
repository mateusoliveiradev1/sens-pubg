import { describe, expect, it } from 'vitest';

interface SocialProReportRedactionModule {
    readonly redactSocialProReportForPublic?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly sanitizeSocialProReportControls?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly assertSocialProReportCopySafe?: (copy: string) => void;
}

async function loadRedactionModule(): Promise<Required<SocialProReportRedactionModule>> {
    const modulePath = './social-pro-report-redaction';

    let socialProModule: SocialProReportRedactionModule;
    try {
        socialProModule = await import(modulePath) as SocialProReportRedactionModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro report redaction module at src/core/social-pro-report-redaction.ts.',
                'Expected public-safe allowlist, required honesty preservation, and copy-safety helpers.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof socialProModule.redactSocialProReportForPublic).toBe('function');
    expect(typeof socialProModule.sanitizeSocialProReportControls).toBe('function');
    expect(typeof socialProModule.assertSocialProReportCopySafe).toBe('function');

    return socialProModule as Required<SocialProReportRedactionModule>;
}

function createPrivateReportFixture(): Record<string, unknown> {
    return {
        id: 'report-1',
        visibility: 'public',
        status: 'published',
        publicSummary: {
            title: 'Beryl 3x evolution case',
            whatChanged: 'Vertical control stabilized after a compatible validation block.',
            nextAction: 'Continue Ciclo Pro and record another compatible validation.',
        },
        honesty: {
            confidence: 0.82,
            coverage: 0.79,
            blockers: ['limited distance sample'],
            inconclusiveState: false,
            limitedSupport: ['single weapon context'],
            validationState: 'compatible_validation_pending',
            noOverclaimDisclaimer: 'Evidence supports a training decision, not a guaranteed rank result.',
        },
        controls: {
            showConfidence: false,
            showCoverage: false,
            showBlockers: false,
            showValidationState: false,
            showDisclaimer: false,
            showTimeline: true,
        },
        ownerAccount: {
            email: 'player@example.com',
            discordId: 'discord-private-1',
            billingCustomerId: 'cus_private',
        },
        internalNotes: 'manual moderation note and support escalation',
        privateCollections: [
            { id: 'collection-1', name: 'private repair clips' },
        ],
        privateReaders: [
            { userId: 'reader-private-1', email: 'reader@example.com' },
        ],
        paymentState: {
            stripeSubscriptionId: 'sub_private',
            cardLast4: '4242',
        },
        hiddenHistory: [
            { id: 'history-hidden-1', diagnosis: 'private hidden analysis' },
        ],
        rawPrivateAnalysis: {
            trajectory: [{ x: 1, y: 2 }],
            fullResult: 'raw trajectory payload',
        },
        preparationNotes: {
            pain: 'wrist pain details',
            numbness: 'private health note',
            routine: 'private physical preparation routine',
        },
        futurePrivatePayload: {
            privateScrimInvite: 'future private field that must not leak',
            hiddenReaderSegment: 'future reader cohort',
        },
    };
}

describe('Social Pro public report redaction', () => {
    it('preserves required honesty while removing private account, payment, reader, history, raw analysis, and health details', async () => {
        const { redactSocialProReportForPublic } = await loadRedactionModule();

        const publicReport = redactSocialProReportForPublic(createPrivateReportFixture());
        const serialized = JSON.stringify(publicReport).toLowerCase();

        expect(publicReport).toMatchObject({
            honesty: {
                confidence: 0.82,
                coverage: 0.79,
                blockers: ['limited distance sample'],
                inconclusiveState: false,
                limitedSupport: ['single weapon context'],
                validationState: 'compatible_validation_pending',
                noOverclaimDisclaimer: expect.stringMatching(/not a guaranteed rank result/i),
            },
        });
        expect(serialized).not.toContain('player@example.com');
        expect(serialized).not.toContain('discord-private-1');
        expect(serialized).not.toContain('manual moderation note');
        expect(serialized).not.toContain('private repair clips');
        expect(serialized).not.toContain('reader-private-1');
        expect(serialized).not.toContain('cus_private');
        expect(serialized).not.toContain('sub_private');
        expect(serialized).not.toContain('4242');
        expect(serialized).not.toContain('history-hidden-1');
        expect(serialized).not.toContain('raw trajectory payload');
        expect(serialized).not.toContain('wrist pain');
        expect(serialized).not.toContain('numbness');
        expect(serialized).not.toContain('future private field');
        expect(serialized).not.toContain('future reader cohort');
    });

    it('forces public controls to keep confidence, coverage, blockers, validation state, and no-overclaim disclaimers visible', async () => {
        const { sanitizeSocialProReportControls } = await loadRedactionModule();

        const controls = sanitizeSocialProReportControls({
            showConfidence: false,
            showCoverage: false,
            showBlockers: false,
            showInconclusiveState: false,
            showLimitedSupport: false,
            showValidationState: false,
            showDisclaimer: false,
            showTimeline: true,
        });

        expect(controls).toMatchObject({
            showConfidence: true,
            showCoverage: true,
            showBlockers: true,
            showInconclusiveState: true,
            showLimitedSupport: true,
            showValidationState: true,
            showDisclaimer: true,
            showTimeline: true,
        });
    });

    it('rejects public report copy that overclaims, implies paid authority, or sells PUBG API-derived exclusivity', async () => {
        const { assertSocialProReportCopySafe } = await loadRedactionModule();
        const disallowedClaims = [
            'sensibilidade perfeita',
            'guaranteed rank',
            'global player grade',
            'official PUBG report',
            'KRAFTON partner',
            'paid players are better',
            'creator certified by Pro payment',
            'exclusive PUBG API data',
            'TDM proves technical improvement',
        ];

        for (const claim of disallowedClaims) {
            expect(() => assertSocialProReportCopySafe(claim), claim).toThrow();
        }

        expect(() => assertSocialProReportCopySafe(
            'Relatorio Pro organiza analise, coach, historico, Spray Lab, Ciclo Pro, validacao compativel e bloqueios sem prometer resultado.',
        )).not.toThrow();
    });
});
