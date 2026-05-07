import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import type { Database } from '@/db';
import {
    monetizationFlags,
    productQuotaLedger,
    productSubscriptions,
    productUserGrants,
    type MonetizationFlagRow,
    type ProductQuotaLedgerRow,
    type ProductSubscriptionRow,
    type ProductUserGrantRow,
} from '@/db/schema';
import {
    resolveMonetizationFlags,
    type ResolvedMonetizationFlags,
} from '@/lib/monetization-flags';
import {
    resolveProductAccess,
    type ProductAccessResolution,
    type ProductManualGrantFact,
    type ProductSubscriptionFact,
} from '@/lib/product-entitlements';
import type {
    AnalysisSaveAccessState,
    ProductQuotaSummary,
    ProductTier,
    QuotaReasonCode,
} from '@/types/monetization';

export const FREE_ANALYSIS_SAVE_LIMIT = 3;
export const PRO_ANALYSIS_SAVE_LIMIT = 100;
export const PRO_QUOTA_WARNING_AT = 80;
export const FREE_QUOTA_WARNING_AT = 2;

export type AnalysisQuotaPeriodSource = 'server_utc_month' | 'stripe_subscription_period';
export type AnalysisQuotaReservationStatus = 'reserved' | 'blocked' | 'duplicate' | 'non_billable';

export interface AnalysisQuotaPeriod {
    readonly tier: ProductTier;
    readonly source: AnalysisQuotaPeriodSource;
    readonly start: Date;
    readonly end: Date;
    readonly limit: number;
    readonly warningAt: number;
}

export interface AnalysisQuotaLedgerEntry {
    readonly id: string;
    readonly userId: string;
    readonly analysisSessionId: string | null;
    readonly analysisSaveAttemptId: string;
    readonly idempotencyKey: string;
    readonly state: ProductQuotaSummary['state'];
    readonly reasonCode: QuotaReasonCode;
    readonly amount: number;
    readonly quotaLimit: number;
    readonly periodStart: Date;
    readonly periodEnd: Date;
    readonly finalizedAt: Date | null;
    readonly voidedAt: Date | null;
    readonly metadata: Record<string, unknown>;
    readonly createdAt: Date;
}

export interface AnalysisQuotaReservation {
    readonly ledgerEntryId: string;
    readonly analysisSaveAttemptId: string;
    readonly idempotencyKey: string;
    readonly period: AnalysisQuotaPeriod;
    readonly quota: ProductQuotaSummary;
    readonly reasonCode: QuotaReasonCode;
}

export interface ReserveAnalysisQuotaInput {
    readonly repository: AnalysisQuotaLedgerRepository;
    readonly userId: string;
    readonly access: ProductAccessResolution;
    readonly analysisSaveAttemptId: string;
    readonly billable?: boolean;
    readonly nonBillableReason?: Extract<QuotaReasonCode, 'non_billable_weak_capture' | 'technical_failure'>;
    readonly metadata?: Record<string, unknown>;
    readonly now?: Date;
    readonly idempotencyKey?: string;
    readonly clientPeriodStart?: Date | null;
    readonly clientPeriodEnd?: Date | null;
}

export interface ReserveAnalysisQuotaResult {
    readonly status: AnalysisQuotaReservationStatus;
    readonly reservation: AnalysisQuotaReservation | null;
    readonly quota: ProductQuotaSummary;
    readonly reasonCode: QuotaReasonCode | null;
}

export interface FinalizeAnalysisQuotaInput {
    readonly repository: AnalysisQuotaLedgerRepository;
    readonly reservation: AnalysisQuotaReservation;
    readonly analysisSessionId: string;
    readonly metadata?: Record<string, unknown>;
    readonly now?: Date;
}

export interface VoidAnalysisQuotaInput {
    readonly repository: AnalysisQuotaLedgerRepository;
    readonly reservation: AnalysisQuotaReservation;
    readonly reasonCode: Extract<QuotaReasonCode, 'non_billable_weak_capture' | 'technical_failure'>;
    readonly analysisSessionId?: string | null | undefined;
    readonly metadata?: Record<string, unknown>;
    readonly now?: Date;
}

export interface RecordSupportQuotaAdjustmentInput {
    readonly repository: AnalysisQuotaLedgerRepository;
    readonly userId: string;
    readonly access: ProductAccessResolution;
    readonly amount: number;
    readonly reason: string;
    readonly actorUserId?: string | null;
    readonly now?: Date;
}

