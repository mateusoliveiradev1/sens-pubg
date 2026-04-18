import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analysisSessions, sensitivityHistory } from '@/db/schema';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type { AnalysisResult } from '@/types/engine';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const leftJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const sessionValues = vi.fn();
    const returning = vi.fn();
    const historyValues = vi.fn();
    const update = vi.fn();
    const updateSet = vi.fn();
    const updateWhere = vi.fn();
    const revalidatePath = vi.fn();
    const enrichAnalysisResultCoaching = vi.fn();
    const createGroqCoachClient = vi.fn();

    return {
        auth,
        select,
        from,
        leftJoin,
        where,
        limit,
        orderBy,
        insert,
        sessionValues,
        returning,
        historyValues,
        update,
        updateSet,
        updateWhere,
        revalidatePath,
        enrichAnalysisResultCoaching,
        createGroqCoachClient,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
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

vi.mock('@/core/analysis-result-coach-enrichment', () => ({
    enrichAnalysisResultCoaching: mocks.enrichAnalysisResultCoaching,
}));

vi.mock('@/server/coach/groq-coach-client', () => ({
    createGroqCoachClient: mocks.createGroqCoachClient,
}));

import { getHistorySessions, recordSensitivityAcceptance, saveAnalysisResult } from './history';

function createAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-13T12:00:00.000Z'),
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.92,
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
            stock: 'none',
        },
        metrics: {
            stabilityScore: 78 as never,
            verticalControlIndex: 1.02,
            horizontalNoiseIndex: 2.1,
            angularErrorDegrees: 0.4,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 30,
            initialRecoilResponseMs: 145 as never,
            driftDirectionBias: { direction: 'neutral', magnitude: 0 },
            consistencyScore: 82 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.03,
            fatigueVCI: 1.04,
            burstHNI: 1.9,
            sustainedHNI: 2.1,
            fatigueHNI: 2.3,
            sprayScore: 81,
        },
        diagnoses: [],
        sensitivity: {
            profiles: [
                {
                    type: 'low',
                    label: 'Low',
                    description: 'Low sens',
                    general: 45 as never,
                    ads: 43 as never,
                    scopes: [],
                    cmPer360: 48 as never,
                },
                {
                    type: 'balanced',
                    label: 'Balanced',
                    description: 'Balanced sens',
                    general: 50 as never,
                    ads: 48 as never,
                    scopes: [],
                    cmPer360: 41 as never,
                },
                {
                    type: 'high',
                    label: 'High',
                    description: 'High sens',
                    general: 55 as never,
                    ads: 53 as never,
                    scopes: [],
                    cmPer360: 35 as never,
                },
            ],
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'moderate',
            confidenceScore: 0.72,
            reasoning: 'Patch-aware recommendation',
            suggestedVSM: 1.05,
        },
        coaching: [],
    };
}

