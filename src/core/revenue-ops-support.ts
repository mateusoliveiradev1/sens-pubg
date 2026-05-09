import type { ProductAccessResolution } from '@/lib/product-entitlements';
import type {
    BillingStatus,
    ProductAccessState,
    ProductQuotaState,
    QuotaReasonCode,
} from '@/types/monetization';
import {
    sanitizeRevenueOpsRecord,
    type RevenueOpsOperationalStatus,
    type RevenueOpsProAccessCauseCode,
    type RevenueOpsSupportDomain,
} from '@/types/revenue-ops';

export interface RevenueOpsSupportAccessFact {
    readonly effectiveTier?: string | null;
    readonly accessState?: ProductAccessState | string | null;
    readonly billingStatus?: BillingStatus | string | null;
    readonly source?: string | null;
    readonly quota?: {
        readonly state?: ProductQuotaState | string | null;
        readonly reason?: QuotaReasonCode | string | null;
        readonly used?: number | null;
        readonly limit?: number | null;
        readonly remaining?: number | null;
    } | null;
    readonly blockers?: readonly {
        readonly code?: string | null;
        readonly message?: string | null;
    }[];
}

export interface RevenueOpsCheckoutFact {
    readonly id?: string | null;
    readonly status?: string | null;
    readonly internalPriceKey?: string | null;
    readonly metadata?: Record<string, unknown> | null;
    readonly completedAt?: Date | string | null;
}

export interface RevenueOpsWebhookFact {
    readonly id?: string | null;
    readonly stripeEventId?: string | null;
    readonly eventType?: string | null;
    readonly processingStatus?: string | null;
    readonly errorMessage?: string | null;
    readonly metadata?: Record<string, unknown> | null;
}

export interface RevenueOpsSubscriptionFact {
    readonly id?: string | null;
    readonly billingStatus?: BillingStatus | string | null;
    readonly accessState?: ProductAccessState | string | null;
    readonly internalPriceKey?: string | null;
    readonly cancelAtPeriodEnd?: boolean | null;
    readonly suspendedAt?: Date | string | null;
    readonly suspensionReason?: string | null;
}

export interface RevenueOpsGrantFact {
    readonly id?: string | null;
    readonly status?: string | null;
    readonly reasonCode?: string | null;
    readonly endsAt?: Date | string | null;
}

export interface RevenueOpsQuotaFact {
    readonly id?: string | null;
    readonly state?: ProductQuotaState | string | null;
    readonly reasonCode?: QuotaReasonCode | string | null;
    readonly amount?: number | null;
}

export interface RevenueOpsBillingEventFact {
    readonly id?: string | null;
    readonly eventType?: string | null;
    readonly targetType?: string | null;
    readonly metadata?: Record<string, unknown> | null;
}

export interface RevenueOpsSupportContext {
    readonly userId?: string | null;
    readonly access?: RevenueOpsSupportAccessFact | ProductAccessResolution | null;
    readonly checkoutAttempts?: readonly RevenueOpsCheckoutFact[];
    readonly stripeEvents?: readonly RevenueOpsWebhookFact[];
    readonly subscriptions?: readonly RevenueOpsSubscriptionFact[];
    readonly grants?: readonly RevenueOpsGrantFact[];
    readonly quotaEntries?: readonly RevenueOpsQuotaFact[];
    readonly billingEvents?: readonly RevenueOpsBillingEventFact[];
    readonly auth?: {
        readonly expectedUserId?: string | null;
        readonly sessionUserId?: string | null;
    } | null;
}

export interface RevenueOpsProAccessCause {
    readonly code: RevenueOpsProAccessCauseCode;
    readonly domain: RevenueOpsSupportDomain;
    readonly status: RevenueOpsOperationalStatus;
    readonly evidenceRefs: readonly string[];
    readonly impact: string;
    readonly owner: 'support' | 'admin' | 'engineering' | 'stripe' | 'ops';
    readonly runbook: string;
    readonly nextSafeAction: string;
}