export interface ResolveAnalysisSaveAccessInput {
    readonly repository: AnalysisQuotaLedgerRepository;
    readonly userId: string;
    readonly now?: Date;
}

export interface ResolvedAnalysisSaveAccess {
    readonly state: AnalysisSaveAccessState;
    readonly access: ProductAccessResolution;
}

export interface AnalysisQuotaLedgerRepository {
    readonly listLedgerEntries: (input: {
        readonly userId: string;
        readonly periodStart: Date;
        readonly periodEnd: Date;
    }) => Promise<readonly AnalysisQuotaLedgerEntry[]>;
    readonly findLedgerEntryByIdempotencyKey: (idempotencyKey: string) => Promise<AnalysisQuotaLedgerEntry | null>;
    readonly insertLedgerEntry: (input: Omit<AnalysisQuotaLedgerEntry, 'id' | 'createdAt'>) => Promise<AnalysisQuotaLedgerEntry>;
    readonly finalizeLedgerEntry: (input: {
        readonly ledgerEntryId: string;
        readonly analysisSessionId: string;
        readonly metadata: Record<string, unknown>;
        readonly finalizedAt: Date;
    }) => Promise<AnalysisQuotaLedgerEntry | null>;
    readonly voidLedgerEntry: (input: {
        readonly ledgerEntryId: string;
        readonly analysisSessionId?: string | null | undefined;
        readonly reasonCode: Extract<QuotaReasonCode, 'non_billable_weak_capture' | 'technical_failure'>;
        readonly metadata: Record<string, unknown>;
        readonly voidedAt: Date;
    }) => Promise<AnalysisQuotaLedgerEntry | null>;
    readonly loadLatestSubscription: (userId: string) => Promise<ProductSubscriptionRow | null>;
    readonly loadUserGrants: (userId: string) => Promise<readonly ProductUserGrantRow[]>;
    readonly loadMonetizationFlagRows: () => Promise<readonly Pick<MonetizationFlagRow, 'key' | 'enabled'>[]>;
    readonly transaction: <T>(callback: (repository: AnalysisQuotaLedgerRepository) => Promise<T>) => Promise<T>;
}

type QuotaDatabase = Pick<Database, 'select' | 'insert' | 'update'> & {
    readonly transaction?: <T>(callback: (tx: QuotaDatabase) => Promise<T>) => Promise<T>;
};

function startOfUtcMonth(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextUtcMonth(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function resolveLimit(tier: ProductTier): number {
    return tier === 'free' ? FREE_ANALYSIS_SAVE_LIMIT : PRO_ANALYSIS_SAVE_LIMIT;
}

function resolveWarningAt(tier: ProductTier): number {
    return tier === 'free' ? FREE_QUOTA_WARNING_AT : PRO_QUOTA_WARNING_AT;
}

function quotaStateForUsage(input: {
    readonly used: number;
    readonly limit: number;
    readonly warningAt: number;
}): ProductQuotaSummary['state'] {
    if (input.limit <= 0) {
        return 'blocked';
    }

    if (input.used >= input.limit) {
        return 'limit_reached';
    }

    if (input.used >= input.warningAt) {
        return 'warning';
    }

    return 'available';
}

function normalizeLedgerRow(row: ProductQuotaLedgerRow): AnalysisQuotaLedgerEntry {
    return {
        id: row.id,
        userId: row.userId,
        analysisSessionId: row.analysisSessionId,
        analysisSaveAttemptId: row.analysisSaveAttemptId,
        idempotencyKey: row.idempotencyKey,
        state: row.state,
        reasonCode: row.reasonCode,
        amount: row.amount,
        quotaLimit: row.quotaLimit,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        finalizedAt: row.finalizedAt,
        voidedAt: row.voidedAt,
        metadata: row.metadata,
        createdAt: row.createdAt,
    };
}

function isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as { code?: unknown }).code === '23505';
}

export function createAnalysisSaveAttemptId(input: {
    readonly userId: string;
    readonly analysisResultId?: string | null;
    readonly createId?: () => string;
}): string {
    const stableResultId = input.analysisResultId?.trim();

    if (stableResultId) {
        return `analysis-save:${input.userId}:${stableResultId}`;
    }

    return `analysis-save:${input.userId}:${input.createId?.() ?? randomUUID()}`;
}

