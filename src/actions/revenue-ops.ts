'use server';

import { desc, eq, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/auth';
import { buildRevenueOpsFunnelSnapshot } from '@/core/revenue-ops-funnel';
import {
    buildRevenueOpsSafeSupportSummary,
    diagnoseRevenueOpsSupport,
} from '@/core/revenue-ops-support';
import { db } from '@/db';
import {
    monetizationAnalyticsEvents,
    processedStripeEvents,
    productBillingEvents,
    productCheckoutAttempts,
    productQuotaLedger,
    productSubscriptions,
    productSupportNotes,
    productUserGrants,
    users,
} from '@/db/schema';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import {
    revenueOpsDetailReasonSchema,
    sanitizeRevenueOpsRecord,
    type RevenueOpsDetailReason,
} from '@/types/revenue-ops';

type StaffRole = 'admin' | 'support' | 'mod';

const cockpitSnapshotSchema = z.object({
    rangeDays: z.coerce.number().int().min(1).max(180).default(30),
    userId: z.string().uuid().optional(),
    detailReason: revenueOpsDetailReasonSchema.optional(),
}).refine((value) => !value.userId || value.detailReason, {
    message: 'User-level Revenue Ops detail requires an operational detail reason.',
    path: ['detailReason'],
});

const supportSnapshotSchema = z.object({
    userId: z.string().uuid(),
    detailReason: revenueOpsDetailReasonSchema,
});

const supportNoteSchema = z.object({
    userId: z.string().uuid(),
    detailReason: revenueOpsDetailReasonSchema,
    owner: z.enum(['support', 'admin', 'engineering', 'stripe', 'ops']).default('support'),
    note: z.string().trim().min(5).max(1600),
});

async function requireRevenueOpsStaff(): Promise<{ readonly id: string; readonly role: StaffRole }> {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || (role !== 'admin' && role !== 'support' && role !== 'mod')) {
        throw new Error('Unauthorized: Revenue Ops staff access required');
    }

    return {
        id: userId,
        role,
    };
}

function daysAgo(days: number): Date {
    const now = new Date();

    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function loadAggregateRows(since: Date) {
    return Promise.all([
        db.select().from(monetizationAnalyticsEvents)
            .where(gte(monetizationAnalyticsEvents.createdAt, since))
            .orderBy(desc(monetizationAnalyticsEvents.createdAt))
            .limit(1000),
        db.select().from(productCheckoutAttempts)
            .where(gte(productCheckoutAttempts.createdAt, since))
            .orderBy(desc(productCheckoutAttempts.createdAt))
            .limit(500),
        db.select().from(productSubscriptions)
            .where(gte(productSubscriptions.updatedAt, since))
            .orderBy(desc(productSubscriptions.updatedAt))
            .limit(500),
        db.select().from(productQuotaLedger)
            .where(gte(productQuotaLedger.createdAt, since))
            .orderBy(desc(productQuotaLedger.createdAt))
            .limit(500),
    ]);
}

async function loadUserSupportRows(userId: string) {
    const [user] = await db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) {
        return null;
    }

    const [access, subscriptions, grants, checkoutAttempts, quotaEntries, supportNotes, billingEvents, stripeEvents] = await Promise.all([
        resolveServerProductAccess(user.id),
        db.select().from(productSubscriptions).where(eq(productSubscriptions.userId, user.id)).orderBy(desc(productSubscriptions.updatedAt)).limit(5),
        db.select().from(productUserGrants).where(eq(productUserGrants.userId, user.id)).orderBy(desc(productUserGrants.createdAt)).limit(10),
        db.select().from(productCheckoutAttempts).where(eq(productCheckoutAttempts.userId, user.id)).orderBy(desc(productCheckoutAttempts.createdAt)).limit(10),
        db.select().from(productQuotaLedger).where(eq(productQuotaLedger.userId, user.id)).orderBy(desc(productQuotaLedger.createdAt)).limit(10),
        db.select().from(productSupportNotes).where(eq(productSupportNotes.userId, user.id)).orderBy(desc(productSupportNotes.createdAt)).limit(10),
        db.select().from(productBillingEvents).where(eq(productBillingEvents.userId, user.id)).orderBy(desc(productBillingEvents.createdAt)).limit(20),
        db.select().from(processedStripeEvents)
            .where(gte(processedStripeEvents.receivedAt, daysAgo(120)))
            .orderBy(desc(processedStripeEvents.receivedAt))
            .limit(50),
    ]);
    const diagnosis = diagnoseRevenueOpsSupport({
        userId: user.id,
        access,
        subscriptions,
        grants,
        checkoutAttempts,
        quotaEntries,
        billingEvents,
        stripeEvents,
        auth: {
            expectedUserId: user.id,
        },
    });

    return sanitizeRevenueOpsRecord({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        access,
        subscriptions,
        grants,
        checkoutAttempts,
        quotaEntries,
        supportNotes: supportNotes.map((note) => ({
            id: note.id,
            category: note.category,
            visibility: note.visibility,
            createdAt: note.createdAt,
        })),
        billingEvents,
        diagnosis,
        supportSummary: buildRevenueOpsSafeSupportSummary(diagnosis.firstCause),
    });
}

