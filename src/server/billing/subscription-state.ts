import type {
    BillingStatus,
    ProductAccessState,
    ProductTier,
} from '@/types/monetization';

export type StripeSubscriptionStatusInput =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'paused';

export interface SubscriptionPeriodInput {
    readonly status: StripeSubscriptionStatusInput;
    readonly tier?: Exclude<ProductTier, 'free'>;
    readonly currentPeriodStart?: Date | null;
    readonly currentPeriodEnd?: Date | null;
    readonly cancelAtPeriodEnd?: boolean;
    readonly previousCurrentPeriodEnd?: Date | null;
    readonly previousAccessState?: ProductAccessState | null;
    readonly suspensionReason?: 'fraud' | 'chargeback' | 'abuse' | 'manual' | null;
    readonly now?: Date;
}

export interface NormalizedSubscriptionState {
    readonly shouldApply: boolean;
    readonly billingStatus: BillingStatus;
    readonly accessState: ProductAccessState;
    readonly tier: Exclude<ProductTier, 'free'>;
    readonly currentPeriodStart: Date | null;
    readonly currentPeriodEnd: Date | null;
    readonly cancelAtPeriodEnd: boolean;
    readonly graceEndsAt: Date | null;
    readonly suspendedAt: Date | null;
    readonly suspensionReason: string | null;
    readonly reason: string;
}

const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function stripeSecondsToDate(value: number | null | undefined): Date | null {
    if (typeof value !== 'number') {
        return null;
    }

    return new Date(value * 1000);
}

function isOlderPeriod(input: SubscriptionPeriodInput): boolean {
    const incomingEnd = input.currentPeriodEnd?.getTime();
    const previousEnd = input.previousCurrentPeriodEnd?.getTime();

    return typeof incomingEnd === 'number'
        && typeof previousEnd === 'number'
        && incomingEnd < previousEnd;
}

function isTerminalAccessState(state: ProductAccessState | null | undefined): state is ProductAccessState {
    return state === 'canceled' || state === 'suspended' || state === 'past_due_blocked';
}

export function normalizeSubscriptionState(
    input: SubscriptionPeriodInput,
): NormalizedSubscriptionState {
    const now = input.now ?? new Date();
    const tier = input.tier ?? 'pro';
    const currentPeriodStart = input.currentPeriodStart ?? null;
    const currentPeriodEnd = input.currentPeriodEnd ?? null;
    const cancelAtPeriodEnd = input.cancelAtPeriodEnd === true;

    if (input.suspensionReason) {
        return {
            shouldApply: true,
            billingStatus: 'suspended',
            accessState: 'suspended',
            tier,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            graceEndsAt: null,
            suspendedAt: now,
            suspensionReason: input.suspensionReason,
            reason: 'suspension_overrides_subscription',
        };
    }

    const previousAccessState = input.previousAccessState;
    if (isOlderPeriod(input) && isTerminalAccessState(previousAccessState)) {
        return {
            shouldApply: false,
            billingStatus: input.status,
            accessState: previousAccessState,
            tier,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            graceEndsAt: null,
            suspendedAt: null,
            suspensionReason: null,
            reason: 'ignored_older_period_after_terminal_state',
        };
    }

    if ((input.status === 'active' || input.status === 'trialing') && currentPeriodEnd && currentPeriodEnd > now) {
        return {
            shouldApply: !isOlderPeriod(input),
            billingStatus: input.status,
            accessState: cancelAtPeriodEnd
                ? 'canceling'
                : tier === 'founder'
                    ? 'founder_active'
                    : 'pro_active',
            tier,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            graceEndsAt: null,
            suspendedAt: null,
            suspensionReason: null,
            reason: isOlderPeriod(input) ? 'ignored_older_active_period' : 'active_paid_window',
        };
    }

    if (input.status === 'past_due') {
        const base = currentPeriodEnd ?? now;
        const graceEndsAt = new Date(base.getTime() + PAST_DUE_GRACE_MS);
        const inGrace = graceEndsAt > now;

        return {
            shouldApply: !isOlderPeriod(input),
            billingStatus: 'past_due',
            accessState: inGrace ? 'past_due_grace' : 'past_due_blocked',
            tier,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            graceEndsAt,
            suspendedAt: null,
            suspensionReason: null,
            reason: inGrace ? 'past_due_grace' : 'past_due_grace_expired',
        };
    }

    return {
        shouldApply: !isOlderPeriod(input),
        billingStatus: input.status,
        accessState: 'canceled',
        tier,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        graceEndsAt: null,
        suspendedAt: null,
        suspensionReason: null,
        reason: isOlderPeriod(input) ? 'ignored_older_terminal_period' : 'no_valid_paid_window',
    };
}
