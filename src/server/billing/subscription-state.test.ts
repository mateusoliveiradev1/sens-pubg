import { describe, expect, it } from 'vitest';

import {
    normalizeSubscriptionState,
    stripeSecondsToDate,
} from './subscription-state';

const now = new Date('2026-05-06T12:00:00.000Z');
const yesterday = new Date('2026-05-05T12:00:00.000Z');
const tomorrow = new Date('2026-05-07T12:00:00.000Z');
const lastWeek = new Date('2026-04-29T12:00:00.000Z');
const nextWeek = new Date('2026-05-13T12:00:00.000Z');

describe('subscription lifecycle normalization', () => {
    it('keeps active paid subscriptions on Pro access', () => {
        const result = normalizeSubscriptionState({
            status: 'active',
            currentPeriodStart: yesterday,
            currentPeriodEnd: tomorrow,
            now,
        });

        expect(result).toMatchObject({
            shouldApply: true,
            billingStatus: 'active',
            accessState: 'pro_active',
            reason: 'active_paid_window',
        });
    });

    it('keeps canceled-at-period-end access until the current period ends', () => {
        const result = normalizeSubscriptionState({
            status: 'active',
            currentPeriodStart: yesterday,
            currentPeriodEnd: tomorrow,
            cancelAtPeriodEnd: true,
            now,
        });

        expect(result).toMatchObject({
            accessState: 'canceling',
            cancelAtPeriodEnd: true,
        });
    });

    it('allows past_due access for three days and blocks after grace', () => {
        const grace = normalizeSubscriptionState({
            status: 'past_due',
            currentPeriodStart: lastWeek,
            currentPeriodEnd: yesterday,
            now,
        });
        const blocked = normalizeSubscriptionState({
            status: 'past_due',
            currentPeriodStart: lastWeek,
            currentPeriodEnd: lastWeek,
            now,
        });

        expect(grace.accessState).toBe('past_due_grace');
        expect(grace.graceEndsAt).toEqual(new Date('2026-05-08T12:00:00.000Z'));
        expect(blocked.accessState).toBe('past_due_blocked');
    });

    it('revokes access for terminal statuses without a paid window', () => {
        const result = normalizeSubscriptionState({
            status: 'unpaid',
            currentPeriodEnd: tomorrow,
            now,
        });

        expect(result).toMatchObject({
            billingStatus: 'unpaid',
            accessState: 'canceled',
            reason: 'no_valid_paid_window',
        });
    });

    it('makes fraud and dispute suspension override active subscription state', () => {
        const result = normalizeSubscriptionState({
            status: 'active',
            currentPeriodStart: yesterday,
            currentPeriodEnd: nextWeek,
            suspensionReason: 'chargeback',
            now,
        });

        expect(result).toMatchObject({
            billingStatus: 'suspended',
            accessState: 'suspended',
            suspensionReason: 'chargeback',
            reason: 'suspension_overrides_subscription',
        });
        expect(result.suspendedAt).toEqual(now);
    });

    it('does not let an older active period reopen a terminal state', () => {
        const result = normalizeSubscriptionState({
            status: 'active',
            currentPeriodStart: lastWeek,
            currentPeriodEnd: yesterday,
            previousCurrentPeriodEnd: nextWeek,
            previousAccessState: 'canceled',
            now,
        });

        expect(result).toMatchObject({
            shouldApply: false,
            accessState: 'canceled',
            reason: 'ignored_older_period_after_terminal_state',
        });
    });

    it('converts Stripe timestamp seconds to Dates', () => {
        expect(stripeSecondsToDate(1_778_072_400)).toEqual(new Date('2026-05-06T13:00:00.000Z'));
        expect(stripeSecondsToDate(undefined)).toBeNull();
    });
});
