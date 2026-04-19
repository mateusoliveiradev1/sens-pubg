import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityPostAnalysisSnapshots, communityPosts } from '@/db/schema';
import type { AnalysisResult } from '@/types/engine';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const postValues = vi.fn();
    const returning = vi.fn();
    const snapshotValues = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        postValues,
        returning,
        snapshotValues,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
    },
}));

import { publishAnalysisSessionToCommunity } from './community-posts';

function createStoredAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-18T18:45:00.000Z'),
        patchVersion: '35.1',
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.93,
            framesTracked: 28,
            framesLost: 2,
            visibleFrames: 28,
            framesProcessed: 30,
            statusCounts: {
                tracked: 28,
                occluded: 0,
                lost: 2,
                uncertain: 0,
            },
        },
        loadout: {
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        },
        metrics: {
            stabilityScore: 84 as never,
            verticalControlIndex: 1.04,
            horizontalNoiseIndex: 1.92,
            angularErrorDegrees: 0.5,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 35,
            initialRecoilResponseMs: 148 as never,
            driftDirectionBias: { direction: 'left', magnitude: 0.12 },
            consistencyScore: 81 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.07,
            fatigueVCI: 1.11,
            burstHNI: 1.8,
            sustainedHNI: 1.95,
            fatigueHNI: 2.05,
            sprayScore: 86,
        },
        diagnoses: [
            {
                type: 'horizontal_instability',
                severity: 'medium',
                title: 'Horizontal instability',
                summary: 'Need to stabilize lateral drift.',
                whyItMatters: 'Hurts medium-range tracking.',
                correctionPrinciple: 'Relax lateral input.',
            },
        ],
        sensitivity: {
            profiles: [
                {
                    type: 'balanced',
                    label: 'Balanced',
                    description: 'Balanced recommendation',
                    general: 50 as never,
                    ads: 47 as never,
                    scopes: [],
                    cmPer360: 41 as never,
                },
            ],
            recommended: 'balanced',
            tier: 'apply_ready',
            evidenceTier: 'strong',
            confidenceScore: 0.84,
            reasoning: 'Stable sample',
            suggestedVSM: 1.02,
        },
        coaching: [
            {
                problem: 'Horizontal drag',
                cue: 'Reset hand tension',
                drill: 'Track wider sweeps',
            } as never,
        ],
        coachPlan: {
            warmup: [],
            drills: [],
            focusPoints: [],
        } as never,
    };
}

function createOwnedAnalysisSessionRow() {
    return {
        id: 'session-1',
        userId: 'user-1',
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
        fullResult: createStoredAnalysisResult() as unknown as Record<string, unknown>,
    };
}

describe('publishAnalysisSessionToCommunity', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
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

            throw new Error('Unexpected table');
        });

        mocks.postValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([
            {
                id: 'post-1',
                slug: 'player-one-session-1',
                status: 'published',
            },
        ]);
        mocks.snapshotValues.mockResolvedValue(undefined);
    });

    it('requires auth before attempting to publish an analysis session', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await publishAnalysisSessionToCommunity({
            analysisSessionId: 'session-1',
            title: 'Published spray analysis',
            excerpt: 'Snapshot excerpt',
            bodyMarkdown: 'Snapshot body',
            status: 'draft',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects publishing when the analysis session is not owned by the authenticated user', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await publishAnalysisSessionToCommunity({
            analysisSessionId: 'session-foreign',
            title: 'Published spray analysis',
            excerpt: 'Snapshot excerpt',
            bodyMarkdown: 'Snapshot body',
            status: 'draft',
        });

        expect(result).toEqual({
            success: false,
            error: 'Sessao nao encontrada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('persists a draft post and its immutable analysis snapshot for an owned session', async () => {
        mocks.limit
            .mockResolvedValueOnce([createOwnedAnalysisSessionRow()])
            .mockResolvedValueOnce([
                {
                    id: 'profile-1',
                    userId: 'user-1',
                    slug: 'player-one',
                },
            ]);
        mocks.returning.mockResolvedValueOnce([
            {
                id: 'post-1',
                slug: 'player-one-session-1',
                status: 'draft',
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
        expect(mocks.postValues).toHaveBeenCalledWith(expect.objectContaining({
            authorId: 'user-1',
            communityProfileId: 'profile-1',
            slug: 'player-one-session-1',
            type: 'analysis_snapshot',
            status: 'draft',
            visibility: 'public',
            title: 'Draft spray analysis',
            excerpt: 'Draft excerpt',
            bodyMarkdown: 'Draft body',
            sourceAnalysisSessionId: 'session-1',
            primaryWeaponId: 'beryl-m762',
            primaryPatchVersion: '35.1',
            primaryDiagnosisKey: 'horizontal_instability',
            copySensPreset: expect.objectContaining({
                recommended: 'balanced',
            }),
            publishedAt: null,
        }));
        expect(mocks.snapshotValues).toHaveBeenCalledWith(expect.objectContaining({
            postId: 'post-1',
            analysisSessionId: 'session-1',
            analysisResultId: 'analysis-1',
            patchVersion: '35.1',
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            distance: 35,
            sensSnapshot: expect.objectContaining({
                recommended: 'balanced',
            }),
        }));
    });

    it('persists a published post with publishedAt populated when requested', async () => {
        mocks.limit
            .mockResolvedValueOnce([createOwnedAnalysisSessionRow()])
            .mockResolvedValueOnce([
                {
                    id: 'profile-1',
                    userId: 'user-1',
                    slug: 'player-one',
                },
            ]);

        const result = await publishAnalysisSessionToCommunity({
            analysisSessionId: 'session-1',
            title: 'Published spray analysis',
            excerpt: 'Published excerpt',
            bodyMarkdown: 'Published body',
            status: 'published',
        });

        expect(result).toEqual({
            success: true,
            postId: 'post-1',
            slug: 'player-one-session-1',
            status: 'published',
        });
        expect(mocks.postValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'published',
            publishedAt: expect.any(Date),
        }));
        expect(mocks.snapshotValues).toHaveBeenCalledTimes(1);
    });
});
