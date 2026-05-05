import { describe, expect, it } from 'vitest';
import type { CoachFeedback, CoachPlan, Diagnosis, SensitivityRecommendation, SprayMastery, SprayMetrics } from '@/types/engine';
import {
    buildEvidenceBadges,
    buildMasteryPillarCards,
    buildResultMetricCards,
    buildResultVerdictModel,
    groupCoachFeedbackByDiagnosis,
    splitDiagnosesBySeverity,
} from './results-dashboard-view-model';

const baseMetrics = {
    verticalControlIndex: 0.59,
    horizontalNoiseIndex: 2.8,
    linearErrorCm: 57.4,
    linearErrorSeverity: 128,
    initialRecoilResponseMs: 83,
} as SprayMetrics;

const baseTrackingOverview = {
    coverage: 0.88,
    confidence: 0.86,
    visibleFrames: 88,
    framesLost: 12,
    framesProcessed: 100,
};

const baseSensitivity = {
    tier: 'test_profiles',
    evidenceTier: 'moderate',
    confidenceScore: 0.72,
} as SensitivityRecommendation;

function createMastery(overrides: Partial<SprayMastery> = {}): SprayMastery {
    return {
        actionState: 'testable',
        actionLabel: 'Testavel',
        mechanicalLevel: 'advanced',
        mechanicalLevelLabel: 'Avancado',
        actionableScore: 74,
        mechanicalScore: 79,
        pillars: {
            control: 82,
            consistency: 68,
            confidence: 86,
            clipQuality: 81,
        },
        evidence: {
            coverage: 0.88,
            confidence: 0.86,
            visibleFrames: 88,
            lostFrames: 12,
            framesProcessed: 100,
            sampleSize: 24,
            qualityScore: 81,
            usableForAnalysis: true,
        },
        reasons: ['Nivel mecanico observado: Avancado.'],
        blockedRecommendations: [],
        ...overrides,
    };
}

function createCoachPlan(overrides: Partial<CoachPlan> = {}): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Use o proximo bloco como teste controlado.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Spray subindo e a captura sustenta teste.',
            priorityScore: 0.7,
            severity: 4,
            confidence: 0.82,
            coverage: 0.84,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [],
        nextBlock: {
            title: 'Bloco curto de teste de controle vertical',
            durationMinutes: 12,
            steps: [
                'Faca 3 sprays comparaveis focados em controle vertical.',
                'Mantenha arma, mira, distancia, postura e sensibilidade fixos.',
                'Use o proximo video para confirmar se o mesmo sinal se repete.',
            ],
            checks: [{
                label: 'Validacao de controle vertical',
                target: 'reduzir o erro vertical sustentado',
                minimumCoverage: 0.7,
                minimumConfidence: 0.7,
                successCondition: 'Sucesso quando controle vertical melhorar e cobertura/confianca continuarem acima do limite.',
                failCondition: 'Falha se controle vertical nao melhorar.',
            }],
        },
        stopConditions: [],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
        ...overrides,
    };
}