export interface RevenueOpsDomainDiagnosis {
    readonly domain: RevenueOpsSupportDomain;
    readonly status: RevenueOpsOperationalStatus;
    readonly evidenceRefs: readonly string[];
    readonly firstCause: RevenueOpsProAccessCause | null;
    readonly impact: string;
    readonly owner: RevenueOpsProAccessCause['owner'];
    readonly runbook: string;
    readonly nextSafeAction: string;
}

export interface RevenueOpsSupportDiagnosis {
    readonly firstCause: RevenueOpsProAccessCause;
    readonly domains: readonly RevenueOpsDomainDiagnosis[];
    readonly safeSummary: string;
}

const DEFAULT_RUNBOOK_BY_DOMAIN: Record<RevenueOpsSupportDomain, string> = {
    pagamento: 'docs/monetization-runbooks.md#payment-failure',
    entitlement: 'docs/monetization-runbooks.md#entitlement-reconciliation',
    auth: 'docs/monetization-runbooks.md#auth-and-account-match',
    quota: 'docs/monetization-runbooks.md#quota-incident',
    analise: 'docs/monetization-runbooks.md#analysis-save-incident',
    webhook: 'docs/monetization-runbooks.md#webhook-failure',
    admin_grant: 'docs/monetization-runbooks.md#manual-grants',
};

function evidenceRef(prefix: string, value: string | null | undefined): string {
    return value ? `${prefix}:${value}` : `${prefix}:latest`;
}

function createCause(
    code: RevenueOpsProAccessCauseCode,
    input: Omit<RevenueOpsProAccessCause, 'code'>,
): RevenueOpsProAccessCause {
    return {
        code,
        ...input,
    };
}

function latest<T>(items: readonly T[] | undefined): T | undefined {
    return items?.[0];
}

function hasMetadataSignal(
    items: readonly { readonly metadata?: Record<string, unknown> | null; readonly eventType?: string | null }[] | undefined,
    pattern: RegExp,
): boolean {
    return (items ?? []).some((item) => pattern.test(JSON.stringify(item).toLowerCase()));
}

function hasBlocker(access: RevenueOpsSupportContext['access'], code: string): boolean {
    const blockers = 'blockers' in (access ?? {}) ? access?.blockers : [];

    return (blockers ?? []).some((blocker) => blocker.code === code);
}

function accessState(access: RevenueOpsSupportContext['access']): string | null {
    return 'accessState' in (access ?? {}) ? String(access?.accessState ?? '') || null : null;
}

function billingStatus(access: RevenueOpsSupportContext['access']): string | null {
    return 'billingStatus' in (access ?? {}) ? String(access?.billingStatus ?? '') || null : null;
}

function quotaState(access: RevenueOpsSupportContext['access']): string | null {
    return 'quota' in (access ?? {}) ? String(access?.quota?.state ?? '') || null : null;
}

function quotaReason(access: RevenueOpsSupportContext['access']): string | null {
    return 'quota' in (access ?? {}) ? String(access?.quota?.reason ?? '') || null : null;
}

function isProAccessConfirmed(context: RevenueOpsSupportContext): boolean {
    const state = accessState(context.access);

    return state === 'pro_active'
        || state === 'founder_active'
        || state === 'manual_grant_active';
}

function isCheckoutPending(context: RevenueOpsSupportContext): boolean {
    const state = accessState(context.access);

    return state === 'checkout_pending'
        || billingStatus(context.access) === 'checkout_pending'
        || (context.checkoutAttempts ?? []).some((attempt) => (
            attempt.status === 'created'
            || attempt.status === 'pending'
            || attempt.status === 'open'
        ));
}

function hasCompletedCheckout(context: RevenueOpsSupportContext): boolean {
    return (context.checkoutAttempts ?? []).some((attempt) => (
        attempt.status === 'completed'
        || attempt.status === 'confirmed'
        || attempt.completedAt != null
    ));
}

function hasProcessedWebhook(context: RevenueOpsSupportContext): boolean {
    return (context.stripeEvents ?? []).some((event) => (
        event.processingStatus === 'processed'
        || event.processingStatus === 'fulfilled'
        || event.eventType?.includes('checkout.session.completed') === true
    ));
}

