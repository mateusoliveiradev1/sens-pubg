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
    socialProReportAuditEvents,
    socialProReportLinks,
    socialProReports,
    type CommunityReportEntityType,
} from '@/db/schema';
import { excludeCommunityEntityFromGamification } from '@/lib/community-progression-recorder';
import { isSocialProReportModerationReason } from '@/types/social-pro';

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
    readonly actionKey: 'hide' | 'dismiss' | 'disable';
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
        readonly actionKey: 'hide' | 'dismiss' | 'disable';
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
        case 'social_pro_report':
        case 'social_pro_report_link':
            return;
    }
}

function isClassicCommunityEntity(entityType: CommunityReportEntityType): boolean {
    return entityType === 'post' || entityType === 'comment' || entityType === 'profile';
}

function socialProEventTypeForModeration(
    entityType: CommunityReportEntityType,
    actionKey: 'hide' | 'disable',
): 'social_pro.report.hidden' | 'social_pro.report.disabled' | 'social_pro.private_link.revoked' {
    if (entityType === 'social_pro_report_link') {
        return 'social_pro.private_link.revoked';
    }

    return actionKey === 'disable'
        ? 'social_pro.report.disabled'
        : 'social_pro.report.hidden';
}

async function applySocialProModeration(input: {
    readonly entityType: CommunityReportEntityType;
    readonly entityId: string;
    readonly actionKey: 'hide' | 'disable';
    readonly actorUserId: string;
    readonly communityReportId: string;
    readonly reasonKey: string;
    readonly notes: string | null;
}): Promise<void> {
    const eventType = socialProEventTypeForModeration(input.entityType, input.actionKey);
    const reasonKey = isSocialProReportModerationReason(input.reasonKey)
        ? input.reasonKey
        : undefined;
    const now = new Date();

    if (input.entityType === 'social_pro_report') {
        const reportStatus = input.actionKey === 'disable' ? 'disabled' : 'hidden';

        await db
            .update(socialProReports)
            .set({
                status: reportStatus,
                updatedAt: now,
            })
            .where(eq(socialProReports.id, input.entityId));

        await db.insert(socialProReportAuditEvents).values({
            reportId: input.entityId,
            actorUserId: input.actorUserId,
            eventType,
            reportStatus,
            ...(reasonKey ? { reasonKey } : {}),
            metadata: {
                communityReportId: input.communityReportId,
                actionKey: input.actionKey,
                notes: input.notes,
                silentDeletion: false,
            },
        });
    }

    if (input.entityType === 'social_pro_report_link') {
        const [storedLink] = await db
            .select({
                id: socialProReportLinks.id,
                reportId: socialProReportLinks.reportId,
            })
            .from(socialProReportLinks)
            .where(eq(socialProReportLinks.id, input.entityId))
            .limit(1);

        if (storedLink) {
            await db
                .update(socialProReportLinks)
                .set({
                    status: 'revoked',
                    revokedByUserId: input.actorUserId,
                    revokedAt: now,
                    updatedAt: now,
                })
                .where(eq(socialProReportLinks.id, input.entityId));

            await db.insert(socialProReportAuditEvents).values({
                reportId: storedLink.reportId,
                actorUserId: input.actorUserId,
                linkId: storedLink.id,
                eventType,
                ...(reasonKey ? { reasonKey } : {}),
                metadata: {
                    communityReportId: input.communityReportId,
                    actionKey: input.actionKey,
                    notes: input.notes,
                    silentDeletion: false,
                },
            });
        }
    }

    await db.insert(auditLogs).values({
        adminId: input.actorUserId,
        action: eventType,
        target: input.entityId,
        details: {
            reportId: input.communityReportId,
            entityType: input.entityType,
            actionKey: input.actionKey,
        },
    });
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

    if (input.actionKey !== 'hide' && input.actionKey !== 'dismiss' && input.actionKey !== 'disable') {
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

    const reportStatus = input.actionKey === 'dismiss' ? 'dismissed' : 'actioned';
    const reviewedAt = new Date();

    if (input.actionKey === 'hide') {
        await hideReportedEntity(storedReport.entityType, storedReport.entityId);

        if (isClassicCommunityEntity(storedReport.entityType)) {
            await excludeCommunityEntityFromGamification({
                entityType: storedReport.entityType,
                entityId: storedReport.entityId,
            });
        }
    }

    if (
        (input.actionKey === 'hide' || input.actionKey === 'disable')
        && (storedReport.entityType === 'social_pro_report' || storedReport.entityType === 'social_pro_report_link')
    ) {
        await applySocialProModeration({
            entityType: storedReport.entityType,
            entityId: storedReport.entityId,
            actionKey: input.actionKey,
            actorUserId: adminSession.userId,
            communityReportId: storedReport.id,
            reasonKey: storedReport.reasonKey,
            notes: normalizedNotes,
        });
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

    if (isClassicCommunityEntity(storedReport.entityType) || input.actionKey === 'dismiss') {
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
    }

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