describe('results dashboard view model', () => {
    it('uses diagnosis evidence thresholds when classifying metric cards', () => {
        const diagnoses = [{
            type: 'excessive_jitter',
            severity: 5,
            horizontalNoise: 2.8,
            threshold: 0.18,
            description: 'Jitter critico.',
            cause: 'Micro-ajustes excessivos.',
            remediation: 'Relaxar grip.',
        }] as readonly Diagnosis[];

        const cards = buildResultMetricCards({
            metrics: baseMetrics,
            diagnoses,
            sensitivity: { suggestedVSM: 0.88 },
            linearErrorLabel: 'Erro Linear',
            linearErrorUnit: 'cm @ aprox. 10m',
        });

        expect(cards.find((card) => card.label === 'Ruido Horizontal')).toMatchObject({
            tone: 'error',
            reference: 'Limite 0.18 deg',
            meterPercent: 100,
        });
    });

    it('splits diagnoses by severity while preserving priority order', () => {
        const diagnoses = [
            { type: 'inconsistency', severity: 2 },
            { type: 'underpull', severity: 5 },
            { type: 'horizontal_drift', severity: 3 },
        ] as readonly Diagnosis[];

        const split = splitDiagnosesBySeverity(diagnoses);

        expect(split.majorDiagnoses.map((diagnosis) => diagnosis.type)).toEqual([
            'underpull',
            'horizontal_drift',
        ]);
        expect(split.minorDiagnoses.map((diagnosis) => diagnosis.type)).toEqual(['inconsistency']);
    });

    it('groups coach feedback by diagnosis type with computed priority labels', () => {
        const coaching = [
            { diagnosis: { type: 'underpull', severity: 5 } },
            { diagnosis: { type: 'underpull', severity: 3 } },
            { diagnosis: { type: 'horizontal_drift', severity: 3 } },
        ] as readonly CoachFeedback[];

        const groups = groupCoachFeedbackByDiagnosis(coaching);

        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({
            key: 'underpull',
            maxSeverity: 5,
            priorityTone: 'error',
            priorityLabel: 'CRITICO',
        });
        expect(groups[0]?.items).toHaveLength(2);
    });

    it('keeps weak evidence conservative with blocked recommendation copy', () => {
        const mastery = createMastery({
            actionState: 'inconclusive',
            actionLabel: 'Incerto',
            actionableScore: 45,
            evidence: {
                ...createMastery().evidence,
                coverage: 0.52,
                confidence: 0.55,
            },
            blockedRecommendations: ['Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.'],
        });

        const verdict = buildResultVerdictModel({
            mastery,
            coachPlan: createCoachPlan(),
            trackingOverview: {
                ...baseTrackingOverview,
                coverage: 0.52,
                confidence: 0.55,
            },
            sensitivity: {
                ...baseSensitivity,
                evidenceTier: 'weak',
            },
            diagnoses: [{ type: 'underpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Incerto');
        expect(verdict.scoreTone).toBe('info');
        expect(verdict.blockedReasons).toContain('Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.');
        expect(verdict.primaryExplanation).toContain('evidencia ainda nao sustenta protocolo forte');
    });

    it('summarizes a testable result with the next controlled block', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery(),
            coachPlan: createCoachPlan(),
            trackingOverview: baseTrackingOverview,
            sensitivity: baseSensitivity,
            diagnoses: [{ type: 'underpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Testavel');
        expect(verdict.primaryExplanation).toContain('spray subindo');
        expect(verdict.nextBlock).toMatchObject({
            title: 'Bloco curto de teste de controle vertical',
            durationLabel: '12 min',
            validationLabel: 'Validacao de controle vertical',
        });
        expect(verdict.nextBlock?.steps).toHaveLength(3);
    });

    it('uses validation language for ready verdicts instead of final-skill claims', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery({
                actionState: 'ready',
                actionLabel: 'Pronto',
                actionableScore: 88,
                mechanicalScore: 84,
                blockedRecommendations: [],
            }),
            coachPlan: createCoachPlan({ tier: 'apply_protocol' }),
            trackingOverview: baseTrackingOverview,
            sensitivity: {
                ...baseSensitivity,
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.91,
            },
            diagnoses: [{ type: 'overpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Pronto');
        expect(verdict.scoreTone).toBe('success');
        expect(verdict.primaryExplanation).toContain('validacao curta');
        expect(verdict.primaryExplanation).not.toMatch(/perfeito|garantido|definitivo|verdade final/i);
    });

    it('builds mastery pillars in the exact report order', () => {
        const pillars = buildMasteryPillarCards(createMastery());

        expect(pillars.map((pillar) => pillar.label)).toEqual([
            'Controle',
            'Consistencia',
            'Confianca',
            'Qualidade do clip',
        ]);
    });

    it('builds evidence badges for confidence, coverage, frames, capture state, and clip quality', () => {
        const badges = buildEvidenceBadges({
            mastery: createMastery(),
            trackingOverview: baseTrackingOverview,
        });

        expect(badges.map((badge) => badge.label)).toEqual([
            'Confianca',
            'Cobertura',
            'Frames visiveis',
            'Frames perdidos',
            'Estado da leitura',
            'Qualidade do clip',
        ]);
    });
});