describe('saveAnalysisResult', () => {
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
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
        mocks.limit.mockResolvedValue([{ id: 'profile-1' }]);
        mocks.orderBy.mockResolvedValue([]);

        mocks.insert.mockImplementation((table) => {
            if (table === analysisSessions) {
                return {
                    values: mocks.sessionValues,
                };
            }

            if (table === sensitivityHistory) {
                return {
                    values: mocks.historyValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.sessionValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([{ id: 'session-1' }]);
        mocks.limit.mockResolvedValueOnce([{ id: 'profile-1' }]).mockResolvedValue([]);
        mocks.historyValues.mockResolvedValue(undefined);
        mocks.update.mockReturnValue({
            set: mocks.updateSet,
        });
        mocks.updateSet.mockReturnValue({
            where: mocks.updateWhere,
        });
        mocks.updateWhere.mockResolvedValue(undefined);
        mocks.createGroqCoachClient.mockReturnValue(undefined);
        mocks.enrichAnalysisResultCoaching.mockImplementation(async (result) => result);
    });

    it('persists patchVersion with the saved session and full result payload', async () => {
        const result = createAnalysisResult();

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            fullResult: expect.objectContaining({
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
            }),
        }));
    });

    it('enriches coaching through the server helper and returns the enriched payload', async () => {
        const result = createAnalysisResult();
        const enrichedResult = {
            ...result,
            coaching: [{ problem: 'Coach IA' }] as unknown as AnalysisResult['coaching'],
        };

        mocks.enrichAnalysisResultCoaching.mockResolvedValue(enrichedResult);

        const saved = await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.createGroqCoachClient).toHaveBeenCalledTimes(1);
        expect(mocks.enrichAnalysisResultCoaching).toHaveBeenCalledWith(result, undefined);
        expect(saved).toMatchObject({
            success: true,
            result: enrichedResult,
        });
        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            coachingData: enrichedResult.coaching,
            fullResult: expect.objectContaining({
                coaching: enrichedResult.coaching,
            }),
        }));
    });

    it('strengthens sensitivity confidence when compatible history converges on the same recommendation', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'history-1',
                    createdAt: new Date('2026-04-16T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'apply_ready',
                            evidenceTier: 'strong',
                            confidenceScore: 0.9,
                        },
                    },
                },
                {
                    id: 'history-2',
                    createdAt: new Date('2026-04-15T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 35,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'strong',
                            confidenceScore: 0.84,
                        },
                    },
                },
                {
                    id: 'history-3',
                    createdAt: new Date('2026-04-14T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 28,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'moderate',
                            confidenceScore: 0.78,
                        },
                    },
                },
            ]);

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    tier: 'apply_ready',
                    evidenceTier: 'strong',
                    historyConvergence: expect.objectContaining({
                        matchingSessions: 3,
                        consideredSessions: 3,
                        consensusProfile: 'balanced',
                        agreement: 'aligned',
                    }),
                }),
            }),
        }));
    });

    it('records real-world acceptance feedback for the recommended profile and syncs applied history', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'session-1',
                fullResult: result as unknown as Record<string, unknown>,
            },
        ]);

        const saved = await recordSensitivityAcceptance('session-1', 'improved');

        expect(saved).toMatchObject({
            success: true,
            acceptanceFeedback: {
                outcome: 'improved',
                testedProfile: 'balanced',
            },
        });
        expect(mocks.update).toHaveBeenNthCalledWith(1, analysisSessions);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(1, expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    acceptanceFeedback: expect.objectContaining({
                        outcome: 'improved',
                        testedProfile: 'balanced',
                    }),
                }),
            }),
        }));
        expect(mocks.update).toHaveBeenNthCalledWith(2, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(2, { applied: false });
        expect(mocks.update).toHaveBeenNthCalledWith(3, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(3, { applied: true });
    });
});

describe('getHistorySessions', () => {
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
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
    });

    it('returns normalized recommended profile and acceptance feedback for history cards', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-1',
                weaponId: 'beryl-m762',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 78,
                verticalControl: 1.02,
                horizontalNoise: 0.18,
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                weaponName: 'Beryl M762',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'same',
                            testedProfile: 'balanced',
                            recordedAt: '2026-04-17T12:30:00.000Z',
                        },
                    },
                },
            },
        ]);

        const sessions = await getHistorySessions();

        expect(sessions).toEqual([
            expect.objectContaining({
                id: 'session-1',
                recommendedProfile: 'balanced',
                acceptanceFeedback: expect.objectContaining({
                    outcome: 'same',
                    testedProfile: 'balanced',
                    recordedAt: '2026-04-17T12:30:00.000Z',
                }),
            }),
        ]);
    });

    it('drops malformed acceptance feedback instead of leaking invalid payloads to the page', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-2',
                weaponId: 'm416',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 84,
                verticalControl: 0.98,
                horizontalNoise: 0.14,
                createdAt: new Date('2026-04-17T13:00:00.000Z'),
                weaponName: 'M416',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'broken',
                            testedProfile: 'balanced',
                            recordedAt: 123,
                        },
                    },
                },
            },
        ]);

        const [session] = await getHistorySessions();

        expect(session).toMatchObject({
            id: 'session-2',
            recommendedProfile: 'balanced',
        });
        expect(session).not.toHaveProperty('acceptanceFeedback');
    });
});
