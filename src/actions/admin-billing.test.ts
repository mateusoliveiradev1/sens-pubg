import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(join(process.cwd(), 'src/actions/admin-billing.ts'), 'utf8');

describe('admin billing action contract', () => {
    it('keeps billing mutations admin-only while support can read and note', () => {
        const code = source();

        expect(code).toMatch(/requireStaff/);
        expect(code).toMatch(/assertAdmin\(staff\.role\)/);
        expect(code).toMatch(/createManualProGrant/);
        expect(code).toMatch(/revokeManualProGrant/);
        expect(code).toMatch(/applyBillingSuspension/);
        expect(code).toMatch(/recordBillingSupportNote/);
        expect(code).toMatch(/diagnoseRevenueOpsSupport/);
        expect(code).toMatch(/buildRevenueOpsSafeSupportSummary/);
    });

    it('writes audit, billing, and analytics evidence for manual operations', () => {
        const code = source();

        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_GRANTED'/);
        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_REVOKED'/);
        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_SUSPENDED'/);
        expect(code).toMatch(/productBillingEvents/);
        expect(code).toMatch(/monetizationAnalyticsEvents/);
    });

    it('adds Revenue Ops diagnosis without weakening admin-only paid-state mutations', () => {
        const code = source();

        expect(code).toMatch(/diagnosis/);
        expect(code).toMatch(/supportSummary/);
        expect(code).toMatch(/processedStripeEvents/);
        expect(code.match(/assertAdmin\(staff\.role\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    });

    it('does not introduce affiliate payout or commission logic', () => {
        expect(source().toLowerCase()).not.toMatch(/commission|payout|affiliate/);
    });
});
