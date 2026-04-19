import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    communityFollows,
    communityPostAnalysisSnapshots,
    communityPostComments,
    communityPostCopyEvents,
    communityPostLikes,
    communityPosts,
    communityPostSaves,
    communityReports,
} from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const innerJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const deleteFn = vi.fn();
    const deleteWhere = vi.fn();
    const postValues = vi.fn();
    const returning = vi.fn();
    const snapshotValues = vi.fn();
    const copyEventValues = vi.fn();
    const likeValues = vi.fn();
    const saveValues = vi.fn();
    const commentValues = vi.fn();
    const followValues = vi.fn();
    const reportValues = vi.fn();
    const onConflictDoNothing = vi.fn();
    const revalidatePath = vi.fn();
    const createCommunityPostAnalysisSnapshot = vi.fn();
    const checkCommunityActionRateLimit = vi.fn();

    return {
        auth,
        select,
        from,
        innerJoin,
        where,
        limit,
        orderBy,
        insert,
        deleteFn,
        deleteWhere,
        postValues,
        returning,
        snapshotValues,
        copyEventValues,
        likeValues,
        saveValues,
        commentValues,
        followValues,
        reportValues,
        onConflictDoNothing,
        revalidatePath,
        createCommunityPostAnalysisSnapshot,
        checkCommunityActionRateLimit,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.deleteFn,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/core/community-post-snapshot', () => ({
    createCommunityPostAnalysisSnapshot: mocks.createCommunityPostAnalysisSnapshot,
}));

vi.mock('@/lib/rate-limit', () => ({
    checkCommunityActionRateLimit: mocks.checkCommunityActionRateLimit,
}));

import { createCommunityPostComment } from './community-comments';
import { copyCommunityPostSens } from './community-copy';
import { setCommunityProfileFollow } from './community-follows';
import { setCommunityPostLike } from './community-likes';
import { publishAnalysisSessionToCommunity } from './community-posts';
import { createCommunityReport } from './community-reports';
import { setCommunityPostSave } from './community-saves';

function createStoredCopySensPreset() {
    return {
        profiles: [
            {
                type: 'balanced',
                label: 'Balanced',
                description: 'Balanced control preset',
                general: 50,
                ads: 47,
                scopes: [
                    {
                        scopeName: '1x',
                        current: 48,
                        recommended: 46,
                        changePercent: -4.16,
                    },
                ],
                cmPer360: 41,
            },
        ] as const,
        recommended: 'balanced',
        tier: 'apply_ready',
        evidenceTier: 'strong',
        confidenceScore: 0.84,
        reasoning: 'Snapshot recommendation',
        suggestedVSM: 1.02,
    };
}

function createStoredAnalysisSessionRow() {
    return {
        id: 'session-1',
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        patchVersion: '35.1',
        stance: 'standing',
        attachments: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        },
        distance: 35,
        fullResult: {
            id: 'analysis-1',
            timestamp: '2026-04-19T15:00:00.000Z',
            diagnoses: [
                {
                    type: 'horizontal_instability',
                },
            ],
        } as Record<string, unknown>,
    };
}

function createStoredSnapshot() {
    return {
        analysisSessionId: 'session-1',
        analysisResultId: 'analysis-1',
        analysisTimestamp: new Date('2026-04-19T15:00:00.000Z'),
        analysisResultSchemaVersion: 'v1',
        patchVersion: '35.1',
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        distance: 35,
        stance: 'standing',
        attachmentsSnapshot: {
            muzzle: 'compensator',
        },
        metricsSnapshot: {},
        diagnosesSnapshot: [],
        coachingSnapshot: [],
        sensSnapshot: createStoredCopySensPreset(),
        trackingSnapshot: {},
    };
}

function createRateLimitAllowedResult() {
    return {
        success: true,
        remaining: 9,
        resetMs: 1_000,
    };
}

function createRateLimitBlockedResult() {
    return {
        success: false,
        remaining: 0,
        resetMs: 60_000,
    };
}