async function writeRevenueOpsBillingEvent(input: {
    readonly userId: string;
    readonly actorUserId: string;
    readonly eventType: string;
    readonly targetType: string;
    readonly metadata: Record<string, unknown>;
}) {
    await db.insert(productBillingEvents).values({
        userId: input.userId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        targetType: input.targetType,
        severity: 'info',
        metadata: input.metadata,
    });
}

export async function getRevenueOpsCockpitSnapshot(input: unknown = {}) {
    const staff = await requireRevenueOpsStaff();
    const parsed = cockpitSnapshotSchema.parse(input);
    const since = daysAgo(parsed.rangeDays);
    const [events, checkoutAttempts, subscriptions, quotaEntries] = await loadAggregateRows(since);
    const funnel = buildRevenueOpsFunnelSnapshot({
        events,
        checkoutAttempts,
        subscriptions,
        quotaEntries,
    });
    const detail = parsed.userId
        ? await loadUserSupportRows(parsed.userId)
        : null;

    return sanitizeRevenueOpsRecord({
        viewerRole: staff.role,
        rangeDays: parsed.rangeDays,
        detailReason: parsed.detailReason ?? null,
        aggregateOnly: parsed.userId === undefined,
        funnel,
        detail,
    });
}

export async function getRevenueOpsSupportSnapshot(input: unknown) {
    await requireRevenueOpsStaff();
    const parsed = supportSnapshotSchema.parse(input);
    const detail = await loadUserSupportRows(parsed.userId);

    return sanitizeRevenueOpsRecord({
        detailReason: parsed.detailReason,
        detail,
    });
}

export async function createRevenueOpsSupportNote(input: unknown) {
    const staff = await requireRevenueOpsStaff();
    const parsed = supportNoteSchema.parse(input);
    const [note] = await db.insert(productSupportNotes).values({
        userId: parsed.userId,
        actorUserId: staff.id,
        category: `revenue_ops.${parsed.detailReason}`,
        note: parsed.note,
        visibility: 'internal',
        metadata: {
            detailReason: parsed.detailReason,
            owner: parsed.owner,
        },
    }).returning();

    await writeRevenueOpsBillingEvent({
        userId: parsed.userId,
        actorUserId: staff.id,
        eventType: 'revenue_ops.support_note_created',
        targetType: 'product_support_note',
        metadata: {
            noteId: note?.id ?? null,
            detailReason: parsed.detailReason,
            owner: parsed.owner,
        },
    });
    revalidatePath('/admin/revenue-ops');
    revalidatePath('/admin/billing');

    return sanitizeRevenueOpsRecord({
        success: true,
        noteId: note?.id ?? null,
        detailReason: parsed.detailReason,
        owner: parsed.owner,
    });
}

export async function requestRevenueOpsAdminReconciliation(input: unknown) {
    const staff = await requireRevenueOpsStaff();
    const parsed = supportSnapshotSchema.parse(input);

    await writeRevenueOpsBillingEvent({
        userId: parsed.userId,
        actorUserId: staff.id,
        eventType: 'revenue_ops.admin_reconciliation_requested',
        targetType: 'product_subscription',
        metadata: {
            detailReason: parsed.detailReason,
            requesterRole: staff.role,
            note: 'Revenue Ops support requested admin reconciliation without mutating paid state.',
        },
    });
    await db.insert(monetizationAnalyticsEvents).values({
        userId: parsed.userId,
        eventType: 'admin.reconciliation_requested',
        eventSource: 'admin',
        metadata: {
            detailReason: parsed.detailReason,
            requesterRole: staff.role,
        },
    });
    revalidatePath('/admin/revenue-ops');
    revalidatePath('/admin/billing');

    return {
        success: true as const,
        detailReason: parsed.detailReason as RevenueOpsDetailReason,
    };
}

export async function copyRevenueOpsSafeSupportSummary(input: unknown) {
    await requireRevenueOpsStaff();
    const parsed = supportSnapshotSchema.parse(input);
    const detail = await loadUserSupportRows(parsed.userId);
    const diagnosis = detail && typeof detail === 'object' && 'diagnosis' in detail
        ? detail.diagnosis as ReturnType<typeof diagnoseRevenueOpsSupport>
        : null;

    return sanitizeRevenueOpsRecord({
        detailReason: parsed.detailReason,
        summary: diagnosis
            ? buildRevenueOpsSafeSupportSummary(diagnosis.firstCause)
            : 'Revenue Ops diagnosis unavailable for this user.',
    });
}