export function resolveQuotaPeriod(input: {
    readonly access: ProductAccessResolution;
    readonly now?: Date;
}): AnalysisQuotaPeriod {
    const now = input.now ?? new Date();
    const tier = input.access.effectiveTier;
    const stripePeriodAvailable = input.access.source === 'stripe_subscription'
        && input.access.periodStart instanceof Date
        && input.access.periodEnd instanceof Date
        && input.access.periodEnd.getTime() > input.access.periodStart.getTime();

    if (tier !== 'free' && stripePeriodAvailable) {
        return {
            tier,
            source: 'stripe_subscription_period',
            start: input.access.periodStart!,
            end: input.access.periodEnd!,
            limit: resolveLimit(tier),
            warningAt: resolveWarningAt(tier),
        };
    }

    return {
        tier,
        source: 'server_utc_month',
        start: startOfUtcMonth(now),
        end: startOfNextUtcMonth(now),
        limit: resolveLimit(tier),
        warningAt: resolveWarningAt(tier),
    };
}

export function summarizeQuotaState(input: {
    readonly period: AnalysisQuotaPeriod;
    readonly entries: readonly Pick<AnalysisQuotaLedgerEntry, 'amount' | 'reasonCode' | 'voidedAt'>[];
    readonly reason?: QuotaReasonCode | null;
}): ProductQuotaSummary {
    const used = Math.max(
        0,
        input.entries.reduce((sum, entry) => {
            if (entry.voidedAt) {
                return sum;
            }

            if (entry.reasonCode === 'billable' || entry.reasonCode === 'support_adjustment') {
                return sum + entry.amount;
            }

            return sum;
        }, 0),
    );
    const remaining = Math.max(0, input.period.limit - used);

    return {
        tier: input.period.tier,
        limit: input.period.limit,
        used,
        remaining,
        state: quotaStateForUsage({
            used,
            limit: input.period.limit,
            warningAt: input.period.warningAt,
        }),
        periodStart: input.period.start,
        periodEnd: input.period.end,
        warningAt: input.period.warningAt,
        reason: input.reason ?? null,
    };
}

function toReservation(input: {
    readonly entry: AnalysisQuotaLedgerEntry;
    readonly period: AnalysisQuotaPeriod;
    readonly quota: ProductQuotaSummary;
}): AnalysisQuotaReservation {
    return {
        ledgerEntryId: input.entry.id,
        analysisSaveAttemptId: input.entry.analysisSaveAttemptId,
        idempotencyKey: input.entry.idempotencyKey,
        period: input.period,
        quota: input.quota,
        reasonCode: input.entry.reasonCode,
    };
}

function assertServerOwnedPeriod(input: ReserveAnalysisQuotaInput): void {
    if (input.clientPeriodStart || input.clientPeriodEnd) {
        throw new Error('Client-supplied quota periods are not accepted.');
    }
}

