/**
 * Tests: Coach Engine
 * Valida o feedback de coaching para cada diagnóstico.
 */

import { describe, it, expect } from 'vitest';
import { attachCoachPlanToAnalysisResult, generateCoaching } from './coach-engine';
import { analysisResultBase } from './coach-test-fixtures';
import type { Diagnosis, WeaponLoadout } from '../types/engine';

const defaultLoadout: WeaponLoadout = {
    stance: 'standing',
    muzzle: 'none',
    grip: 'none',
    stock: 'none',
};

describe('generateCoaching', () => {
    it('should return empty array for no diagnoses', () => {
        const coaching = generateCoaching([], defaultLoadout);
        expect(coaching).toHaveLength(0);
    });

    it('should return one coaching item per diagnosis', () => {
        const diagnoses: Diagnosis[] = [
            {
                type: 'overpull',
                severity: 3,
                verticalControlIndex: 1.3,
                excessPercent: 30,
                description: 'Overpull detectado',
                cause: 'Sens muito baixa',
                remediation: 'Aumente a sens',
            },
            {
                type: 'inconsistency',
                severity: 2,
                consistencyScore: 40 as never,
                description: 'Spray inconsistente',
                cause: 'Falta de prática',
                remediation: 'Pratique mais',
            },
        ];

        const coaching = generateCoaching(diagnoses, defaultLoadout);
        expect(coaching).toHaveLength(2);
    });

    it('should include all coaching fields', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'excessive_jitter',
            severity: 4,
            horizontalNoise: 15,
            threshold: 5,
            description: 'Jitter excessivo',
            cause: 'Grip instável',
            remediation: 'Relaxe o grip',
        }];

        const coaching = generateCoaching(diagnoses, defaultLoadout);
        const feedback = coaching[0]!;

        expect(feedback.whatIsWrong).toContain('horizontal');
        expect(feedback.whyItHappens).toBe('Grip instável');
        expect(feedback.whatToAdjust).toContain('Relaxe o grip');
        expect(feedback.howToTest).toContain('Meta do proximo bloco');
        expect(feedback.adaptationTimeDays).toBeGreaterThanOrEqual(1);
    });

    it('returns evidence-linked coach schema without unanchored free text', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'underpull',
            severity: 4,
            verticalControlIndex: 0.64,
            deficitPercent: 36,
            dominantPhase: 'fatigue',
            confidence: 0.82,
            evidence: {
                confidence: 0.82,
                coverage: 0.91,
                angularErrorDegrees: 1.4,
                linearErrorCm: 73,
                linearErrorSeverity: 4,
            },
            description: 'Compensacao vertical baixa na fase fatigue',
            cause: 'Pulldown insuficiente sustentado',
            remediation: 'Reduza sens ou puxe mais no sustain',
        }];

        const feedback = generateCoaching(diagnoses, defaultLoadout)[0]!;

        expect(feedback.problem).toBe('Compensacao vertical baixa na fase fatigue');
        expect(feedback.evidence).toMatchObject({
            diagnosisType: 'underpull',
            severity: 4,
            dominantPhase: 'fatigue',
            confidence: 0.82,
            coverage: 0.91,
            angularErrorDegrees: 1.4,
            linearErrorCm: 73,
            linearErrorSeverity: 4,
        });
        expect(feedback.confidence).toBe(0.82);
        expect(feedback.likelyCause).toContain('Pulldown insuficiente sustentado');
        expect(feedback.adjustment).toContain('Reduza sens ou puxe mais no sustain');
        expect(feedback.drill).toBeTruthy();
        expect(feedback.verifyNextClip).toContain('fadiga');
        expect(feedback.whatIsWrong).toContain('VCI 0.64');
        expect(feedback.whatIsWrong).toContain('73.0cm');
        expect(feedback.howToTest).toContain('VCI mais perto de 1.00');
    });

    it('does not recommend removed angled foregrip on patch 41.1', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'horizontal_drift',
            severity: 4,
            bias: { direction: 'right', magnitude: 4.2 },
            description: 'Drift lateral para direita',
            cause: 'Controle horizontal insuficiente',
            remediation: 'Estabilize o eixo horizontal',
        }];

        const feedback = generateCoaching(diagnoses, defaultLoadout, { patchVersion: '41.1' })[0]!;

        expect(feedback.adjustment).toContain('Tilted Grip');
        expect(feedback.adjustment).not.toContain('Angled');
    });

    it('anchors verify step to Hybrid Scope state on patch 41.1', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'underpull',
            severity: 3,
            verticalControlIndex: 0.72,
            deficitPercent: 28,
            description: 'Pulldown baixo usando zoom alternado',
            cause: 'O state de 4x exige controle vertical mais firme',
            remediation: 'Repita o spray no mesmo state do optic',
        }];

        const feedback = generateCoaching(diagnoses, defaultLoadout, {
            patchVersion: '41.1',
            opticId: 'hybrid-scope',
            opticStateId: '4x',
        })[0]!;

        expect(feedback.verifyNextClip).toContain('Hybrid Scope');
        expect(feedback.verifyNextClip).toContain('4x');
        expect(feedback.evidence.optic).toMatchObject({
            id: 'hybrid-scope',
            name: 'Hybrid Scope',
            stateId: '4x',
            stateName: '4x',
            patchVersion: '41.1',
        });
    });

    it('uses low-confidence mode and asks for a new clip when evidence is weak', () => {
        const diagnoses: Diagnosis[] = [{
            type: 'underpull',
            severity: 4,
            verticalControlIndex: 0.7,
            deficitPercent: 30,
            confidence: 0.38,
            evidence: {
                confidence: 0.38,
                coverage: 0.44,
                angularErrorDegrees: 1.2,
                linearErrorCm: 56,
                linearErrorSeverity: 4,
            },
            description: 'Pulldown possivelmente baixo',
            cause: 'Evidencia parcial do tracking',
            remediation: 'Considere reduzir sensibilidade vertical',
        }];

        const feedback = generateCoaching(diagnoses, defaultLoadout, { patchVersion: '41.1' })[0]!;

        expect(feedback.mode).toBe('low-confidence');
        expect(feedback.adjustment.toLowerCase()).toContain('hipotese');
        expect(feedback.adjustment).not.toContain('Vertical Foregrip');
        expect(feedback.verifyNextClip.toLowerCase()).toContain('novo clip');
    });

    it('should estimate longer adaptation for higher severity', () => {
        const mild: Diagnosis[] = [{
            type: 'horizontal_drift',
            severity: 1,
            bias: { direction: 'left', magnitude: 1.2 },
            description: 'test', cause: 'test', remediation: 'test',
        }];

        const severe: Diagnosis[] = [{
            type: 'horizontal_drift',
            severity: 5,
            bias: { direction: 'right', magnitude: 5 },
            description: 'test', cause: 'test', remediation: 'test',
        }];

        const mildCoaching = generateCoaching(mild, defaultLoadout);
        const severeCoaching = generateCoaching(severe, defaultLoadout);

        expect(severeCoaching[0]!.adaptationTimeDays).toBeGreaterThan(mildCoaching[0]!.adaptationTimeDays);
    });
});

describe('attachCoachPlanToAnalysisResult', () => {
    it('attaches a deterministic coachPlan without replacing existing feedback cards', () => {
        const result = attachCoachPlanToAnalysisResult(analysisResultBase);

        expect(result).not.toBe(analysisResultBase);
        expect(result.coaching).toBe(analysisResultBase.coaching);
        expect(result.coachPlan).toEqual(expect.objectContaining({
            tier: expect.any(String),
            primaryFocus: expect.objectContaining({
                area: 'vertical_control',
            }),
            nextBlock: expect.objectContaining({
                steps: expect.any(Array),
                checks: expect.any(Array),
            }),
        }));
    });
});
