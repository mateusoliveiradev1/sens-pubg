import { describe, expect, it } from 'vitest';

import type {
    AnalysisQuotaLedgerEntry,
    AnalysisQuotaLedgerRepository,
} from './quota-ledger';
import {
    FREE_ANALYSIS_SAVE_LIMIT,
    PRO_ANALYSIS_SAVE_LIMIT,
    createAnalysisSaveAttemptId,
    recordSupportQuotaAdjustment,
    reserveAnalysisQuota,
    resolveQuotaPeriod,
    summarizeQuotaState,
} from './quota-ledger';
import { resolveProductAccess } from './product-entitlements';

function createMemoryQuotaRepository(seed: readonly AnalysisQuotaLedgerEntry[] = []): AnalysisQuotaLedgerRepository & {
    readonly entries: AnalysisQuotaLedgerEntry[];
} {
    const entries = [...seed];

    return {
        entries,
        async listLedgerEntries(input) {
            return entries.filter((entry) => (
                entry.userId === input.userId
                && entry.periodStart.getTime() === input.periodStart.getTime()
                && entry.periodEnd.getTime() === input.periodEnd.getTime()
            ));
        },
        async findLedgerEntryByIdempotencyKey(idempotencyKey) {
            return entries.find((entry) => entry.idempotencyKey === idempotencyKey) ?? null;
        },
        async insertLedgerEntry(input) {
            const row: AnalysisQuotaLedgerEntry = {
                ...input,
                id: `ledger-${entries.length + 1}`,
                createdAt: new Date('2026-05-06T12:00:00.000Z'),
            };
            entries.push(row);
            return row;
        },
        async finalizeLedgerEntry(input) {
            const index = entries.findIndex((entry) => entry.id === input.ledgerEntryId);
            if (index < 0) return null;
            entries[index] = {
                ...entries[index]!,
                analysisSessionId: input.analysisSessionId,
                reasonCode: 'billable',
                finalizedAt: input.finalizedAt,
                metadata: input.metadata,
            };
            return entries[index]!;
        },
        async voidLedgerEntry(input) {
            const index = entries.findIndex((entry) => entry.id === input.ledgerEntryId);
            if (index < 0) return null;
            entries[index] = {
                ...entries[index]!,
                amount: 0,
                state: 'not_applicable',
                reasonCode: input.reasonCode,
                voidedAt: input.voidedAt,
                metadata: input.metadata,
            };
            return entries[index]!;
        },
        async loadLatestSubscription() {
            return null;
        },
        async loadUserGrants() {
            return [];
        },
        async loadMonetizationFlagRows() {
            return [];
        },
        async transaction(callback) {
            return callback(this);
        },
    };
}

function createAccess(input: {
    readonly tier?: 'free' | 'pro' | 'founder';
    readonly now?: Date;
    readonly periodStart?: Date;
    readonly periodEnd?: Date;
} = {}) {
    const now = input.now ?? new Date('2026-05-06T12:00:00.000Z');

    if (input.tier && input.tier !== 'free') {
        return resolveProductAccess({
            userId: 'user-1',
            now,
            subscription: {
                status: 'active',
                tier: input.tier,
                currentPeriodStart: input.periodStart ?? new Date('2026-05-03T00:00:00.000Z'),
                currentPeriodEnd: input.periodEnd ?? new Date('2026-06-03T00:00:00.000Z'),
                auditRef: 'sub-1',
            },
        });
    }

    return resolveProductAccess({
        userId: 'user-1',
        now,
    });
}

