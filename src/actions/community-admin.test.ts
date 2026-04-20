import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    auditLogs,
    communityModerationActions,
    communityPostComments,
    communityPosts,
    communityProfiles,
    communityReports,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const excludeCommunityEntityFromGamification = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const orderBy = vi.fn();
    const limit = vi.fn();

    const insert = vi.fn();
    const moderationActionValues = vi.fn();
    const auditLogValues = vi.fn();

    const update = vi.fn();
    const postSet = vi.fn();
    const postWhere = vi.fn();
    const commentSet = vi.fn();
    const commentWhere = vi.fn();
    const profileSet = vi.fn();
    const profileWhere = vi.fn();
    const reportSet = vi.fn();
    const reportWhere = vi.fn();

    const revalidatePath = vi.fn();

    return {
        auth,
        excludeCommunityEntityFromGamification,
        select,
        from,
        where,
        orderBy,
        limit,
        insert,
        moderationActionValues,
        auditLogValues,
        update,
        postSet,
        postWhere,
        commentSet,
        commentWhere,
        profileSet,
        profileWhere,
        reportSet,
        reportWhere,
        revalidatePath,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/community-progression-recorder', () => ({
    excludeCommunityEntityFromGamification: mocks.excludeCommunityEntityFromGamification,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        update: mocks.update,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

import {
    applyCommunityModerationAction,
    listOpenCommunityReports,
} from './community-admin';

describe('community admin moderation queue', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: {
                id: 'admin-1',
                role: 'admin',
            },
        });
        mocks.excludeCommunityEntityFromGamification.mockResolvedValue(undefined);

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            orderBy: mocks.orderBy,
            limit: mocks.limit,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityModerationActions) {
                return {
                    values: mocks.moderationActionValues,
                };
            }

            if (table === auditLogs) {
                return {
                    values: mocks.auditLogValues,
                };
            }

            throw new Error(`Unexpected insert table: ${String(table)}`);
        });

        mocks.update.mockImplementation((table) => {
            if (table === communityPosts) {
                return {
                    set: mocks.postSet,
                };
            }

            if (table === communityPostComments) {
                return {
                    set: mocks.commentSet,
                };
            }

            if (table === communityProfiles) {
                return {
                    set: mocks.profileSet,
                };
            }

            if (table === communityReports) {
                return {
                    set: mocks.reportSet,
                };
            }

            throw new Error(`Unexpected update table: ${String(table)}`);
        });

        mocks.postSet.mockReturnValue({
            where: mocks.postWhere,
        });
        mocks.commentSet.mockReturnValue({
            where: mocks.commentWhere,
        });
        mocks.profileSet.mockReturnValue({
            where: mocks.profileWhere,
        });
        mocks.reportSet.mockReturnValue({
            where: mocks.reportWhere,
        });

        mocks.postWhere.mockResolvedValue(undefined);
        mocks.commentWhere.mockResolvedValue(undefined);
        mocks.profileWhere.mockResolvedValue(undefined);
        mocks.reportWhere.mockResolvedValue(undefined);
        mocks.moderationActionValues.mockResolvedValue(undefined);
        mocks.auditLogValues.mockResolvedValue(undefined);
    });

    it('requires authenticated admin before listing open community reports', async () => {
        mocks.auth.mockResolvedValue({
            user: {
                id: 'user-1',
                role: 'user',
            },
        });

        const result = await listOpenCommunityReports();

        expect(result).toEqual({
            success: false,
            error: 'Apenas admin autenticado pode acessar a fila de moderacao.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
    });

    it('lists open reports for authenticated admin ordered by creation date', async () => {
        const firstCreatedAt = new Date('2026-04-19T09:00:00.000Z');
        const secondCreatedAt = new Date('2026-04-19T09:05:00.000Z');

        mocks.orderBy.mockResolvedValueOnce([
            {
                id: 'report-1',
                entityType: 'post',
                entityId: 'post-1',
                reasonKey: 'spam',
                details: 'Mesmo conteudo repetido.',
                status: 'open',
                reportedByUserId: 'user-1',
                createdAt: firstCreatedAt,
            },
            {
                id: 'report-2',
                entityType: 'comment',
                entityId: 'comment-1',
                reasonKey: 'abuse',
                details: null,
                status: 'open',
                reportedByUserId: 'user-2',
                createdAt: secondCreatedAt,
            },
        ]);

        const result = await listOpenCommunityReports();

        expect(result).toEqual({
            success: true,
            reports: [
                {
                    id: 'report-1',
                    entityType: 'post',
                    entityId: 'post-1',
                    reasonKey: 'spam',
                    details: 'Mesmo conteudo repetido.',
                    status: 'open',
                    reportedByUserId: 'user-1',
                    createdAt: firstCreatedAt,
                },
                {
                    id: 'report-2',
                    entityType: 'comment',
                    entityId: 'comment-1',
                    reasonKey: 'abuse',
                    details: null,
                    status: 'open',
                    reportedByUserId: 'user-2',
                    createdAt: secondCreatedAt,
                },
            ],
        });
    });

    it('requires authenticated admin before applying a moderation action', async () => {
        mocks.auth.mockResolvedValue({
            user: {
                id: 'user-1',
                role: 'support',
            },
        });

        const result = await applyCommunityModerationAction({
            reportId: 'report-1',
            actionKey: 'hide',
            notes: 'Ocultar por reincidencia.',
        });

        expect(result).toEqual({
            success: false,
            error: 'Apenas admin autenticado pode moderar reports.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('hides the reported entity, updates the report and writes moderation plus audit trails', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'report-1',
                entityType: 'post',
                entityId: 'post-1',
                reasonKey: 'spam',
                status: 'open',
            },
        ]);

        const result = await applyCommunityModerationAction({
            reportId: 'report-1',
            actionKey: 'hide',
            notes: 'Ocultado apos revisao manual.',
        });

        expect(result).toEqual({
            success: true,
            reportId: 'report-1',
            reportStatus: 'actioned',
            entityType: 'post',
            entityId: 'post-1',
            actionKey: 'hide',
        });
        expect(mocks.postSet).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'hidden',
                updatedAt: expect.any(Date),
            }),
        );
        expect(mocks.reportSet).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'actioned',
                reviewedByUserId: 'admin-1',
                reviewedAt: expect.any(Date),
            }),
        );
        expect(mocks.moderationActionValues).toHaveBeenCalledWith({
            entityType: 'post',
            entityId: 'post-1',
            actionKey: 'hide',
            actorUserId: 'admin-1',
            notes: 'Ocultado apos revisao manual.',
            metadata: {
                reportId: 'report-1',
                reportReasonKey: 'spam',
                reportStatus: 'actioned',
            },
        });
        expect(mocks.auditLogValues).toHaveBeenCalledWith({
            adminId: 'admin-1',
            action: 'COMMUNITY_MODERATION_HIDE',
            target: 'post-1',
            details: {
                reportId: 'report-1',
                entityType: 'post',
                actionKey: 'hide',
            },
        });
        expect(mocks.excludeCommunityEntityFromGamification).toHaveBeenCalledWith({
            entityType: 'post',
            entityId: 'post-1',
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/community');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/logs');
    });

    it('dismisses an open report without mutating the entity but still records the administrative trail', async () => {
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'report-2',
                entityType: 'profile',
                entityId: 'profile-1',
                reasonKey: 'abuse',
                status: 'open',
            },
        ]);

        const result = await applyCommunityModerationAction({
            reportId: 'report-2',
            actionKey: 'dismiss',
            notes: 'Sem evidencia suficiente para acao.',
        });

        expect(result).toEqual({
            success: true,
            reportId: 'report-2',
            reportStatus: 'dismissed',
            entityType: 'profile',
            entityId: 'profile-1',
            actionKey: 'dismiss',
        });
        expect(mocks.postSet).not.toHaveBeenCalled();
        expect(mocks.commentSet).not.toHaveBeenCalled();
        expect(mocks.profileSet).not.toHaveBeenCalled();
        expect(mocks.reportSet).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'dismissed',
                reviewedByUserId: 'admin-1',
                reviewedAt: expect.any(Date),
            }),
        );
        expect(mocks.moderationActionValues).toHaveBeenCalledWith({
            entityType: 'profile',
            entityId: 'profile-1',
            actionKey: 'dismiss',
            actorUserId: 'admin-1',
            notes: 'Sem evidencia suficiente para acao.',
            metadata: {
                reportId: 'report-2',
                reportReasonKey: 'abuse',
                reportStatus: 'dismissed',
            },
        });
        expect(mocks.auditLogValues).toHaveBeenCalledWith({
            adminId: 'admin-1',
            action: 'COMMUNITY_MODERATION_DISMISS',
            target: 'profile-1',
            details: {
                reportId: 'report-2',
                entityType: 'profile',
                actionKey: 'dismiss',
            },
        });
        expect(mocks.excludeCommunityEntityFromGamification).not.toHaveBeenCalled();
    });
});
