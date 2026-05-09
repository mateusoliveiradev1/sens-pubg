import { z } from 'zod';

function createRevenueOpsEnumContract<const TValues extends readonly [string, ...string[]]>(
    values: TValues,
) {
    const schema = z.enum(values);
    const valueSet = new Set<string>(values);

    return {
        values,
        schema,
        isValue(value: string): value is TValues[number] {
            return valueSet.has(value);
        },
        parse(value: string): TValues[number] {
            return schema.parse(value);
        },
    };
}

const operationalStatusContract = createRevenueOpsEnumContract([
    'PASS',
    'WARN',
    'BLOCKED',
    'NO-GO',
    'FAIL',
]);

export const revenueOpsOperationalStatusValues = operationalStatusContract.values;
export const revenueOpsOperationalStatusSchema = operationalStatusContract.schema;
export type RevenueOpsOperationalStatus = z.infer<typeof revenueOpsOperationalStatusSchema>;
export const isRevenueOpsOperationalStatus = operationalStatusContract.isValue;
export const parseRevenueOpsOperationalStatus = operationalStatusContract.parse;

const launchGateContract = createRevenueOpsEnumContract([
    'founder_beta_launch',
    'public_paid_launch',
]);

export const revenueOpsLaunchGateValues = launchGateContract.values;
export const revenueOpsLaunchGateSchema = launchGateContract.schema;
export type RevenueOpsLaunchGate = z.infer<typeof revenueOpsLaunchGateSchema>;
export const isRevenueOpsLaunchGate = launchGateContract.isValue;
export const parseRevenueOpsLaunchGate = launchGateContract.parse;

const funnelMetricKeyContract = createRevenueOpsEnumContract([
    'first_usable_analysis',
    'upgrade_intent',
    'checkout_started',
    'checkout_confirmed',
    'pro_active',
    'churn_cancellation',
    'quota_limit_hit',
    'pro_value_usage',
]);

export const revenueOpsFunnelMetricKeyValues = funnelMetricKeyContract.values;
export const revenueOpsFunnelMetricKeySchema = funnelMetricKeyContract.schema;
export type RevenueOpsFunnelMetricKey = z.infer<typeof revenueOpsFunnelMetricKeySchema>;
export const isRevenueOpsFunnelMetricKey = funnelMetricKeyContract.isValue;
export const parseRevenueOpsFunnelMetricKey = funnelMetricKeyContract.parse;

