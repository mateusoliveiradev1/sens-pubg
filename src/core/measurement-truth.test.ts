import { describe, expect, it } from 'vitest';

import { formatDiagnosisTruthLabel, resolveMeasurementTruth } from './measurement-truth';
import { resolveAnalysisDecision } from './analysis-decision';
import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { asScore } from '../types/branded';
import type { DiagnosisType, MetricEvidenceQuality } from '../types/engine';

const strongEvidence: MetricEvidenceQuality = {
    coverage: 0.91,
    confidence: 0.9,
    sampleSize: 28,
    framesTracked: 28,
    framesLost: 1,
    framesProcessed: 29,
    cameraMotionPenalty: 0,
    hardCutPenalty: 0,
    flickPenalty: 0,
    targetSwapPenalty: 0,
    identityPenalty: 0,
    contaminatedFrameCount: 0,
};

const weakEvidence: MetricEvidenceQuality = {
    coverage: 0.42,
    confidence: 0.41,
    sampleSize: 10,
    framesTracked: 10,
    framesLost: 14,
    framesProcessed: 24,
    cameraMotionPenalty: 0,
    hardCutPenalty: 0,
    flickPenalty: 0,
    targetSwapPenalty: 0,
    identityPenalty: 0,
    contaminatedFrameCount: 0,
};

