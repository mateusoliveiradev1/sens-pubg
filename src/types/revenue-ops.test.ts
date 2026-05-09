import { describe, expect, it } from 'vitest';

import {
    assertRevenueOpsPayloadSafe,
    findUnsafeRevenueOpsFields,
    parseRevenueOpsDetailReason,
    parseRevenueOpsEvidenceStatus,
    parseRevenueOpsFunnelMetricKey,
    parseRevenueOpsLaunchGate,
    parseRevenueOpsOperationalStatus,
    parseRevenueOpsProAccessCauseCode,
    parseRevenueOpsSupportDomain,
    revenueOpsDetailReasonValues,
    revenueOpsEvidenceStatusValues,
    revenueOpsFunnelMetricKeyValues,
    revenueOpsLaunchGateValues,
    revenueOpsOperationalStatusValues,
    revenueOpsProAccessCauseCodeValues,
    revenueOpsSupportDomainValues,
    sanitizeRevenueOpsRecord,
} from './revenue-ops';

describe('Revenue Ops type contracts', () => {
    it('defines stable operational, launch, evidence, and metric states', () => {
        expect(revenueOpsOperationalStatusValues).toEqual([
            'PASS',
            'WARN',
            'BLOCKED',
            'NO-GO',
            'FAIL',
        ]);
        expect(revenueOpsLaunchGateValues).toEqual([
            'founder_beta_launch',
            'public_paid_launch',
        ]);
        expect(revenueOpsEvidenceStatusValues).toEqual([
            'PASS',
            'WARN',
            'FAIL',
            'BLOCKED',
            'PENDING',
            'MISSING',
        ]);
        expect(revenueOpsFunnelMetricKeyValues).toEqual([
            'first_usable_analysis',
            'upgrade_intent',
            'checkout_started',
            'checkout_confirmed',
            'pro_active',
            'churn_cancellation',
            'quota_limit_hit',
            'pro_value_usage',
        ]);

        expect(parseRevenueOpsOperationalStatus('NO-GO')).toBe('NO-GO');
        expect(parseRevenueOpsLaunchGate('public_paid_launch')).toBe('public_paid_launch');
        expect(parseRevenueOpsEvidenceStatus('BLOCKED')).toBe('BLOCKED');
        expect(parseRevenueOpsFunnelMetricKey('upgrade_intent')).toBe('upgrade_intent');
        expect(() => parseRevenueOpsOperationalStatus('READY')).toThrow();
    });

    it('limits user-detail reasons, support domains, and Pro no-access causes to explicit operational codes', () => {
        expect(revenueOpsDetailReasonValues).toEqual([
            'support_case',
            'webhook_failure',
            'quota_issue',
            'entitlement_mismatch',
            'payment_issue',
            'auth_issue',
            'analysis_save_issue',
            'admin_grant_review',
            'reconciliation_request',
        ]);
        expect(revenueOpsSupportDomainValues).toEqual([
            'pagamento',
            'entitlement',
            'auth',
            'quota',
            'analise',
            'webhook',
            'admin_grant',
        ]);
        expect(revenueOpsProAccessCauseCodeValues).toEqual(expect.arrayContaining([
            'no_checkout',
            'checkout_pending',
            'webhook_missing',
            'webhook_rejected',
            'webhook_quarantined',
            'price_mismatch',
            'past_due_grace',
            'past_due_blocked',
            'canceled',
            'unpaid',
            'suspended',
            'manual_grant_expired',
            'safe_mode',
            'entitlement_missing',
            'auth_mismatch',
            'quota_limit',
            'analysis_save_issue',
        ]));

        expect(parseRevenueOpsDetailReason('support_case')).toBe('support_case');
        expect(parseRevenueOpsSupportDomain('webhook')).toBe('webhook');
        expect(parseRevenueOpsProAccessCauseCode('price_mismatch')).toBe('price_mismatch');
        expect(() => parseRevenueOpsDetailReason('curiosity')).toThrow();
        expect(() => parseRevenueOpsSupportDomain('financeiro_total')).toThrow();
    });

    it('sanitizes raw clip, analysis, private link, payment, address, bank, and financial fields', () => {
        const unsafe = {
            safeCount: 3,
            nested: {
                rawVideo: 'clip.mp4',
                frameTrajectory: [1, 2, 3],
                rawAnalysisPayload: { secret: 'trajectory' },
                privateLinkToken: 'token',
                privateReaderEmail: 'reader@example.com',
                paymentCard: '4242',
                addressLine: 'private',
                bankAccount: 'private',
                financialMetadata: 'private revenue',
                allowedReasonCode: 'quota_limit',
            },
        };

        expect(findUnsafeRevenueOpsFields(unsafe)).toEqual(expect.arrayContaining([
            'root.nested.rawVideo',
            'root.nested.frameTrajectory',
            'root.nested.rawAnalysisPayload',
            'root.nested.privateLinkToken',
            'root.nested.privateReaderEmail',
            'root.nested.paymentCard',
            'root.nested.addressLine',
            'root.nested.bankAccount',
            'root.nested.financialMetadata',
        ]));

        const sanitized = sanitizeRevenueOpsRecord(unsafe);

        expect(sanitized).toMatchObject({
            safeCount: 3,
            nested: {
                allowedReasonCode: 'quota_limit',
            },
        });
        expect(JSON.stringify(sanitized).toLowerCase()).not.toMatch(/clip\.mp4|4242|reader@example|trajectory|bank|revenue/);
        expect(() => assertRevenueOpsPayloadSafe(sanitized)).not.toThrow();
        expect(() => assertRevenueOpsPayloadSafe(unsafe)).toThrow(/Unsafe Revenue Ops payload/);
    });
});
