import { describe, expect, it } from 'vitest';

import { resolveMonetizationFlags } from '@/lib/monetization-flags';

interface RevenueOpsReadinessModule {
    readonly buildPaidLaunchReadinessMatrix?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly evaluateRevenueOpsLaunchGates?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly revenueOpsEvidenceRowIds?: readonly string[];
    readonly revenueOpsEvidenceRowDefinitions?: readonly {
        readonly id: string;
        readonly environment: string;
        readonly owner: string;
    }[];
}

async function loadReadinessModule(): Promise<Required<RevenueOpsReadinessModule>> {
    const modulePath = './revenue-ops-readiness';

    try {
        const readinessModule = await import(modulePath) as RevenueOpsReadinessModule;

        expect(typeof readinessModule.buildPaidLaunchReadinessMatrix).toBe('function');
        expect(typeof readinessModule.evaluateRevenueOpsLaunchGates).toBe('function');
        expect(Array.isArray(readinessModule.revenueOpsEvidenceRowIds)).toBe(true);
        expect(Array.isArray(readinessModule.revenueOpsEvidenceRowDefinitions)).toBe(true);

        return readinessModule as Required<RevenueOpsReadinessModule>;
    } catch (error) {
        throw new Error(
            [
                'Missing Revenue Ops readiness module at src/core/revenue-ops-readiness.ts.',
                'Phase 12 expects paid launch gates, versioned evidence rows, Stripe test/production separation, and safe degradation before Delivered can pass.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }
}

function completeEvidenceRows(definitions: Required<RevenueOpsReadinessModule>['revenueOpsEvidenceRowDefinitions']) {
    return definitions.map((definition) => ({
        id: definition.id,
        environment: definition.environment,
        expectedState: `Expected ${definition.id}`,
        observedEvidence: `Observed ${definition.id}`,
        actor: 'ops@example.test',
        checkedAt: '2026-05-10',
        owner: definition.owner,
        rollback: `Rollback ${definition.id}`,
        status: 'PASS',
        remainingGap: 'None',
    }));
}

describe('Revenue Ops paid launch readiness contract', () => {
    it('declares required paid-flow, deploy, support, privacy, and command evidence rows', async () => {
        const { revenueOpsEvidenceRowIds } = await loadReadinessModule();

        expect(revenueOpsEvidenceRowIds).toEqual(expect.arrayContaining([
            'paid_flow.test_mode_matrix',
            'paid_flow.production_matrix',
            'paid_flow.safe_degradation',
            'launch.founder_beta_gate',
            'launch.public_paid_gate',
            'launch.no_go_copy',
            'commands.typecheck',
            'commands.vitest',
            'commands.benchmark_gate',
            'commands.build',
            'commands.readiness_deploy',
        ]));
    });

    it('keeps test and production Stripe evidence separate and blocks inherited production PASS', async () => {
        const { buildPaidLaunchReadinessMatrix } = await loadReadinessModule();

        const matrix = buildPaidLaunchReadinessMatrix({
            evidence: [
                {
                    id: 'stripe_test_checkout',
                    environment: 'test',
                    expectedState: 'Checkout opens in Stripe test mode.',
                    observedEvidence: 'Stripe test checkout session cs_test_123',
                    actor: 'founder-test@example.test',
                    checkedAt: '2026-05-10',
                    owner: 'ops',
                    rollback: 'Disable checkout_enabled.',
                    status: 'PASS',
                    remainingGap: 'None',
                },
                {
                    id: 'stripe_test_webhook',
                    environment: 'test',
                    expectedState: 'Signed test webhook confirms Pro.',
                    observedEvidence: 'processed_stripe_events evt_test_123',
                    actor: 'founder-test@example.test',
                    checkedAt: '2026-05-10',
                    owner: 'engineering',
                    rollback: 'Disable checkout_enabled and replay signed event.',
                    status: 'PASS',
                    remainingGap: 'None',
                },
            ],
        });

        expect(matrix).toMatchObject({
            stripe: {
                test: { status: 'PASS' },
                production: {
                    status: expect.stringMatching(/BLOCKED|NO-GO|FAIL|PENDING/),
                },
            },
        });
        expect(JSON.stringify(matrix).toLowerCase()).toContain('production');
        expect(JSON.stringify(matrix).toLowerCase()).not.toMatch(/production[^}]+pass[^}]+inherited/);
    });

    it('blocks PASS evidence rows that omit actor or rollback evidence', async () => {
        const { buildPaidLaunchReadinessMatrix } = await loadReadinessModule();

        const matrix = buildPaidLaunchReadinessMatrix({
            evidence: [
                {
                    id: 'paid_flow.test_mode_matrix',
                    environment: 'stripe_test',
                    expectedState: 'All Stripe test rows pass.',
                    observedEvidence: 'Stripe test dashboard evidence.',
                    checkedAt: '2026-05-10',
                    owner: 'ops',
                    status: 'PASS',
                    remainingGap: 'None',
                },
            ],
        });

        expect(matrix).toMatchObject({
            rows: [
                {
                    id: 'paid_flow.test_mode_matrix',
                    status: 'BLOCKED',
                    validationIssues: expect.arrayContaining([
                        expect.stringContaining('actor'),
                        expect.stringContaining('rollback'),
                    ]),
                },
            ],
        });
    });

    it('requires explicit remaining gaps for non-pass rows', async () => {
        const { buildPaidLaunchReadinessMatrix } = await loadReadinessModule();

        const matrix = buildPaidLaunchReadinessMatrix({
            evidence: [
                {
                    id: 'launch.public_paid_gate',
                    environment: 'stripe_production',
                    expectedState: 'Public launch gate passes.',
                    observedEvidence: 'Production smoke still unavailable.',
                    actor: 'ops@example.test',
                    checkedAt: '2026-05-10',
                    owner: 'founder',
                    rollback: 'Keep checkout disabled.',
                    status: 'BLOCKED',
                    remainingGap: '',
                },
            ],
        });

        expect(matrix).toMatchObject({
            rowsNeedingExplicitGaps: ['launch.public_paid_gate'],
            publicPaidLaunch: {
                status: 'NO-GO',
            },
        });
    });

    it('derives Delivered only when every mandatory evidence definition is PASS', async () => {
        const { evaluateRevenueOpsLaunchGates, revenueOpsEvidenceRowDefinitions } = await loadReadinessModule();
        const result = evaluateRevenueOpsLaunchGates({
            evidence: completeEvidenceRows(revenueOpsEvidenceRowDefinitions),
        });

        expect(result).toMatchObject({
            founderBetaLaunch: { status: 'PASS' },
            publicPaidLaunch: { status: 'PASS' },
            finalStatus: 'Delivered',
        });
    });

    it('allows beta readiness while production evidence keeps public launch at no-go', async () => {
        const { evaluateRevenueOpsLaunchGates, revenueOpsEvidenceRowDefinitions } = await loadReadinessModule();
        const rows = completeEvidenceRows(revenueOpsEvidenceRowDefinitions)
            .filter((row) => row.environment !== 'stripe_production');

        const result = evaluateRevenueOpsLaunchGates({ evidence: rows });

        expect(result).toMatchObject({
            founderBetaLaunch: { status: 'PASS' },
            publicPaidLaunch: { status: 'NO-GO' },
            finalStatus: 'Blocked',
        });
    });

    it('uses safe degradation for paid-flow failures without granting everyone Pro', async () => {
        const { evaluateRevenueOpsLaunchGates } = await loadReadinessModule();
        const flags = resolveMonetizationFlags({
            overrides: [
                { key: 'checkout_enabled', enabled: true, source: 'test' },
                { key: 'entitlement_safe_mode', enabled: true, source: 'test', auditRef: 'flag-audit-1' },
            ],
            environment: 'production',
        });

        const result = evaluateRevenueOpsLaunchGates({
            ...flags,
            missingEvidence: ['production webhook smoke'],
        });

        expect(result).toMatchObject({
            safeDegradation: {
                checkoutClosed: true,
                preserveConfirmedPaidAccess: true,
                keepFreeUseful: true,
                grantProToEveryone: false,
            },
            publicPaidLaunch: {
                status: expect.stringMatching(/NO-GO|BLOCKED/),
            },
        });
    });
});
