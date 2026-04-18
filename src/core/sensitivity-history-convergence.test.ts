import { describe, expect, it } from 'vitest';

import type { SensitivityRecommendation } from '@/types/engine';

import {
    applySensitivityHistoryConvergence,
    type HistoricalSensitivitySignal,
} from './sensitivity-history-convergence';

function createRecommendation(
    overrides: Partial<SensitivityRecommendation> = {},
): SensitivityRecommendation {
    return {
        profiles: [
            {
                type: 'low',
                label: 'Controle',
                description: 'Mais controle',
                general: 45 as never,
                ads: 43 as never,
                scopes: [],
                cmPer360: 48 as never,
            },
            {
                type: 'balanced',
                label: 'Balanceada',
                description: 'Equilibrio',
                general: 50 as never,
                ads: 48 as never,
                scopes: [],
                cmPer360: 41 as never,
            },
            {
                type: 'high',
                label: 'Velocidade',
                description: 'Mais velocidade',
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
        reasoning: 'current recommendation',
        ...overrides,
    };
}

function createSignal(
    overrides: Partial<HistoricalSensitivitySignal> = {},
): HistoricalSensitivitySignal {
    return {
        sessionId: 'history-1',
        createdAt: new Date('2026-04-16T12:00:00.000Z'),
        recommendedProfile: 'balanced',
        tier: 'test_profiles',
        evidenceTier: 'moderate',
        confidenceScore: 0.74,
        ...overrides,
    };
}

describe('applySensitivityHistoryConvergence', () => {
    it('boosts confidence and reaches apply_ready when recent history converges on the same profile', () => {
        const recommendation = createRecommendation({
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'moderate',
            confidenceScore: 0.73,
        });

        const converged = applySensitivityHistoryConvergence(recommendation, [
            createSignal({
                sessionId: 'history-1',
                createdAt: new Date('2026-04-16T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.88,
            }),
            createSignal({
                sessionId: 'history-2',
                createdAt: new Date('2026-04-15T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'test_profiles',
                evidenceTier: 'strong',
                confidenceScore: 0.84,
            }),
            createSignal({
                sessionId: 'history-3',
                createdAt: new Date('2026-04-14T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'test_profiles',
                evidenceTier: 'moderate',
                confidenceScore: 0.79,
            }),
        ]);

        expect(converged.confidenceScore).toBeGreaterThan(recommendation.confidenceScore);
        expect(converged.evidenceTier).toBe('strong');
        expect(converged.tier).toBe('apply_ready');
        expect(converged.historyConvergence).toMatchObject({
            matchingSessions: 3,
            consideredSessions: 3,
            consensusProfile: 'balanced',
            agreement: 'aligned',
        });
        expect(converged.reasoning).toContain('historyAgreement=aligned');
    });

    it('downgrades overconfident recommendations when strong history conflicts with the current direction', () => {
        const recommendation = createRecommendation({
            recommended: 'high',
            tier: 'apply_ready',
            evidenceTier: 'strong',
            confidenceScore: 0.87,
        });

        const converged = applySensitivityHistoryConvergence(recommendation, [
            createSignal({
                sessionId: 'history-1',
                createdAt: new Date('2026-04-16T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.91,
            }),
            createSignal({
                sessionId: 'history-2',
                createdAt: new Date('2026-04-15T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'test_profiles',
                evidenceTier: 'strong',
                confidenceScore: 0.85,
            }),
            createSignal({
                sessionId: 'history-3',
                createdAt: new Date('2026-04-14T12:00:00.000Z'),
                recommendedProfile: 'low',
                tier: 'test_profiles',
                evidenceTier: 'moderate',
                confidenceScore: 0.71,
            }),
        ]);

        expect(converged.recommended).toBe('high');
        expect(converged.confidenceScore).toBeLessThan(recommendation.confidenceScore);
        expect(converged.tier).toBe('test_profiles');
        expect(converged.historyConvergence).toMatchObject({
            consensusProfile: 'balanced',
            agreement: 'conflicting',
        });
        expect(converged.reasoning).toContain('historyAgreement=conflicting');
    });

    it('never upgrades a weak current clip only because older sessions agree', () => {
        const recommendation = createRecommendation({
            recommended: 'balanced',
            tier: 'capture_again',
            evidenceTier: 'weak',
            confidenceScore: 0.44,
        });

        const converged = applySensitivityHistoryConvergence(recommendation, [
            createSignal({
                sessionId: 'history-1',
                createdAt: new Date('2026-04-16T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.9,
            }),
            createSignal({
                sessionId: 'history-2',
                createdAt: new Date('2026-04-15T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.86,
            }),
            createSignal({
                sessionId: 'history-3',
                createdAt: new Date('2026-04-14T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'test_profiles',
                evidenceTier: 'moderate',
                confidenceScore: 0.75,
            }),
        ]);

        expect(converged.tier).toBe('capture_again');
        expect(converged.evidenceTier).toBe('weak');
        expect(converged.confidenceScore).toBe(recommendation.confidenceScore);
        expect(converged.historyConvergence).toMatchObject({
            agreement: 'aligned',
            consensusProfile: 'balanced',
        });
    });

    it('stops counting history marked as worse when reinforcing future recommendations', () => {
        const recommendation = createRecommendation({
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'moderate',
            confidenceScore: 0.71,
        });

        const converged = applySensitivityHistoryConvergence(recommendation, [
            createSignal({
                sessionId: 'history-1',
                createdAt: new Date('2026-04-16T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.89,
                acceptanceOutcome: 'improved',
            }),
            createSignal({
                sessionId: 'history-2',
                createdAt: new Date('2026-04-15T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.9,
                acceptanceOutcome: 'worse',
            }),
            createSignal({
                sessionId: 'history-3',
                createdAt: new Date('2026-04-14T12:00:00.000Z'),
                recommendedProfile: 'balanced',
                tier: 'test_profiles',
                evidenceTier: 'moderate',
                confidenceScore: 0.78,
            }),
        ]);

        expect(converged.historyConvergence).toMatchObject({
            matchingSessions: 3,
            consideredSessions: 2,
            consensusProfile: 'balanced',
            agreement: 'aligned',
        });
        expect(converged.reasoning).toContain('historySessions=2');
    });
});