describe('quota ledger policy', () => {
    it('uses server UTC month and a three-save limit for Free access', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const repository = createMemoryQuotaRepository();
        const access = createAccess({ now });
        const period = resolveQuotaPeriod({ access, now });

        expect(period).toMatchObject({
            source: 'server_utc_month',
            limit: FREE_ANALYSIS_SAVE_LIMIT,
            warningAt: 2,
        });
        expect(period.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
        expect(period.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');

        const first = await reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access,
            analysisSaveAttemptId: createAnalysisSaveAttemptId({ userId: 'user-1', analysisResultId: 'analysis-1' }),
            now,
        });

        expect(first.status).toBe('reserved');
        expect(first.quota).toMatchObject({
            used: 1,
            remaining: 2,
            state: 'available',
        });
    });

    it('uses the trusted Stripe cycle and a one-hundred-save limit for Pro access', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const periodStart = new Date('2026-05-03T00:00:00.000Z');
        const periodEnd = new Date('2026-06-03T00:00:00.000Z');
        const repository = createMemoryQuotaRepository();
        const access = createAccess({ tier: 'pro', now, periodStart, periodEnd });
        const period = resolveQuotaPeriod({ access, now });

        expect(period).toMatchObject({
            source: 'stripe_subscription_period',
            limit: PRO_ANALYSIS_SAVE_LIMIT,
            warningAt: 80,
        });
        expect(period.start).toBe(periodStart);
        expect(period.end).toBe(periodEnd);

        const result = await reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access,
            analysisSaveAttemptId: 'attempt-pro-1',
            now,
        });

        expect(result.status).toBe('reserved');
        expect(result.quota.limit).toBe(100);
    });

    it('enters warning state around 80/100 for Pro and 2/3 for Free', () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const freePeriod = resolveQuotaPeriod({ access: createAccess({ now }), now });
        const proPeriod = resolveQuotaPeriod({ access: createAccess({ tier: 'pro', now }), now });

        expect(summarizeQuotaState({
            period: freePeriod,
            entries: [
                { amount: 1, reasonCode: 'billable', voidedAt: null },
                { amount: 1, reasonCode: 'billable', voidedAt: null },
            ],
        })).toMatchObject({
            used: 2,
            remaining: 1,
            state: 'warning',
        });

        expect(summarizeQuotaState({
            period: proPeriod,
            entries: Array.from({ length: 80 }, () => ({
                amount: 1,
                reasonCode: 'billable' as const,
                voidedAt: null,
            })),
        })).toMatchObject({
            used: 80,
            remaining: 20,
            state: 'warning',
        });
    });

    it('blocks exhausted saves with an auditable zero-amount limit row', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const access = createAccess({ now });
        const period = resolveQuotaPeriod({ access, now });
        const repository = createMemoryQuotaRepository(
            Array.from({ length: 3 }, (_, index): AnalysisQuotaLedgerEntry => ({
                id: `existing-${index}`,
                userId: 'user-1',
                analysisSessionId: `session-${index}`,
                analysisSaveAttemptId: `attempt-${index}`,
                idempotencyKey: `attempt-${index}`,
                state: index === 2 ? 'limit_reached' : 'available',
                reasonCode: 'billable',
                amount: 1,
                quotaLimit: 3,
                periodStart: period.start,
                periodEnd: period.end,
                finalizedAt: new Date('2026-05-06T12:00:00.000Z'),
                voidedAt: null,
                metadata: {},
                createdAt: new Date('2026-05-06T12:00:00.000Z'),
            })),
        );

        const result = await reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access,
            analysisSaveAttemptId: 'attempt-blocked',
            now,
        });

        expect(result).toMatchObject({
            status: 'blocked',
            reasonCode: 'limit_blocked',
            quota: {
                used: 3,
                remaining: 0,
                state: 'limit_reached',
            },
        });
        expect(repository.entries.at(-1)).toMatchObject({
            analysisSaveAttemptId: 'attempt-blocked',
            reasonCode: 'limit_blocked',
            amount: 0,
        });
    });

    it('deduplicates retries without double-counting quota', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const repository = createMemoryQuotaRepository();
        const access = createAccess({ now });

        const first = await reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access,
            analysisSaveAttemptId: 'attempt-duplicate',
            now,
        });
        const retry = await reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access,
            analysisSaveAttemptId: 'attempt-duplicate',
            now,
        });

        expect(first.status).toBe('reserved');
        expect(retry.status).toBe('duplicate');
        expect(repository.entries.filter((entry) => entry.reasonCode === 'billable')).toHaveLength(1);
        expect(retry.quota.used).toBe(1);
    });

    it('records support adjustments explicitly instead of silently refunding deletes', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const repository = createMemoryQuotaRepository();
        const access = createAccess({ now });

        const adjustment = await recordSupportQuotaAdjustment({
            repository,
            userId: 'user-1',
            access,
            amount: -1,
            reason: 'support_goodwill_credit',
            actorUserId: 'support-1',
            now,
        });

        expect(adjustment).toMatchObject({
            reasonCode: 'support_adjustment',
            amount: -1,
            finalizedAt: now,
            metadata: {
                reason: 'support_goodwill_credit',
                actorUserId: 'support-1',
            },
        });
    });

    it('rejects client-supplied quota periods', async () => {
        const now = new Date('2026-05-06T12:00:00.000Z');
        const repository = createMemoryQuotaRepository();

        await expect(reserveAnalysisQuota({
            repository,
            userId: 'user-1',
            access: createAccess({ now }),
            analysisSaveAttemptId: 'attempt-client-period',
            now,
            clientPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
        })).rejects.toThrow('Client-supplied quota periods are not accepted');
    });
});