describe('resolveMeasurementTruth', () => {
    it('maps a clean usable clip with moderate evidence to Testavel', () => {
        const mastery = resolveMeasurementTruth(analysisResultBase);

        expect(mastery.actionState).toBe('testable');
        expect(mastery.actionLabel).toBe('Testavel');
        expect(mastery.pillars).toEqual(expect.objectContaining({
            control: expect.any(Number),
            consistency: expect.any(Number),
            confidence: expect.any(Number),
            clipQuality: expect.any(Number),
        }));
        expect(mastery.blockedRecommendations).toEqual([]);
        expect(mastery.reasons.join(' ')).not.toMatch(/formula|peso|0\.15|0\.2|0\.5/i);
    });

    it('caps weak coverage and confidence below the testable range', () => {
        const weak = createAnalysisResultFixture({
            metrics: {
                metricQuality: {
                    sprayScore: weakEvidence,
                    verticalControlIndex: weakEvidence,
                    shotResiduals: weakEvidence,
                } as never,
                sprayScore: 88,
            },
            trajectory: {
                trackingQuality: 0.41,
                framesTracked: 10,
                visibleFrames: 10,
                framesLost: 14,
                framesProcessed: 24,
                totalFrames: 24,
            },
            sensitivity: {
                tier: 'test_profiles',
                evidenceTier: 'weak',
                confidenceScore: 0.41,
            },
        });

        const mastery = resolveMeasurementTruth(weak);

        expect(['capture_again', 'inconclusive']).toContain(mastery.actionState);
        expect(mastery.actionableScore).toBeLessThan(50);
        expect(mastery.blockedRecommendations.length).toBeGreaterThan(0);
        expect(mastery.blockedRecommendations.join(' ')).toContain('60%');
    });

    it('keeps high mechanical potential visible while action is capped by weak evidence', () => {
        const weakMechanicalSpike = createAnalysisResultFixture({
            metrics: {
                sprayScore: 94,
                verticalControlIndex: 1.01,
                horizontalNoiseIndex: 0.4,
                linearErrorSeverity: 1,
                metricQuality: {
                    sprayScore: weakEvidence,
                    verticalControlIndex: weakEvidence,
                    shotResiduals: weakEvidence,
                } as never,
            },
            videoQualityReport: {
                usableForAnalysis: true,
                overallScore: asScore(72),
            },
            sensitivity: {
                tier: 'test_profiles',
                evidenceTier: 'weak',
                confidenceScore: 0.41,
            },
        });

        const mastery = resolveMeasurementTruth(weakMechanicalSpike);

        expect(mastery.mechanicalScore).toBe(94);
        expect(mastery.mechanicalLevel).toBe('advanced');
        expect(mastery.actionState).not.toBe('ready');
        expect(mastery.actionableScore).toBeLessThan(50);
    });

    it('resolves repeated strong evidence or apply-ready sensitivity to Pronto', () => {
        const strong = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            metrics: {
                sprayScore: 92,
                verticalControlIndex: 1,
                horizontalNoiseIndex: 0.4,
                linearErrorSeverity: 1,
                consistencyScore: asScore(90),
                metricQuality: {
                    sprayScore: strongEvidence,
                    verticalControlIndex: strongEvidence,
                    shotResiduals: strongEvidence,
                } as never,
            },
            videoQualityReport: {
                overallScore: asScore(91),
                usableForAnalysis: true,
                blockingReasons: [],
            },
            subSessions: [
                analysisResultBase,
                analysisResultBase,
                analysisResultBase,
            ],
        });

        const mastery = resolveMeasurementTruth(strong);

        expect(mastery.actionState).toBe('ready');
        expect(mastery.actionLabel).toBe('Pronto');
        expect(mastery.mechanicalLevel).toBe('elite');
        expect(mastery.mechanicalLevelLabel).toBe('Elite');
    });

    it('uses the Phase 6 decision ladder to cap ready states and surface blockers', () => {
        const strongCandidate = createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            metrics: {
                sprayScore: 92,
                metricQuality: {
                    sprayScore: strongEvidence,
                } as never,
            },
            videoQualityReport: {
                overallScore: asScore(91),
                usableForAnalysis: true,
                blockingReasons: [],
            },
            subSessions: [analysisResultBase, analysisResultBase, analysisResultBase],
        });
        const usableOnly = resolveMeasurementTruth({
            ...strongCandidate,
            analysisDecision: resolveAnalysisDecision({ confidence: 0.84, coverage: 0.83 }),
        });
        const partial = resolveMeasurementTruth({
            ...strongCandidate,
            analysisDecision: resolveAnalysisDecision({
                blockerReasons: ['low_confidence'],
                confidence: 0.55,
                coverage: 0.72,
            }),
        });

        expect(usableOnly.actionState).toBe('testable');
        expect(partial.actionState).toBe('inconclusive');
        expect(partial.blockedRecommendations).toEqual(expect.arrayContaining([
            expect.stringContaining('low_confidence'),
        ]));
    });

    it('uses the required labels for all primary states and mechanical levels', () => {
        const capture = resolveMeasurementTruth(analysisResultWithWeakCapture);
        const inconclusive = resolveMeasurementTruth(createAnalysisResultFixture({
            metrics: {
                metricQuality: {
                    sprayScore: {
                        ...weakEvidence,
                        coverage: 0.55,
                        confidence: 0.55,
                        framesTracked: 11,
                        framesLost: 9,
                        framesProcessed: 20,
                    },
                } as never,
            },
            sensitivity: {
                tier: 'test_profiles',
                evidenceTier: 'weak',
                confidenceScore: 0.55,
            },
        }));
        const testable = resolveMeasurementTruth(analysisResultBase);
        const ready = resolveMeasurementTruth(createAnalysisResultFixture({
            ...analysisResultWithStrongSensitivity,
            metrics: {
                sprayScore: 92,
                metricQuality: {
                    sprayScore: strongEvidence,
                } as never,
            },
            videoQualityReport: {
                overallScore: asScore(91),
                usableForAnalysis: true,
                blockingReasons: [],
            },
            subSessions: [analysisResultBase, analysisResultBase, analysisResultBase],
        }));

        const initial = resolveMeasurementTruth(createAnalysisResultFixture({ metrics: { sprayScore: 34 } }));
        const intermediate = resolveMeasurementTruth(createAnalysisResultFixture({ metrics: { sprayScore: 55 } }));
        const advanced = resolveMeasurementTruth(createAnalysisResultFixture({ metrics: { sprayScore: 72 } }));

        expect([
            capture.actionLabel,
            inconclusive.actionLabel,
            testable.actionLabel,
            ready.actionLabel,
        ]).toEqual(['Capturar de novo', 'Incerto', 'Testavel', 'Pronto']);
        expect([
            initial.mechanicalLevelLabel,
            intermediate.mechanicalLevelLabel,
            advanced.mechanicalLevelLabel,
            ready.mechanicalLevelLabel,
        ]).toEqual(['Inicial', 'Intermediario', 'Avancado', 'Elite']);
    });

    it('formats friendly diagnosis labels for every diagnosis type', () => {
        const labels = ([
            'underpull',
            'overpull',
            'excessive_jitter',
            'horizontal_drift',
            'inconsistency',
            'late_compensation',
            'inconclusive',
        ] as const satisfies readonly DiagnosisType[]).map(formatDiagnosisTruthLabel);

        expect(labels).toEqual([
            'spray subindo',
            'spray descendo demais',
            'tremida lateral',
            'desvio lateral',
            'spray irregular',
            'reacao atrasada ao recuo',
            'leitura inconclusiva',
        ]);
    });
});