export async function reserveAnalysisQuota(
    input: ReserveAnalysisQuotaInput,
): Promise<ReserveAnalysisQuotaResult> {
    assertServerOwnedPeriod(input);

    return input.repository.transaction(async (repository) => {
        const now = input.now ?? new Date();
        const period = resolveQuotaPeriod({ access: input.access, now });
        const idempotencyKey = input.idempotencyKey
            ?? `${input.analysisSaveAttemptId}:${period.start.toISOString()}:${period.end.toISOString()}`;
        const existing = await repository.findLedgerEntryByIdempotencyKey(idempotencyKey);

        if (existing) {
            const entries = await repository.listLedgerEntries({
                userId: input.userId,
                periodStart: period.start,
                periodEnd: period.end,
            });
            const quota = summarizeQuotaState({
                period,
                entries,
                reason: existing.reasonCode,
            });
            const status = existing.reasonCode === 'limit_blocked'
                ? 'blocked'
                : existing.amount === 0
                    ? 'non_billable'
                    : 'duplicate';

            return {
                status,
                reservation: existing.reasonCode === 'limit_blocked'
                    ? null
                    : toReservation({ entry: existing, period, quota }),
                quota,
                reasonCode: existing.reasonCode,
            };
        }

        const entries = await repository.listLedgerEntries({
            userId: input.userId,
            periodStart: period.start,
            periodEnd: period.end,
        });
        const quotaBefore = summarizeQuotaState({ period, entries });
        const billable = input.billable ?? true;

        if (!billable) {
            const reasonCode = input.nonBillableReason ?? 'non_billable_weak_capture';
            const entry = await repository.insertLedgerEntry({
                userId: input.userId,
                analysisSessionId: null,
                analysisSaveAttemptId: input.analysisSaveAttemptId,
                idempotencyKey,
                state: 'not_applicable',
                reasonCode,
                amount: 0,
                quotaLimit: period.limit,
                periodStart: period.start,
                periodEnd: period.end,
                finalizedAt: null,
                voidedAt: now,
                metadata: {
                    ...input.metadata,
                    periodSource: period.source,
                    note: 'non_billable_analysis_save_attempt',
                },
            });
            const quota = summarizeQuotaState({
                period,
                entries: [...entries, entry],
                reason: reasonCode,
            });

            return {
                status: 'non_billable',
                reservation: toReservation({ entry, period, quota }),
                quota,
                reasonCode,
            };
        }

        if (quotaBefore.remaining <= 0 || input.access.quota.state === 'blocked') {
            const entry = await repository.insertLedgerEntry({
                userId: input.userId,
                analysisSessionId: null,
                analysisSaveAttemptId: input.analysisSaveAttemptId,
                idempotencyKey,
                state: 'limit_reached',
                reasonCode: 'limit_blocked',
                amount: 0,
                quotaLimit: period.limit,
                periodStart: period.start,
                periodEnd: period.end,
                finalizedAt: null,
                voidedAt: now,
                metadata: {
                    ...input.metadata,
                    periodSource: period.source,
                    usedAtBlock: quotaBefore.used,
                },
            });

            return {
                status: 'blocked',
                reservation: null,
                quota: {
                    ...quotaBefore,
                    state: 'limit_reached',
                    reason: entry.reasonCode,
                },
                reasonCode: 'limit_blocked',
            };
        }

        const quotaAfter = summarizeQuotaState({
            period,
            entries: [
                ...entries,
                {
                    amount: 1,
                    reasonCode: 'billable',
                    voidedAt: null,
                },
            ],
            reason: 'billable',
        });
        const entry = await repository.insertLedgerEntry({
            userId: input.userId,
            analysisSessionId: null,
            analysisSaveAttemptId: input.analysisSaveAttemptId,
            idempotencyKey,
            state: quotaAfter.state,
            reasonCode: 'billable',
            amount: 1,
            quotaLimit: period.limit,
            periodStart: period.start,
            periodEnd: period.end,
            finalizedAt: null,
            voidedAt: null,
            metadata: {
                ...input.metadata,
                periodSource: period.source,
            },
        });

        return {
            status: 'reserved',
            reservation: toReservation({ entry, period, quota: quotaAfter }),
            quota: quotaAfter,
            reasonCode: 'billable',
        };
    });
}

export async function finalizeAnalysisQuota(input: FinalizeAnalysisQuotaInput): Promise<AnalysisQuotaLedgerEntry | null> {
    return input.repository.finalizeLedgerEntry({
        ledgerEntryId: input.reservation.ledgerEntryId,
        analysisSessionId: input.analysisSessionId,
        metadata: {
            ...input.metadata,
            finalizedReason: 'billable',
        },
        finalizedAt: input.now ?? new Date(),
    });
}

export async function voidAnalysisQuota(input: VoidAnalysisQuotaInput): Promise<AnalysisQuotaLedgerEntry | null> {
    return input.repository.voidLedgerEntry({
        ledgerEntryId: input.reservation.ledgerEntryId,
        analysisSessionId: input.analysisSessionId,
        reasonCode: input.reasonCode,
        metadata: {
            ...input.metadata,
            voidReason: input.reasonCode,
        },
        voidedAt: input.now ?? new Date(),
    });
}

export async function recordSupportQuotaAdjustment(
    input: RecordSupportQuotaAdjustmentInput,
): Promise<AnalysisQuotaLedgerEntry> {
    const now = input.now ?? new Date();
    const period = resolveQuotaPeriod({ access: input.access, now });

    return input.repository.insertLedgerEntry({
        userId: input.userId,
        analysisSessionId: null,
        analysisSaveAttemptId: `support-adjustment:${input.userId}:${randomUUID()}`,
        idempotencyKey: `support-adjustment:${input.userId}:${randomUUID()}`,
        state: 'available',
        reasonCode: 'support_adjustment',
        amount: input.amount,
        quotaLimit: period.limit,
        periodStart: period.start,
        periodEnd: period.end,
        finalizedAt: now,
        voidedAt: null,
        metadata: {
            reason: input.reason,
            actorUserId: input.actorUserId ?? null,
            periodSource: period.source,
        },
    });
}