function rejectedWebhook(context: RevenueOpsSupportContext): RevenueOpsWebhookFact | undefined {
    return (context.stripeEvents ?? []).find((event) => (
        event.processingStatus === 'rejected'
        || event.eventType === 'webhook.rejected'
    ));
}

function quarantinedWebhook(context: RevenueOpsSupportContext): RevenueOpsWebhookFact | undefined {
    return (context.stripeEvents ?? []).find((event) => (
        event.processingStatus === 'quarantined'
        || event.eventType === 'webhook.quarantined'
    ));
}

function latestSubscriptionStatus(context: RevenueOpsSupportContext): string | null {
    return String(latest(context.subscriptions)?.billingStatus ?? billingStatus(context.access) ?? '') || null;
}

function latestGrant(context: RevenueOpsSupportContext): RevenueOpsGrantFact | undefined {
    return latest(context.grants);
}

function causeForDomainOk(domain: RevenueOpsSupportDomain): RevenueOpsDomainDiagnosis {
    return {
        domain,
        status: 'PASS',
        evidenceRefs: [],
        firstCause: null,
        impact: 'No active blocker detected for this domain.',
        owner: domain === 'webhook' ? 'engineering' : 'support',
        runbook: DEFAULT_RUNBOOK_BY_DOMAIN[domain],
        nextSafeAction: 'Keep monitoring aggregate Revenue Ops evidence.',
    };
}

