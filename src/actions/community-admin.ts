'use server';

import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    auditLogs,
    communityModerationActions,
    communityPostComments,
    communityPosts,
    communityProfiles,
    communityReports,
    type CommunityReportEntityType,
} from '@/db/schema';

type CommunityAdminSession =
    | {
        readonly ok: true;
        readonly userId: string;
    }
    | {
        readonly ok: false;
    };

export interface CommunityAdminOpenReport {
    readonly id: string;
    readonly entityType: CommunityReportEntityType;
    readonly entityId: string;
    readonly reasonKey: string;
    readonly details: string | null;
    readonly status: 'open';
    readonly reportedByUserId: string;
    readonly createdAt: Date;
}

export interface ApplyCommunityModerationActionInput {
    readonly reportId: string;
    readonly actionKey: 'hide' | 'dismiss';
    readonly notes?: string | null;
}

type ListOpenCommunityReportsResult =
    | {
        readonly success: true;
        readonly reports: readonly CommunityAdminOpenReport[];
    }
    | {
        readonly success: false;
        readonly error: string;
    };

type ApplyCommunityModerationActionResult =
    | {
        readonly success: true;
        readonly reportId: string;
        readonly reportStatus: 'actioned' | 'dismissed';
        readonly entityType: CommunityReportEntityType;
        readonly entityId: string;
        readonly actionKey: 'hide' | 'dismiss';
    }
    | {
        readonly success: false;
        readonly error: string;
    };

async function getAdminSession(): Promise<CommunityAdminSession> {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'admin') {
        return {
            ok: false,
        };
    }

    return {
        ok: true,
        userId: session.user.id,
    };
}

async function hideReportedEntity(
    entityType: CommunityReportEntityType,
    entityId: string,
): Promise<void> {
    const updatedAt = new Date();

    switch (entityType) {
        case 'post':
            await db
                .update(communityPosts)
                .set({
                    status: 'hidden',
                    updatedAt,
                })
                .where(eq(communityPosts.id, entityId));
            return;

        case 'comment':
            await db
                .update(communityPostComments)
                .set({
                    status: 'moderator_hidden',
                    updatedAt,
                })
                .where(eq(communityPostComments.id, entityId));
            return;

        case 'profile':
            await db
                .update(communityProfiles)
                .set({
                    visibility: 'hidden',
                    updatedAt,
                })
                .where(eq(communityProfiles.id, entityId));
            return;
    }
}

export async function listOpenCommunityReports(): Promise<ListOpenCommunityReportsResult> {
    const adminSession = await getAdminSession();

    if (!adminSession.ok) {
        return {
            success: false,
            error: 'Apenas admin autenticado pode acessar a fila de moderacao.',
        };
    }

    const rows = await db
        .select({
            id: communityReports.id,
            entityType: communityReports.entityType,
            entityId: communityReports.entityId,
            reasonKey: communityReports.reasonKey,
            details: communityReports.details,
            status: communityReports.status,
            reportedByUserId: communityReports.reportedByUserId,
            createdAt: communityReports.createdAt,
        })
        .from(communityReports)
        .where(eq(communityReports.status, 'open'))
        .orderBy(asc(communityReports.createdAt));

    return {
        success: true,
        reports: rows as readonly CommunityAdminOpenReport[],
    };
}

export async function applyCommunityModerationAction(
    input: ApplyCommunityModerationActionInput,
): Promise<ApplyCommunityModerationActionResult> {
    const adminSession = await getAdminSession();

    if (!adminSession.ok) {
        return {
            success: false,
            error: 'Apenas admin autenticado pode moderar reports.',
        };
    }

    const normalizedReportId = input.reportId.trim();
    const normalizedNotes = input.notes?.trim() || null;

    if (!normalizedReportId) {
        return {
            success: false,
            error: 'Report invalido.',
        };
    }

    if (input.actionKey !== 'hide' && input.actionKey !== 'dismiss') {
        return {
            success: false,
            error: 'Acao de moderacao invalida.',
        };
    }

    const [storedReport] = await db
        .select({
            id: communityReports.id,
            entityType: communityReports.entityType,
            entityId: communityReports.entityId,
            reasonKey: communityReports.reasonKey,
            status: communityReports.status,
        })
        .from(communityReports)
        .where(eq(communityReports.id, normalizedReportId))
        .limit(1);

    if (!storedReport || storedReport.status !== 'open') {
        return {
            success: false,
            error: 'Report aberto nao encontrado.',
        };
    }

    const reportStatus = input.actionKey === 'hide' ? 'actioned' : 'dismissed';
    const reviewedAt = new Date();

    if (input.actionKey === 'hide') {
        await hideReportedEntity(storedReport.entityType, storedReport.entityId);
    }

    await db
        .update(communityReports)
        .set({
            status: reportStatus,
            reviewedAt,
            reviewedByUserId: adminSession.userId,
        })
        .where(eq(communityReports.id, storedReport.id));

    await db.insert(communityModerationActions).values({
        entityType: storedReport.entityType,
        entityId: storedReport.entityId,
        actionKey: input.actionKey,
        actorUserId: adminSession.userId,
        notes: normalizedNotes,
        metadata: {
            reportId: storedReport.id,
            reportReasonKey: storedReport.reasonKey,
            reportStatus,
        },
    });

    await db.insert(auditLogs).values({
        adminId: adminSession.userId,
        action:
            input.actionKey === 'hide'
                ? 'COMMUNITY_MODERATION_HIDE'
                : 'COMMUNITY_MODERATION_DISMISS',
        target: storedReport.entityId,
        details: {
            reportId: storedReport.id,
            entityType: storedReport.entityType,
            actionKey: input.actionKey,
        },
    });

    revalidatePath('/admin/community');
    revalidatePath('/admin/logs');

    return {
        success: true,
        reportId: storedReport.id,
        reportStatus,
        entityType: storedReport.entityType,
        entityId: storedReport.entityId,
        actionKey: input.actionKey,
    };
}