function rowToSubscriptionFact(row: ProductSubscriptionRow | null): ProductSubscriptionFact | null {
    if (!row || row.tier === 'free') {
        return null;
    }

    return {
        status: row.billingStatus,
        tier: row.tier,
        currentPeriodStart: row.currentPeriodStart,
        currentPeriodEnd: row.currentPeriodEnd,
        graceEndsAt: row.graceEndsAt,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        auditRef: row.id,
    };
}

function rowsToManualGrantFacts(rows: readonly ProductUserGrantRow[]): readonly ProductManualGrantFact[] {
    return rows
        .filter((row) => row.status === 'active' && row.tier !== 'free')
        .map((row) => ({
            tier: row.tier as Exclude<ProductTier, 'free'>,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            auditRef: row.id,
        }));
}

function flagsToAccessFacts(flags: ResolvedMonetizationFlags) {
    return {
        entitlementSafeMode: flags.entitlementSafeMode,
        quotaConsumptionPaused: flags.quotaConsumptionPaused,
        preserveConfirmedPaidAccess: flags.preserveConfirmedPaidAccess,
    };
}

function createSaveAccessState(access: ProductAccessResolution): AnalysisSaveAccessState {
    const quotaBlocked = access.quota.remaining <= 0 || access.quota.state === 'limit_reached' || access.quota.state === 'blocked';
    const suspended = access.accessState === 'suspended';
    const limitLabel = `${access.quota.used}/${access.quota.limit}`;

    if (suspended) {
        return {
            authenticated: true,
            canSave: false,
            accessState: access.accessState,
            billingStatus: access.billingStatus,
            quota: access.quota,
            blocker: 'entitlement_blocked',
            message: 'Sua conta precisa de revisao antes de salvar novas analises.',
            ctaHref: '/billing',
        };
    }

    if (quotaBlocked) {
        return {
            authenticated: true,
            canSave: false,
            accessState: access.accessState,
            billingStatus: access.billingStatus,
            quota: access.quota,
            blocker: 'limit_blocked',
            message: access.effectiveTier === 'free'
                ? `Limite Free atingido (${limitLabel}). A analise local continua, mas salvar outro resultado util pede Pro.`
                : `Limite Pro atingido neste ciclo (${limitLabel}). Salvar outro resultado util fica bloqueado ate o proximo ciclo.`,
            ctaHref: access.effectiveTier === 'free' ? '/pricing' : '/billing',
        };
    }

    if (access.quota.state === 'warning') {
        return {
            authenticated: true,
            canSave: true,
            accessState: access.accessState,
            billingStatus: access.billingStatus,
            quota: access.quota,
            blocker: null,
            message: `Voce esta perto do limite de analises salvas (${limitLabel}).`,
            ctaHref: access.effectiveTier === 'free' ? '/pricing' : '/billing',
        };
    }

    return {
        authenticated: true,
        canSave: true,
        accessState: access.accessState,
        billingStatus: access.billingStatus,
        quota: access.quota,
        blocker: null,
        message: `Analises salvas usadas neste periodo: ${limitLabel}.`,
        ctaHref: null,
    };
}

export async function resolveAnalysisSaveAccessWithResolution(
    input: ResolveAnalysisSaveAccessInput,
): Promise<ResolvedAnalysisSaveAccess> {
    const now = input.now ?? new Date();
    const [subscriptionRow, grantRows, flagRows] = await Promise.all([
        input.repository.loadLatestSubscription(input.userId),
        input.repository.loadUserGrants(input.userId),
        input.repository.loadMonetizationFlagRows(),
    ]);
    const flags = resolveMonetizationFlags({
        environment: process.env.NODE_ENV === 'production'
            ? 'production'
            : process.env.NODE_ENV === 'test'
                ? 'test'
                : 'development',
        overrides: flagRows.map((row) => ({
            key: row.key,
            enabled: row.enabled,
            source: 'db',
        })),
    });
    const baseAccessInput = {
        userId: input.userId,
        subscription: rowToSubscriptionFact(subscriptionRow),
        manualGrants: rowsToManualGrantFacts(grantRows),
        flags: flagsToAccessFacts(flags),
        now,
    };
    const provisionalAccess = resolveProductAccess(baseAccessInput);
    const period = resolveQuotaPeriod({ access: provisionalAccess, now });
    const entries = await input.repository.listLedgerEntries({
        userId: input.userId,
        periodStart: period.start,
        periodEnd: period.end,
    });
    const quota = summarizeQuotaState({ period, entries });
    const access = resolveProductAccess({
        ...baseAccessInput,
        quota,
    });

    return {
        state: createSaveAccessState(access),
        access,
    };
}