export function resolveProAccessCauseTree(context: RevenueOpsSupportContext): RevenueOpsProAccessCause {
    const auth = context.auth;

    if (auth?.expectedUserId && auth.sessionUserId && auth.expectedUserId !== auth.sessionUserId) {
        return createCause('auth_mismatch', {
            domain: 'auth',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('auth', auth.sessionUserId)],
            impact: 'The inspected account and authenticated session do not match.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.auth,
            nextSafeAction: 'Confirm the user identity before exposing account-level billing context.',
        });
    }

    if (isProAccessConfirmed(context)) {
        return createCause('pro_access_confirmed', {
            domain: 'entitlement',
            status: 'PASS',
            evidenceRefs: [evidenceRef('access', accessState(context.access))],
            impact: 'Server resolver currently confirms Pro access.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.entitlement,
            nextSafeAction: 'Do not mutate paid state; use the resolver state as current truth.',
        });
    }

    const rejected = rejectedWebhook(context);
    if (rejected) {
        return createCause('webhook_rejected', {
            domain: 'webhook',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('webhook', rejected.stripeEventId ?? rejected.id)],
            impact: 'Stripe evidence reached the app but was rejected before entitlement fulfillment.',
            owner: 'engineering',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.webhook,
            nextSafeAction: 'Inspect the rejected event reason and replay only after the signature/price checks are fixed.',
        });
    }

    const quarantined = quarantinedWebhook(context);
    if (quarantined) {
        return createCause('webhook_quarantined', {
            domain: 'webhook',
            status: 'NO-GO',
            evidenceRefs: [evidenceRef('webhook', quarantined.stripeEventId ?? quarantined.id)],
            impact: 'Webhook processing is quarantined and cannot be treated as paid access truth.',
            owner: 'engineering',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.webhook,
            nextSafeAction: 'Resolve the quarantine reason before reconciling entitlement.',
        });
    }

    if (hasMetadataSignal([
        ...(context.billingEvents ?? []),
        ...(context.checkoutAttempts ?? []),
        ...(context.stripeEvents ?? []),
    ], /price[_-]?mismatch|unexpected[_-]?price|wrong[_-]?price/)) {
        return createCause('price_mismatch', {
            domain: 'pagamento',
            status: 'NO-GO',
            evidenceRefs: [evidenceRef('billing_event', latest(context.billingEvents)?.id)],
            impact: 'Checkout or webhook evidence references a price that does not match server catalog truth.',
            owner: 'admin',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Keep access unchanged, quarantine the event, and verify Stripe price IDs against the catalog.',
        });
    }

    const state = accessState(context.access);
    const billing = latestSubscriptionStatus(context);

    if (state === 'suspended' || billing === 'suspended' || latest(context.subscriptions)?.suspendedAt) {
        return createCause('suspended', {
            domain: 'entitlement',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('subscription', latest(context.subscriptions)?.id)],
            impact: 'Paid access is suspended by operational policy.',
            owner: 'admin',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.entitlement,
            nextSafeAction: 'Only admin can remove suspension after the fraud/dispute/support reason is resolved.',
        });
    }

    if (hasBlocker(context.access, 'safe_mode')) {
        return createCause('safe_mode', {
            domain: 'entitlement',
            status: 'NO-GO',
            evidenceRefs: [evidenceRef('access', state)],
            impact: 'Safe mode is active; confirmed paid access is preserved but new risky paid actions are degraded.',
            owner: 'engineering',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.entitlement,
            nextSafeAction: 'Keep Free useful, preserve confirmed Pro access, and resolve the incident blocker.',
        });
    }

    if (billing === 'past_due' && state === 'past_due_grace') {
        return createCause('past_due_grace', {
            domain: 'pagamento',
            status: 'WARN',
            evidenceRefs: [evidenceRef('subscription', latest(context.subscriptions)?.id)],
            impact: 'Payment needs attention, but Pro remains available during grace.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Point the user to Billing Portal and avoid revoking access manually.',
        });
    }

    if (billing === 'past_due' || state === 'past_due_blocked') {
        return createCause('past_due_blocked', {
            domain: 'pagamento',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('subscription', latest(context.subscriptions)?.id)],
            impact: 'Payment recovery is required before Pro access resumes.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Send the safe billing summary and ask the user to update payment through the portal.',
        });
    }

    if (billing === 'canceled' || state === 'canceled') {
        return createCause('canceled', {
            domain: 'pagamento',
            status: 'WARN',
            evidenceRefs: [evidenceRef('subscription', latest(context.subscriptions)?.id)],
            impact: 'Subscription is canceled; current resolver truth should remain Free unless a grant exists.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Explain canceled status and route reactivation through checkout or Billing Portal.',
        });
    }

    if (billing === 'unpaid') {
        return createCause('unpaid', {
            domain: 'pagamento',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('subscription', latest(context.subscriptions)?.id)],
            impact: 'Stripe marks the subscription unpaid; local access must not override provider truth.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Ask user to resolve payment and request admin reconciliation only if Stripe has recovered.',
        });
    }

    const grant = latestGrant(context);
    if (grant && (grant.status === 'expired' || grant.status === 'revoked' || state === 'manual_grant_expired')) {
        return createCause('manual_grant_expired', {
            domain: 'admin_grant',
            status: 'WARN',
            evidenceRefs: [evidenceRef('grant', grant.id)],
            impact: 'Manual grant no longer provides Pro access.',
            owner: 'admin',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.admin_grant,
            nextSafeAction: 'Support can note the case; only admin may create or renew a grant.',
        });
    }

    if (isCheckoutPending(context)) {
        return createCause('checkout_pending', {
            domain: 'pagamento',
            status: 'WARN',
            evidenceRefs: [evidenceRef('checkout', latest(context.checkoutAttempts)?.id)],
            impact: 'Checkout started but Pro access is waiting for webhook/subscription confirmation.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Wait for webhook truth or request admin reconciliation if Stripe shows payment complete.',
        });
    }

    if (hasCompletedCheckout(context) && !hasProcessedWebhook(context)) {
        return createCause('webhook_missing', {
            domain: 'webhook',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('checkout', latest(context.checkoutAttempts)?.id)],
            impact: 'Checkout completed evidence exists, but no signed webhook fulfillment is recorded.',
            owner: 'engineering',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.webhook,
            nextSafeAction: 'Verify webhook endpoint, signature secret, and processed event table before granting access.',
        });
    }

    const qState = quotaState(context.access);
    const qReason = quotaReason(context.access);
    const quotaEntry = latest(context.quotaEntries);

    if (qState === 'warning') {
        return createCause('quota_warning', {
            domain: 'quota',
            status: 'WARN',
            evidenceRefs: [evidenceRef('quota', quotaEntry?.id)],
            impact: 'The user is near the current save limit but is not blocked yet.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.quota,
            nextSafeAction: 'Explain remaining saves and avoid manual quota mutation unless admin approves.',
        });
    }

    if (qState === 'limit_reached' || qReason === 'limit_blocked') {
        return createCause('quota_limit', {
            domain: 'quota',
            status: 'BLOCKED',
            evidenceRefs: [evidenceRef('quota', quotaEntry?.id)],
            impact: 'Analysis save access is blocked by the current quota period.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.quota,
            nextSafeAction: 'Explain quota truth and route upgrades or admin adjustments through approved flows.',
        });
    }

    if (qState === 'blocked' || qReason === 'entitlement_blocked' || qReason === 'safe_mode_paused') {
        return createCause('quota_blocked', {
            domain: 'quota',
            status: 'NO-GO',
            evidenceRefs: [evidenceRef('quota', quotaEntry?.id)],
            impact: 'Quota or entitlement state blocks useful save behavior.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.quota,
            nextSafeAction: 'Preserve analysis usability and escalate only if resolver truth disagrees with quota evidence.',
        });
    }

    if (hasMetadataSignal(context.billingEvents, /analysis[_-]?save|save[_-]?failed|quota[_-]?write/)) {
        return createCause('analysis_save_issue', {
            domain: 'analise',
            status: 'WARN',
            evidenceRefs: [evidenceRef('billing_event', latest(context.billingEvents)?.id)],
            impact: 'The paid/support state may be correct, but the analysis-save path reported an operational issue.',
            owner: 'engineering',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.analise,
            nextSafeAction: 'Inspect save/quota event evidence without changing paid access.',
        });
    }

    if ((context.checkoutAttempts ?? []).length === 0 && (billing === 'none' || billing === null || state === 'free')) {
        return createCause('no_checkout', {
            domain: 'pagamento',
            status: 'WARN',
            evidenceRefs: [],
            impact: 'No server checkout attempt exists for this user.',
            owner: 'support',
            runbook: DEFAULT_RUNBOOK_BY_DOMAIN.pagamento,
            nextSafeAction: 'Direct the user to pricing/checkout; do not grant Pro from support context.',
        });
    }

    return createCause('entitlement_missing', {
        domain: 'entitlement',
        status: 'BLOCKED',
        evidenceRefs: [evidenceRef('access', state)],
        impact: 'No active server-owned entitlement currently grants Pro.',
        owner: 'admin',
        runbook: DEFAULT_RUNBOOK_BY_DOMAIN.entitlement,
        nextSafeAction: 'Request admin reconciliation only with Stripe/webhook evidence.',
    });
}