const detailReasonContract = createRevenueOpsEnumContract([
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

export const revenueOpsDetailReasonValues = detailReasonContract.values;
export const revenueOpsDetailReasonSchema = detailReasonContract.schema;
export type RevenueOpsDetailReason = z.infer<typeof revenueOpsDetailReasonSchema>;
export const isRevenueOpsDetailReason = detailReasonContract.isValue;
export const parseRevenueOpsDetailReason = detailReasonContract.parse;

const supportDomainContract = createRevenueOpsEnumContract([
    'pagamento',
    'entitlement',
    'auth',
    'quota',
    'analise',
    'webhook',
    'admin_grant',
]);

export const revenueOpsSupportDomainValues = supportDomainContract.values;
export const revenueOpsSupportDomainSchema = supportDomainContract.schema;
export type RevenueOpsSupportDomain = z.infer<typeof revenueOpsSupportDomainSchema>;
export const isRevenueOpsSupportDomain = supportDomainContract.isValue;
export const parseRevenueOpsSupportDomain = supportDomainContract.parse;

const proAccessCauseCodeContract = createRevenueOpsEnumContract([
    'pro_access_confirmed',
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
    'quota_warning',
    'quota_limit',
    'quota_blocked',
    'analysis_save_issue',
]);

export const revenueOpsProAccessCauseCodeValues = proAccessCauseCodeContract.values;
export const revenueOpsProAccessCauseCodeSchema = proAccessCauseCodeContract.schema;
export type RevenueOpsProAccessCauseCode = z.infer<typeof revenueOpsProAccessCauseCodeSchema>;
export const isRevenueOpsProAccessCauseCode = proAccessCauseCodeContract.isValue;
export const parseRevenueOpsProAccessCauseCode = proAccessCauseCodeContract.parse;

const evidenceStatusContract = createRevenueOpsEnumContract([
    'PASS',
    'WARN',
    'FAIL',
    'BLOCKED',
    'PENDING',
    'MISSING',
]);

export const revenueOpsEvidenceStatusValues = evidenceStatusContract.values;
export const revenueOpsEvidenceStatusSchema = evidenceStatusContract.schema;
export type RevenueOpsEvidenceStatus = z.infer<typeof revenueOpsEvidenceStatusSchema>;
export const isRevenueOpsEvidenceStatus = evidenceStatusContract.isValue;
export const parseRevenueOpsEvidenceStatus = evidenceStatusContract.parse;

const finalStatusContract = createRevenueOpsEnumContract([
    'Delivered',
    'Partially delivered',
    'Blocked',
]);

export const revenueOpsFinalStatusValues = finalStatusContract.values;
export const revenueOpsFinalStatusSchema = finalStatusContract.schema;
export type RevenueOpsFinalStatus = z.infer<typeof revenueOpsFinalStatusSchema>;
export const isRevenueOpsFinalStatus = finalStatusContract.isValue;
export const parseRevenueOpsFinalStatus = finalStatusContract.parse;

export const revenueOpsProhibitedFieldPattern =
    /video|frame|trajectory|filename|file_name|analysisPayload|fullResult|full_result|rawAnalysis|privateNote|noteBody|privateLink|privateReader|reader|collectionContents|paymentMethod|card|cpf|document|address|bank|financial|privateRevenue|grossRevenue|mrr|arr|payout|commission|stripePayload|webhookPayload/i;

export const revenueOpsProhibitedFieldLabels = [
    'raw video',
    'frame data',
    'trajectory data',
    'raw analysis payload',
    'private notes',
    'private links/readers',
    'private collection contents',
    'payment cards',
    'addresses',
    'bank data',
    'private financial metadata',
] as const;

export interface RevenueOpsMetricCard {
    readonly key: RevenueOpsFunnelMetricKey;
    readonly label: string;
    readonly count: number;
    readonly status: RevenueOpsOperationalStatus;
    readonly detail: string;
    readonly rate?: number | null;
    readonly reasonCodes?: readonly string[];
}

export interface RevenueOpsTrendSummary {
    readonly key: string;
    readonly current: number;
    readonly previous: number | null;
    readonly direction: 'up' | 'down' | 'flat' | 'not_enough_data';
}

export interface RevenueOpsPrivacyPosture {
    readonly defaultMode: 'aggregate_only';
    readonly userDetailRequiresReason: true;
    readonly allowedDetailReasons: readonly RevenueOpsDetailReason[];
    readonly prohibitedInputFieldCount: number;
    readonly prohibitedFieldLabels: readonly string[];
}

export interface RevenueOpsLaunchBlocker {
    readonly id: string;
    readonly status: RevenueOpsOperationalStatus;
    readonly blocker: string;
    readonly impact: string;
    readonly owner: 'support' | 'admin' | 'engineering' | 'founder' | 'stripe' | 'ops';
    readonly runbook: string;
    readonly missingEvidence: string;
    readonly smallestNextStep: string;
}

export interface RevenueOpsLaunchGateSummary {
    readonly gate: RevenueOpsLaunchGate;
    readonly status: RevenueOpsOperationalStatus;
    readonly blockers: readonly RevenueOpsLaunchBlocker[];
}

export function isRevenueOpsSafeScalar(value: unknown): value is string | number | boolean | null {
    return value === null
        || typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function hasProhibitedRevenueOpsShape(key: string, value: unknown): boolean {
    if (revenueOpsProhibitedFieldPattern.test(key)) {
        return true;
    }

    if (typeof value === 'string' && revenueOpsProhibitedFieldPattern.test(value)) {
        return true;
    }

    return false;
}

export function sanitizeRevenueOpsRecord(value: unknown): unknown {
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeRevenueOpsRecord);
    }

    if (!isRecord(value)) {
        return isRevenueOpsSafeScalar(value) ? value : null;
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, nestedValue]) => !hasProhibitedRevenueOpsShape(key, nestedValue))
            .map(([key, nestedValue]) => [key, sanitizeRevenueOpsRecord(nestedValue)]),
    );
}

export function findUnsafeRevenueOpsFields(value: unknown, path = 'root'): readonly string[] {
    if (value instanceof Date || value === null || value === undefined) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap((item, index) => findUnsafeRevenueOpsFields(item, `${path}[${index}]`));
    }

    if (typeof value !== 'object') {
        return typeof value === 'string' && revenueOpsProhibitedFieldPattern.test(value)
            ? [path]
            : [];
    }

    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
        const nestedPath = `${path}.${key}`;
        const current = hasProhibitedRevenueOpsShape(key, nestedValue) ? [nestedPath] : [];

        return [
            ...current,
            ...findUnsafeRevenueOpsFields(nestedValue, nestedPath),
        ];
    });
}

export function assertRevenueOpsPayloadSafe(value: unknown): void {
    const unsafeFields = findUnsafeRevenueOpsFields(value);

    if (unsafeFields.length > 0) {
        throw new Error(`Unsafe Revenue Ops payload fields: ${unsafeFields.join(', ')}`);
    }
}
