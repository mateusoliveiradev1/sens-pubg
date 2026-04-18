import { describe, expect, it } from 'vitest';
import type { CoachFeedback, Diagnosis, SprayMetrics } from '@/types/engine';
import {
    buildResultMetricCards,
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
});