describe('community mutation rate limiting', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            innerJoin: mocks.innerJoin,
            where: mocks.where,
        });

        mocks.innerJoin.mockReturnValue({
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityPosts) {
                return {
                    values: mocks.postValues,
                };
            }

            if (table === communityPostAnalysisSnapshots) {
                return {
                    values: mocks.snapshotValues,
                };
            }

            if (table === communityPostCopyEvents) {
                return {
                    values: mocks.copyEventValues,
                };
            }

            if (table === communityPostLikes) {
                return {
                    values: mocks.likeValues,
                };
            }

            if (table === communityPostSaves) {
                return {
                    values: mocks.saveValues,
                };
            }

            if (table === communityPostComments) {
                return {
                    values: mocks.commentValues,
                };
            }

            if (table === communityFollows) {
                return {
                    values: mocks.followValues,
                };
            }

            if (table === communityReports) {
                return {
                    values: mocks.reportValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.postValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([
            {
                id: 'post-1',
                slug: 'player-one-session-1',
                status: 'draft',
            },
        ]);
        mocks.snapshotValues.mockResolvedValue(undefined);
        mocks.copyEventValues.mockResolvedValue(undefined);
        mocks.likeValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.saveValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.followValues.mockReturnValue({
            onConflictDoNothing: mocks.onConflictDoNothing,
        });
        mocks.onConflictDoNothing.mockResolvedValue(undefined);
        mocks.commentValues.mockResolvedValue(undefined);
        mocks.reportValues.mockResolvedValue(undefined);
        mocks.deleteFn.mockReturnValue({
            where: mocks.deleteWhere,
        });
        mocks.deleteWhere.mockResolvedValue(undefined);
        mocks.createCommunityPostAnalysisSnapshot.mockReturnValue(createStoredSnapshot());
        mocks.checkCommunityActionRateLimit.mockResolvedValue(createRateLimitAllowedResult());
    });

    describe('publishAnalysisSessionToCommunity', () => {
        it('keeps the publish happy path intact when the post limiter allows the mutation', async () => {
            mocks.limit
                .mockResolvedValueOnce([createStoredAnalysisSessionRow()])
                .mockResolvedValueOnce([
                    {
                        id: 'profile-1',
                        slug: 'player-one',
                    },
                ]);

            const result = await publishAnalysisSessionToCommunity({
                analysisSessionId: 'session-1',
                title: 'Draft spray analysis',
                excerpt: 'Draft excerpt',
                bodyMarkdown: 'Draft body',
                status: 'draft',
            });

            expect(result).toEqual({
                success: true,
                postId: 'post-1',
                slug: 'player-one-session-1',
                status: 'draft',
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.post.publish',
                userId: 'user-1',
            });
        });

        it('blocks publish attempts predictably when the post limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await publishAnalysisSessionToCommunity({
                analysisSessionId: 'session-1',
                title: 'Draft spray analysis',
                excerpt: 'Draft excerpt',
                bodyMarkdown: 'Draft body',
                status: 'draft',
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitos posts em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
        });
    });

    describe('copyCommunityPostSens', () => {
        it('keeps the copy happy path intact when the copy limiter allows the mutation', async () => {
            const copySensPreset = createStoredCopySensPreset();
            mocks.limit.mockResolvedValueOnce([
                {
                    id: 'post-1',
                    copySensPreset,
                },
            ]);

            const result = await copyCommunityPostSens({
                slug: 'player-one-session-1',
                target: 'clipboard',
            });

            expect(result).toEqual({
                success: true,
                postId: 'post-1',
                copyTarget: 'clipboard',
                copySensPreset,
                clipboardText: expect.stringContaining('Balanced'),
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.post.copy',
                userId: 'user-1',
            });
        });

        it('blocks copy attempts predictably when the copy limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await copyCommunityPostSens({
                slug: 'player-one-session-1',
                target: 'clipboard',
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitas copias em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
        });
    });

    describe('setCommunityPostLike', () => {
        it('keeps the like happy path intact when the like limiter allows the mutation', async () => {
            mocks.limit
                .mockResolvedValueOnce([{ id: 'post-1' }])
                .mockResolvedValueOnce([{ count: 1 }]);

            const result = await setCommunityPostLike({
                slug: 'beryl-control-lab',
                liked: true,
            });

            expect(result).toEqual({
                success: true,
                postId: 'post-1',
                liked: true,
                likeCount: 1,
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.post.like',
                userId: 'user-1',
            });
        });

        it('blocks like toggles predictably when the like limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await setCommunityPostLike({
                slug: 'beryl-control-lab',
                liked: true,
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitas curtidas em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
            expect(mocks.deleteFn).not.toHaveBeenCalled();
        });
    });

    describe('setCommunityPostSave', () => {
        it('keeps the save happy path intact when the save limiter allows the mutation', async () => {
            mocks.limit.mockResolvedValueOnce([{ id: 'post-1' }]);

            const result = await setCommunityPostSave({
                slug: 'beryl-control-lab',
                saved: true,
            });

            expect(result).toEqual({
                success: true,
                postId: 'post-1',
                saved: true,
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.post.save',
                userId: 'user-1',
            });
        });

        it('blocks save toggles predictably when the save limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await setCommunityPostSave({
                slug: 'beryl-control-lab',
                saved: true,
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitos salvamentos em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
            expect(mocks.deleteFn).not.toHaveBeenCalled();
        });
    });

    describe('createCommunityPostComment', () => {
        it('keeps the comment happy path intact when the comment limiter allows the mutation', async () => {
            mocks.limit.mockResolvedValueOnce([
                {
                    id: 'post-1',
                    status: 'published',
                    visibility: 'public',
                },
            ]);

            const result = await createCommunityPostComment({
                slug: 'beryl-control-lab',
                bodyMarkdown: 'Fechei melhor o tracking no bloco final.',
                diagnosisContextKey: 'horizontal_drift',
            });

            expect(result).toEqual({
                success: true,
                postId: 'post-1',
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.comment.create',
                userId: 'user-1',
            });
        });

        it('blocks comment creation predictably when the comment limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await createCommunityPostComment({
                slug: 'beryl-control-lab',
                bodyMarkdown: 'Comentario de spam.',
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitos comentarios em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
        });
    });

    describe('setCommunityProfileFollow', () => {
        it('keeps the follow happy path intact when the follow limiter allows the mutation', async () => {
            mocks.limit
                .mockResolvedValueOnce([
                    {
                        userId: 'user-2',
                    },
                ])
                .mockResolvedValueOnce([{ count: 5 }]);

            const result = await setCommunityProfileFollow({
                slug: 'spray-doctor',
                following: true,
            });

            expect(result).toEqual({
                success: true,
                followedUserId: 'user-2',
                following: true,
                followerCount: 5,
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.profile.follow',
                userId: 'user-1',
            });
        });

        it('blocks follow toggles predictably when the follow limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await setCommunityProfileFollow({
                slug: 'spray-doctor',
                following: true,
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitas acoes de seguir em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
            expect(mocks.deleteFn).not.toHaveBeenCalled();
        });
    });

    describe('createCommunityReport', () => {
        it('keeps the report happy path intact when the report limiter allows the mutation', async () => {
            mocks.limit.mockResolvedValueOnce([{ id: 'post-1' }]);

            const result = await createCommunityReport({
                entityType: 'post',
                entityId: 'post-1',
                reasonKey: 'spam',
                details: 'Conteudo duplicado.',
            });

            expect(result).toEqual({
                success: true,
                status: 'open',
            });
            expect(mocks.checkCommunityActionRateLimit).toHaveBeenCalledWith({
                action: 'community.report.create',
                userId: 'user-1',
            });
        });

        it('blocks reports predictably when the report limiter is exhausted', async () => {
            mocks.checkCommunityActionRateLimit.mockResolvedValueOnce(createRateLimitBlockedResult());

            const result = await createCommunityReport({
                entityType: 'post',
                entityId: 'post-1',
                reasonKey: 'spam',
                details: 'Conteudo duplicado.',
            });

            expect(result).toEqual({
                success: false,
                error: 'Muitos reports em pouco tempo. Tente novamente.',
            });
            expect(mocks.select).not.toHaveBeenCalled();
            expect(mocks.insert).not.toHaveBeenCalled();
        });
    });
});
