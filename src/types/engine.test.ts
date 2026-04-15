import { describe, expect, it } from 'vitest';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type { AnalysisResult, AnalysisSession } from './engine';

function createAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    const base: AnalysisResult = {
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

    return {
        ...base,
        ...overrides,
    };
}

describe('analysis contracts', () => {
    it('requires patchVersion in analysis results and nested sessions', () => {
        const subSession = createAnalysisResult({
            id: 'analysis-2',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
        });

        const result = createAnalysisResult({
            subSessions: [subSession],
        });

        expect(result.patchVersion).toBe(CURRENT_PUBG_PATCH_VERSION);
        expect(result.subSessions?.[0]?.patchVersion).toBe(CURRENT_PUBG_PATCH_VERSION);
    });

    it('requires patchVersion in stored analysis session contracts', () => {
        const session: AnalysisSession = {
            id: 'session-1',
            userId: 'user-1',
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
            },
            distance: 30,
            metrics: createAnalysisResult().metrics,
            diagnoses: [],
            sensitivityApplied: 'balanced',
            createdAt: new Date('2026-04-13T12:00:00.000Z'),
        };

        expect(session.patchVersion).toBe(CURRENT_PUBG_PATCH_VERSION);
    });
});