export async function resolveAnalysisSaveAccess(
    input: ResolveAnalysisSaveAccessInput,
): Promise<AnalysisSaveAccessState> {
    return (await resolveAnalysisSaveAccessWithResolution(input)).state;
}

export function createDrizzleQuotaLedgerRepository(database: Database): AnalysisQuotaLedgerRepository {
    const quotaDatabase = database as QuotaDatabase;

    return {
        async listLedgerEntries(input) {
            const rows = await quotaDatabase.select()
                .from(productQuotaLedger)
                .where(and(
                    eq(productQuotaLedger.userId, input.userId),
                    eq(productQuotaLedger.periodStart, input.periodStart),
                    eq(productQuotaLedger.periodEnd, input.periodEnd),
                ));

            return rows.map(normalizeLedgerRow);
        },
        async findLedgerEntryByIdempotencyKey(idempotencyKey) {
            const rows = await quotaDatabase.select()
                .from(productQuotaLedger)
                .where(eq(productQuotaLedger.idempotencyKey, idempotencyKey))
                .limit(1);

            return rows[0] ? normalizeLedgerRow(rows[0]) : null;
        },
        async insertLedgerEntry(input) {
            try {
                const [row] = await quotaDatabase.insert(productQuotaLedger).values(input).returning();

                if (!row) {
                    throw new Error('Failed to insert quota ledger entry.');
                }

                return normalizeLedgerRow(row);
            } catch (error) {
                if (isUniqueViolation(error)) {
                    const existing = await this.findLedgerEntryByIdempotencyKey(input.idempotencyKey);
                    if (existing) {
                        return existing;
                    }
                }

                throw error;
            }
        },
        async finalizeLedgerEntry(input) {
            const [row] = await quotaDatabase.update(productQuotaLedger)
                .set({
                    analysisSessionId: input.analysisSessionId,
                    reasonCode: 'billable',
                    finalizedAt: input.finalizedAt,
                    metadata: input.metadata,
                })
                .where(eq(productQuotaLedger.id, input.ledgerEntryId))
                .returning();

            return row ? normalizeLedgerRow(row) : null;
        },
        async voidLedgerEntry(input) {
            const [row] = await quotaDatabase.update(productQuotaLedger)
                .set({
                    analysisSessionId: input.analysisSessionId ?? null,
                    amount: 0,
                    state: 'not_applicable',
                    reasonCode: input.reasonCode,
                    voidedAt: input.voidedAt,
                    metadata: input.metadata,
                })
                .where(eq(productQuotaLedger.id, input.ledgerEntryId))
                .returning();

            return row ? normalizeLedgerRow(row) : null;
        },
        async loadLatestSubscription(userId) {
            const rows = await quotaDatabase.select()
                .from(productSubscriptions)
                .where(eq(productSubscriptions.userId, userId))
                .orderBy(desc(productSubscriptions.updatedAt))
                .limit(1);

            return rows[0] ?? null;
        },
        async loadUserGrants(userId) {
            return quotaDatabase.select()
                .from(productUserGrants)
                .where(eq(productUserGrants.userId, userId));
        },
        async loadMonetizationFlagRows() {
            return quotaDatabase.select({
                key: monetizationFlags.key,
                enabled: monetizationFlags.enabled,
            }).from(monetizationFlags);
        },
        async transaction(callback) {
            if (typeof quotaDatabase.transaction !== 'function') {
                return callback(this);
            }

            return quotaDatabase.transaction(async (tx) => (
                callback(createDrizzleQuotaLedgerRepository(tx as unknown as Database))
            ));
        },
    };
}
