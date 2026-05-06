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
    });

    it('writes audit, billing, and analytics evidence for manual operations', () => {
        const code = source();

        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_GRANTED'/);
        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_REVOKED'/);
        expect(code).toMatch(/recordAuditLog\('ENTITLEMENT_SUSPENDED'/);
        expect(code).toMatch(/productBillingEvents/);
        expect(code).toMatch(/monetizationAnalyticsEvents/);
    });

    it('does not introduce affiliate payout or commission logic', () => {
        expect(source().toLowerCase()).not.toMatch(/commission|payout|affiliate/);
    });
});
