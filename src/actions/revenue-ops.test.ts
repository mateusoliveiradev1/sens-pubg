import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(join(process.cwd(), 'src/actions/revenue-ops.ts'), 'utf8');

describe('Revenue Ops action contract', () => {
    it('exposes staff-only aggregate cockpit and support diagnosis actions', () => {
        const code = source();

        expect(code).toMatch(/requireRevenueOpsStaff/);
        expect(code).toMatch(/getRevenueOpsCockpitSnapshot/);
        expect(code).toMatch(/getRevenueOpsSupportSnapshot/);
        expect(code).toMatch(/createRevenueOpsSupportNote/);
        expect(code).toMatch(/copyRevenueOpsSafeSupportSummary/);
        expect(code).toMatch(/requestRevenueOpsAdminReconciliation/);
        expect(code).toMatch(/role !== 'admin' && role !== 'support' && role !== 'mod'/);
    });

    it('keeps aggregate funnel loading separate from user-level detail reasons', () => {
        const code = source();

        expect(code).toMatch(/buildRevenueOpsFunnelSnapshot/);
        expect(code).toMatch(/aggregateOnly/);
        expect(code).toMatch(/detailReason/);
        expect(code).toMatch(/User-level Revenue Ops detail requires an operational detail reason/);
        expect(code).toMatch(/revenueOpsDetailReasonSchema/);
    });

    it('uses existing monetization truth tables without trusting URL, localStorage, or client state', () => {
        const code = source();

        for (const table of [
            'monetizationAnalyticsEvents',
            'productCheckoutAttempts',
            'productSubscriptions',
            'processedStripeEvents',
            'productQuotaLedger',
            'productBillingEvents',
            'productSupportNotes',
            'productUserGrants',
        ]) {
            expect(code).toContain(table);
        }

        expect(code).not.toMatch(/localStorage/);
        expect(code).not.toMatch(/successUrl.*grant|grant.*successUrl/);
        expect(code).not.toMatch(/clientState.*grant|grant.*clientState/);
    });

    it('lets support create notes and request admin reconciliation without paid-state mutation', () => {
        const code = source();

        expect(code).toMatch(/revenue_ops\.support_note_created/);
        expect(code).toMatch(/revenue_ops\.admin_reconciliation_requested/);
        expect(code).toMatch(/without mutating paid state/);
        expect(code).not.toMatch(/createManualProGrant/);
        expect(code).not.toMatch(/revokeManualProGrant/);
        expect(code).not.toMatch(/applyBillingSuspension/);
    });

    it('sanitizes action outputs before returning staff-facing payloads', () => {
        const code = source();

        expect(code.match(/sanitizeRevenueOpsRecord/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
        expect(code).not.toMatch(/rawVideo|frameTrajectory|privateLinkToken|paymentCard|bankAccount/);
    });
});
