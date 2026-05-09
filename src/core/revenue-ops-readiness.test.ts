import { describe, expect, it } from 'vitest';

interface RevenueOpsReadinessModule {
    readonly buildPaidLaunchReadinessMatrix?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly evaluateRevenueOpsLaunchGates?: (input: Record<string, unknown>) => Record<string, unknown>;
    readonly revenueOpsEvidenceRowIds?: readonly string[];
}

async function loadReadinessModule(): Promise<Required<RevenueOpsReadinessModule>> {
    const modulePath = './revenue-ops-readiness';

    try {
        const readinessModule = await import(modulePath) as RevenueOpsReadinessModule;

        expect(typeof readinessModule.buildPaidLaunchReadinessMatrix).toBe('function');
        expect(typeof readinessModule.evaluateRevenueOpsLaunchGates).toBe('function');
        expect(Array.isArray(readinessModule.revenueOpsEvidenceRowIds)).toBe(true);

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
                { id: 'stripe_test_checkout', environment: 'test', status: 'PASS' },
                { id: 'stripe_test_webhook', environment: 'test', status: 'PASS' },
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

    it('uses safe degradation for paid-flow failures without granting everyone Pro', async () => {
        const { evaluateRevenueOpsLaunchGates } = await loadReadinessModule();

        const result = evaluateRevenueOpsLaunchGates({
            checkoutEnabled: false,
            entitlementSafeMode: true,
            preserveConfirmedPaidAccess: true,
            grantProToEveryone: false,
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
