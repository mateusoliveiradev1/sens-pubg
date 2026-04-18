import { describe, expect, it } from 'vitest';

import { buildCoachMemorySnapshot } from './coach-memory';
import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { asScore } from '../types/branded';

describe('buildCoachPlan', () => {
    it('returns the base CoachPlan fields needed by the coaching session summary', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.objectContaining({
                id: expect.any(String),
                area: expect.any(String),
                title: expect.any(String),
                whyNow: expect.any(String),
                priorityScore: expect.any(Number),
                severity: expect.any(Number),
                confidence: expect.any(Number),
                coverage: expect.any(Number),
                dependencies: expect.any(Array),
                blockedBy: expect.any(Array),
                signals: expect.any(Array),
            }),
            nextBlock: expect.objectContaining({
                title: expect.any(String),
                durationMinutes: expect.any(Number),
                steps: expect.any(Array),
                checks: expect.any(Array),
            }),
        }));
    });

    it('uses the highest ranked raw priority as the primary focus', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.primaryFocus).toEqual(expect.objectContaining({
            area: 'vertical_control',
            priorityScore: expect.any(Number),
        }));
    });

    it('exposes blocked sensitivity as a secondary focus when capture quality wins', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });

        expect(plan.primaryFocus.area).toBe('capture_quality');
        expect(plan.secondaryFocuses).toEqual(expect.arrayContaining([
            expect.objectContaining({
                area: 'sensitivity',
                blockedBy: ['capture_quality'],
                dependencies: ['capture_quality'],
            }),
        ]));
    });

    it('uses capture_again when capture quality does not sustain analysis', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });

        expect(plan.tier).toBe('capture_again');
        expect(plan.tier).not.toBe('apply_protocol');
    });

    it('uses test_protocol when evidence is partial and still experimental', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.tier).toBe('test_protocol');
    });

    it('uses stabilize_block when consistency is the dominant focus', () => {
        const inconsistentAnalysis = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            diagnoses: [{
                type: 'inconsistency',
                severity: 4,
                consistencyScore: asScore(34),
                confidence: 0.86,
                evidence: {
                    confidence: 0.86,
                    coverage: 0.82,
                    angularErrorDegrees: 1.5,
                    linearErrorCm: 58,
                    linearErrorSeverity: 4,
                },
                description: 'Spray muito variavel entre tentativas compativeis',
                cause: 'A variabilidade ainda domina antes de mexer em sensibilidade',
                remediation: 'Estabilize o mesmo bloco antes de aplicar nova sensibilidade',
            }],
        });

        const plan = buildCoachPlan({ analysisResult: inconsistentAnalysis });

        expect(plan.primaryFocus.area).toBe('consistency');
        expect(plan.tier).toBe('stabilize_block');
    });

    it('uses apply_protocol only when evidence is strong and unblocked', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultWithStrongSensitivity });

        expect(plan.primaryFocus.area).toBe('sensitivity');
        expect(plan.tier).toBe('apply_protocol');
    });

    it('downgrades strong evidence to test_protocol when sensitivity history is conflicting', () => {
        const conflictingStrongEvidence = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            sensitivity: {
                historyConvergence: {
                    matchingSessions: 1,
                    consideredSessions: 3,
                    consensusProfile: 'low',
                    supportRatio: 0.34,
                    agreement: 'conflicting',
                    summary: 'Historico recente conflita com a sessao atual.',
                },
            },
        });

        const plan = buildCoachPlan({ analysisResult: conflictingStrongEvidence });

        expect(plan.tier).toBe('test_protocol');
    });

    it('downgrades apply_protocol when coach memory conflicts with the current sensitivity profile', () => {
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultWithStrongSensitivity,
            historySessions: [{
                id: 'history-sensitivity-worse',
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                patchVersion: analysisResultWithStrongSensitivity.patchVersion,
                distance: analysisResultWithStrongSensitivity.analysisContext?.targetDistanceMeters,
                loadout: analysisResultWithStrongSensitivity.loadout,
                fullResult: {
                    coachPlan: {
                        primaryFocus: { area: 'sensitivity' },
                    },
                    sensitivity: {
                        recommended: 'high',
                        acceptanceFeedback: {
                            testedProfile: 'high',
                            outcome: 'worse',
                            recordedAt: '2026-04-17T13:00:00.000Z',
                        },
                    },
                },
            }],
        });

        const plan = buildCoachPlan({
            analysisResult: analysisResultWithStrongSensitivity,
            memorySnapshot,
        });

        const sensitivityPriority = [plan.primaryFocus, ...plan.secondaryFocuses]
            .find((priority) => priority.area === 'sensitivity');

        expect(sensitivityPriority?.blockedBy).toContain('history_conflict');
        expect(plan.tier).toBe('test_protocol');
    });

    it('raises primary focus confidence when coach memory strongly aligns', () => {
        const planWithoutMemory = buildCoachPlan({ analysisResult: analysisResultBase });
        const memorySnapshot = buildCoachMemorySnapshot({
            currentResult: analysisResultBase,
            historySessions: [
                {
                    id: 'history-vertical-1',
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                    patchVersion: analysisResultBase.patchVersion,
                    distance: analysisResultBase.analysisContext?.targetDistanceMeters,
                    loadout: analysisResultBase.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
                {
                    id: 'history-vertical-2',
                    createdAt: new Date('2026-04-17T13:00:00.000Z'),
                    patchVersion: analysisResultBase.patchVersion,
                    distance: analysisResultBase.analysisContext?.targetDistanceMeters,
                    loadout: analysisResultBase.loadout,
                    fullResult: {
                        coachPlan: {
                            primaryFocus: { area: 'vertical_control' },
                        },
                    },
                },
            ],
        });

        const planWithMemory = buildCoachPlan({
            analysisResult: analysisResultBase,
            memorySnapshot,
        });

        expect(planWithMemory.primaryFocus.area).toBe('vertical_control');
        expect(planWithMemory.primaryFocus.confidence).toBeGreaterThan(planWithoutMemory.primaryFocus.confidence);
        expect(planWithMemory.primaryFocus.signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'history',
                key: 'history.aligned.vertical_control',
            }),
        ]));
    });

    it('builds action protocols that match conservative and apply-ready tiers', () => {
        const weakCapturePlan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });
        const applyReadyPlan = buildCoachPlan({ analysisResult: analysisResultWithStrongSensitivity });

        expect(weakCapturePlan.actionProtocols).toEqual([
            expect.objectContaining({
                kind: 'capture',
                risk: 'low',
                instruction: expect.any(String),
                expectedEffect: expect.any(String),
                applyWhen: expect.any(String),
            }),
        ]);
        expect(weakCapturePlan.actionProtocols).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'sens' }),
        ]));

        expect(applyReadyPlan.actionProtocols).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'sens',
                risk: expect.stringMatching(/^(low|medium)$/),
                instruction: expect.any(String),
                expectedEffect: expect.any(String),
                applyWhen: expect.any(String),
                avoidWhen: expect.any(String),
            }),
        ]));
    });

    it('builds the next block with objective steps and validation checks', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });

        expect(plan.nextBlock.durationMinutes).toBeGreaterThan(0);
        expect(plan.nextBlock.steps.length).toBeGreaterThan(0);
        expect(plan.nextBlock.checks.length).toBeGreaterThan(0);
        expect(plan.nextBlock.steps.every((step) => step.length > 0)).toBe(true);
        expect(plan.nextBlock.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({
                label: expect.any(String),
                target: expect.any(String),
                minimumCoverage: expect.any(Number),
                minimumConfidence: expect.any(Number),
                successCondition: expect.any(String),
                failCondition: expect.any(String),
            }),
        ]));
        expect(plan.nextBlock.checks.every((check) => (
            check.minimumCoverage > 0
            && check.minimumCoverage <= 1
            && check.minimumConfidence > 0
            && check.minimumConfidence <= 1
        ))).toBe(true);
    });

    it('adds stop conditions and an adaptation window for the current tier', () => {
        const testPlan = buildCoachPlan({ analysisResult: analysisResultBase });
        const weakCapturePlan = buildCoachPlan({ analysisResult: analysisResultWithWeakCapture });
        const applyReadyPlan = buildCoachPlan({ analysisResult: analysisResultWithStrongSensitivity });

        expect(testPlan.stopConditions.length).toBeGreaterThan(0);
        expect(testPlan.adaptationWindowDays).toBeGreaterThan(0);

        expect(weakCapturePlan.stopConditions).toEqual(expect.arrayContaining([
            expect.stringContaining('capture'),
        ]));
        expect(weakCapturePlan.adaptationWindowDays).toBe(1);

        expect(applyReadyPlan.adaptationWindowDays).toBeGreaterThanOrEqual(3);
    });
});
