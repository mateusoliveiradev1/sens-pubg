'use server';

import { desc, eq, ilike, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/auth';
import { db } from '@/db';
import { recordAuditLog } from '@/db/audit-log';
import {
    monetizationAnalyticsEvents,
    productBillingEvents,
    productCheckoutAttempts,
    productQuotaLedger,
    productSubscriptions,
    productSupportNotes,
    productUserGrants,
    users,
} from '@/db/schema';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import type { ProductEntitlementKey, ProductTier } from '@/types/monetization';

type StaffRole = 'admin' | 'support' | 'mod';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const userLookupSchema = z.object({
    query: z.string().trim().min(3).max(160),
});

const supportNoteSchema = z.object({
    userId: z.string().uuid(),
    category: z.string().trim().min(3).max(80),
    note: z.string().trim().min(5).max(2000),
});

const grantSchema = z.object({
    userId: z.string().uuid(),
    tier: z.enum(['pro', 'founder']).default('pro'),
    entitlementKey: z.string().default('coach.full_plan'),
    reasonCode: z.string().trim().min(3).max(80),
    endsAt: z.coerce.date().optional(),
    quotaBoost: z.coerce.number().int().min(0).max(100).default(0),
    auditNote: z.string().trim().min(5).max(1000),
});

const revokeSchema = z.object({
    grantId: z.string().uuid(),
    reasonCode: z.string().trim().min(3).max(80),
    auditNote: z.string().trim().min(5).max(1000),
});

const suspensionSchema = z.object({
    userId: z.string().uuid(),
    reason: z.enum(['fraud', 'chargeback', 'abuse', 'manual']),
    auditNote: z.string().trim().min(5).max(1000),
});

async function requireStaff(): Promise<{ readonly id: string; readonly role: StaffRole }> {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || (role !== 'admin' && role !== 'support' && role !== 'mod')) {
        throw new Error('Unauthorized: staff billing access required');
    }

    return { id: userId, role };
}

function assertAdmin(role: StaffRole): void {
    if (role !== 'admin') {
        throw new Error('Unauthorized: admin role required for billing mutation');
    }
}

async function writeBillingOpsEvent(input: {
    readonly userId: string;
    readonly actorUserId: string;
    readonly eventType: string;
    readonly targetType: string;
    readonly targetId?: string | null;
    readonly metadata: Record<string, unknown>;
}) {
    await db.insert(productBillingEvents).values({
        userId: input.userId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        severity: 'info',
        metadata: input.metadata,
    });
}

async function writeAdminAnalyticsEvent(input: {
    readonly userId: string;
    readonly eventType: 'admin.grant_created' | 'admin.grant_revoked' | 'admin.suspension_created' | 'admin.support_note_created' | 'admin.reconciliation_requested';
    readonly metadata: Record<string, unknown>;
}) {
    await db.insert(monetizationAnalyticsEvents).values({
        userId: input.userId,
        eventType: input.eventType,
        eventSource: 'admin',
        metadata: input.metadata,
    });
}

export async function lookupAdminBillingUser(input: unknown) {
    const staff = await requireStaff();
    const parsed = userLookupSchema.parse(input);
    const lookupConditions = [
        ilike(users.email, `%${parsed.query}%`),
        ilike(users.name, `%${parsed.query}%`),
    ];

    if (UUID_PATTERN.test(parsed.query)) {
        lookupConditions.unshift(eq(users.id, parsed.query));
    }

    const rows = await db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
        })
        .from(users)
        .where(or(...lookupConditions))
        .limit(5);

    return Promise.all(rows.map(async (user) => ({
        ...user,
        viewerRole: staff.role,
        access: await resolveServerProductAccess(user.id),
    })));
}

export async function getAdminBillingSnapshot(userId: string) {
    const staff = await requireStaff();
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

    const [access, subscriptions, grants, attempts, quotaEntries, notes, events] = await Promise.all([
        resolveServerProductAccess(user.id),
        db.select().from(productSubscriptions).where(eq(productSubscriptions.userId, user.id)).orderBy(desc(productSubscriptions.updatedAt)).limit(5),
        db.select().from(productUserGrants).where(eq(productUserGrants.userId, user.id)).orderBy(desc(productUserGrants.createdAt)).limit(10),
        db.select().from(productCheckoutAttempts).where(eq(productCheckoutAttempts.userId, user.id)).orderBy(desc(productCheckoutAttempts.createdAt)).limit(10),
        db.select().from(productQuotaLedger).where(eq(productQuotaLedger.userId, user.id)).orderBy(desc(productQuotaLedger.createdAt)).limit(10),
        db.select().from(productSupportNotes).where(eq(productSupportNotes.userId, user.id)).orderBy(desc(productSupportNotes.createdAt)).limit(10),
        db.select().from(productBillingEvents).where(eq(productBillingEvents.userId, user.id)).orderBy(desc(productBillingEvents.createdAt)).limit(20),
    ]);

    return {
        user,
        viewerRole: staff.role,
        access,
        subscriptions,
        grants,
        attempts,
        quotaEntries,
        notes,
        events,
    };
}

