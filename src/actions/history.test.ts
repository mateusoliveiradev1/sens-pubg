import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisSessions, sensitivityHistory } from '@/db/schema';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type { AnalysisResult } from '@/types/engine';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const sessionValues = vi.fn();
    const returning = vi.fn();
    const historyValues = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        sessionValues,
        returning,
        historyValues,
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

import { saveAnalysisResult } from './history';

function createAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-13T12:00:00.000Z'),
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
        trajectory: {
            points: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
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
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });
        mocks.limit.mockResolvedValue([{ id: 'profile-1' }]);

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
        mocks.historyValues.mockResolvedValue(undefined);
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
});