export function buildRevenueOpsSafeSupportSummary(cause: RevenueOpsProAccessCause): string {
    return [
        `Revenue Ops diagnosis: ${cause.code}`,
        `Domain: ${cause.domain}`,
        `Status: ${cause.status}`,
        `Impact: ${cause.impact}`,
        `Owner: ${cause.owner}`,
        `Runbook: ${cause.runbook}`,
        `Next safe action: ${cause.nextSafeAction}`,
    ].join('\n');
}

export function diagnoseRevenueOpsSupport(context: RevenueOpsSupportContext): RevenueOpsSupportDiagnosis {
    const firstCause = resolveProAccessCauseTree(context);
    const domains = ([
        'pagamento',
        'entitlement',
        'auth',
        'quota',
        'analise',
        'webhook',
        'admin_grant',
    ] as const).map((domain): RevenueOpsDomainDiagnosis => {
        if (domain !== firstCause.domain) {
            return causeForDomainOk(domain);
        }

        return {
            domain,
            status: firstCause.status,
            evidenceRefs: firstCause.evidenceRefs,
            firstCause,
            impact: firstCause.impact,
            owner: firstCause.owner,
            runbook: firstCause.runbook,
            nextSafeAction: firstCause.nextSafeAction,
        };
    });

    return sanitizeRevenueOpsRecord({
        firstCause,
        domains,
        safeSummary: buildRevenueOpsSafeSupportSummary(firstCause),
    }) as RevenueOpsSupportDiagnosis;
}