export async function createManualProGrant(input: unknown) {
    const staff = await requireStaff();
    assertAdmin(staff.role);
    const parsed = grantSchema.parse(input);
    const [grant] = await db.insert(productUserGrants).values({
        userId: parsed.userId,
        entitlementKey: parsed.entitlementKey as ProductEntitlementKey,
        tier: parsed.tier as ProductTier,
        source: 'manual_admin',
        status: 'active',
        reasonCode: parsed.reasonCode,
        quotaBoost: parsed.quotaBoost,
        actorUserId: staff.id,
        auditMetadata: {
            auditNote: parsed.auditNote,
        },
        ...(parsed.endsAt ? { endsAt: parsed.endsAt } : {}),
    }).returning();

    await writeBillingOpsEvent({
        userId: parsed.userId,
        actorUserId: staff.id,
        eventType: 'admin.grant_created',
        targetType: 'product_user_grant',
        targetId: grant?.id ?? null,
        metadata: { reasonCode: parsed.reasonCode },
    });
    await writeAdminAnalyticsEvent({
        userId: parsed.userId,
        eventType: 'admin.grant_created',
        metadata: { reasonCode: parsed.reasonCode },
    });
    await recordAuditLog('ENTITLEMENT_GRANTED', parsed.userId, {
        grantId: grant?.id ?? null,
        reasonCode: parsed.reasonCode,
    });
    revalidatePath('/admin/billing');

    return { success: true as const, grantId: grant?.id ?? null };
}

export async function revokeManualProGrant(input: unknown) {
    const staff = await requireStaff();
    assertAdmin(staff.role);
    const parsed = revokeSchema.parse(input);
    const [grant] = await db.update(productUserGrants)
        .set({
            status: 'revoked',
            revokedAt: new Date(),
            updatedAt: new Date(),
            auditMetadata: {
                reasonCode: parsed.reasonCode,
                auditNote: parsed.auditNote,
                revokedBy: staff.id,
            },
        })
        .where(eq(productUserGrants.id, parsed.grantId))
        .returning();

    if (!grant) {
        throw new Error('Grant not found');
    }

    await writeBillingOpsEvent({
        userId: grant.userId,
        actorUserId: staff.id,
        eventType: 'admin.grant_revoked',
        targetType: 'product_user_grant',
        targetId: grant.id,
        metadata: { reasonCode: parsed.reasonCode },
    });
    await writeAdminAnalyticsEvent({
        userId: grant.userId,
        eventType: 'admin.grant_revoked',
        metadata: { reasonCode: parsed.reasonCode },
    });
    await recordAuditLog('ENTITLEMENT_REVOKED', grant.userId, { grantId: grant.id });
    revalidatePath('/admin/billing');

    return { success: true as const };
}

export async function applyBillingSuspension(input: unknown) {
    const staff = await requireStaff();
    assertAdmin(staff.role);
    const parsed = suspensionSchema.parse(input);
    await db.update(productSubscriptions)
        .set({
            billingStatus: 'suspended',
            accessState: 'suspended',
            suspendedAt: new Date(),
            suspensionReason: parsed.reason,
            updatedAt: new Date(),
        })
        .where(eq(productSubscriptions.userId, parsed.userId));

    await writeBillingOpsEvent({
        userId: parsed.userId,
        actorUserId: staff.id,
        eventType: 'admin.suspension_created',
        targetType: 'product_subscription',
        metadata: { reason: parsed.reason, auditNote: parsed.auditNote },
    });
    await writeAdminAnalyticsEvent({
        userId: parsed.userId,
        eventType: 'admin.suspension_created',
        metadata: { reason: parsed.reason },
    });
    await recordAuditLog('ENTITLEMENT_SUSPENDED', parsed.userId, { reason: parsed.reason });
    revalidatePath('/admin/billing');

    return { success: true as const };
}

export async function recordBillingSupportNote(input: unknown) {
    const staff = await requireStaff();
    const parsed = supportNoteSchema.parse(input);
    const [note] = await db.insert(productSupportNotes).values({
        userId: parsed.userId,
        actorUserId: staff.id,
        category: parsed.category,
        note: parsed.note,
        visibility: 'internal',
    }).returning();

    await writeBillingOpsEvent({
        userId: parsed.userId,
        actorUserId: staff.id,
        eventType: 'admin.support_note_created',
        targetType: 'product_support_note',
        targetId: note?.id ?? null,
        metadata: { category: parsed.category },
    });
    await writeAdminAnalyticsEvent({
        userId: parsed.userId,
        eventType: 'admin.support_note_created',
        metadata: { category: parsed.category },
    });
    revalidatePath('/admin/billing');

    return { success: true as const, noteId: note?.id ?? null };
}

export async function forceStripeReconciliation(userId: string) {
    const staff = await requireStaff();
    assertAdmin(staff.role);
    await writeBillingOpsEvent({
        userId,
        actorUserId: staff.id,
        eventType: 'admin.reconciliation_requested',
        targetType: 'product_subscription',
        metadata: {
            source: 'manual_admin',
            note: 'Manual reconciliation queued for Stripe truth check.',
        },
    });
    await writeAdminAnalyticsEvent({
        userId,
        eventType: 'admin.reconciliation_requested',
        metadata: { source: 'manual_admin' },
    });
    await recordAuditLog('WEBHOOK_PROCESSED', userId, { source: 'manual_reconciliation_request' });
    revalidatePath('/admin/billing');

    return { success: true as const };
}
