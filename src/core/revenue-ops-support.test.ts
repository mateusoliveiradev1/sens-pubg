import { describe, expect, it } from 'vitest';

import {
    buildRevenueOpsSafeSupportSummary,
    diagnoseRevenueOpsSupport,
    resolveProAccessCauseTree,
} from './revenue-ops-support';

describe('Revenue Ops support diagnosis', () => {
    it('resolves a first-true Pro no-access cause for every support domain family', () => {
        expect(resolveProAccessCauseTree({
            access: { accessState: 'free', billingStatus: 'none' },
            checkoutAttempts: [],
        })).toMatchObject({
            code: 'no_checkout',
            domain: 'pagamento',
            status: 'WARN',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'checkout_pending', billingStatus: 'checkout_pending' },
            checkoutAttempts: [{ id: 'checkout-1', status: 'created' }],
        })).toMatchObject({
            code: 'checkout_pending',
            domain: 'pagamento',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'free', billingStatus: 'none' },
            checkoutAttempts: [{ id: 'checkout-2', status: 'completed', completedAt: new Date() }],
            stripeEvents: [],
        })).toMatchObject({
            code: 'webhook_missing',
            domain: 'webhook',
            status: 'BLOCKED',
        });

        expect(resolveProAccessCauseTree({
            stripeEvents: [{ id: 'evt-1', stripeEventId: 'evt_bad', processingStatus: 'rejected' }],
        })).toMatchObject({
            code: 'webhook_rejected',
            domain: 'webhook',
        });

        expect(resolveProAccessCauseTree({
            stripeEvents: [{ id: 'evt-2', stripeEventId: 'evt_quarantine', processingStatus: 'quarantined' }],
        })).toMatchObject({
            code: 'webhook_quarantined',
            domain: 'webhook',
            status: 'NO-GO',
        });

        expect(resolveProAccessCauseTree({
            billingEvents: [{ id: 'billing-1', eventType: 'webhook.quarantine', metadata: { reason: 'price_mismatch' } }],
        })).toMatchObject({
            code: 'price_mismatch',
            domain: 'pagamento',
            status: 'NO-GO',
        });
    });

    it('distinguishes payment, entitlement, admin grant, auth, quota, and analysis blockers', () => {
        expect(resolveProAccessCauseTree({
            access: { accessState: 'past_due_grace', billingStatus: 'past_due' },
            subscriptions: [{ id: 'sub-grace', billingStatus: 'past_due', accessState: 'past_due_grace' }],
        })).toMatchObject({
            code: 'past_due_grace',
            status: 'WARN',
            nextSafeAction: expect.stringMatching(/Billing Portal/i),
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'past_due_blocked', billingStatus: 'past_due' },
            subscriptions: [{ id: 'sub-blocked', billingStatus: 'past_due', accessState: 'past_due_blocked' }],
        })).toMatchObject({
            code: 'past_due_blocked',
            status: 'BLOCKED',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'canceled', billingStatus: 'canceled' },
            subscriptions: [{ id: 'sub-canceled', billingStatus: 'canceled', accessState: 'canceled' }],
        })).toMatchObject({
            code: 'canceled',
            domain: 'pagamento',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'suspended', billingStatus: 'suspended' },
            subscriptions: [{ id: 'sub-suspended', billingStatus: 'suspended', accessState: 'suspended' }],
        })).toMatchObject({
            code: 'suspended',
            domain: 'entitlement',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'manual_grant_expired', billingStatus: 'manual_grant' },
            grants: [{ id: 'grant-1', status: 'expired', reasonCode: 'beta_end' }],
        })).toMatchObject({
            code: 'manual_grant_expired',
            domain: 'admin_grant',
        });

        expect(resolveProAccessCauseTree({
            access: { accessState: 'free', billingStatus: 'none' },
            auth: { expectedUserId: 'user-a', sessionUserId: 'user-b' },
        })).toMatchObject({
            code: 'auth_mismatch',
            domain: 'auth',
        });

        expect(resolveProAccessCauseTree({
            access: {
                accessState: 'free_limit_reached',
                billingStatus: 'none',
                quota: { state: 'limit_reached', reason: 'limit_blocked' },
            },
            quotaEntries: [{ id: 'quota-1', state: 'limit_reached', reasonCode: 'limit_blocked' }],
        })).toMatchObject({
            code: 'quota_limit',
            domain: 'quota',
        });

        expect(resolveProAccessCauseTree({
            billingEvents: [{ id: 'event-1', eventType: 'analysis_save_failed', targetType: 'quota' }],
        })).toMatchObject({
            code: 'analysis_save_issue',
            domain: 'analise',
        });
    });

    it('returns a domain-first diagnosis with safe summary copy and no private leakage', () => {
        const diagnosis = diagnoseRevenueOpsSupport({
            access: {
                accessState: 'free',
                billingStatus: 'none',
                quota: { state: 'available', reason: null },
            },
            checkoutAttempts: [],
            billingEvents: [{
                id: 'event-raw',
                eventType: 'support.context',
                metadata: {
                    privateNote: 'Do not leak this note',
                    paymentCard: '4242',
                    safeReasonCode: 'support_case',
                },
            }],
        });
        const safeSummary = buildRevenueOpsSafeSupportSummary(diagnosis.firstCause);
        const serialized = JSON.stringify(diagnosis).toLowerCase();

        expect(diagnosis.firstCause.code).toBe('no_checkout');
        expect(diagnosis.domains.map((item) => item.domain)).toEqual([
            'pagamento',
            'entitlement',
            'auth',
            'quota',
            'analise',
            'webhook',
            'admin_grant',
        ]);
        expect(diagnosis.domains.find((item) => item.domain === 'pagamento')).toMatchObject({
            status: 'WARN',
            firstCause: expect.objectContaining({ code: 'no_checkout' }),
        });
        expect(safeSummary).toContain('Revenue Ops diagnosis: no_checkout');
        expect(safeSummary).toContain('Next safe action:');
        expect(serialized).not.toContain('do not leak this note');
        expect(serialized).not.toContain('4242');
    });
});
