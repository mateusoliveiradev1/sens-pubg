import { describe, expect, it } from 'vitest';

import { resolveAnalysisDecision } from './analysis-decision';
import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultBase,
    analysisResultWithStrongSensitivity,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import {
    buildCompleteTrainingProtocol,
    buildTrainingProtocolPreparation,
} from './training-protocols';
import type { CoachPlan } from '../types/engine';

function withoutCompleteProtocol(plan: CoachPlan): Omit<CoachPlan, 'completeProtocol'> {
    return {
        tier: plan.tier,
        sessionSummary: plan.sessionSummary,
        primaryFocus: plan.primaryFocus,
        secondaryFocuses: plan.secondaryFocuses,
        actionProtocols: plan.actionProtocols,
        nextBlock: plan.nextBlock,
        stopConditions: plan.stopConditions,
        adaptationWindowDays: plan.adaptationWindowDays,
        llmRewriteAllowed: plan.llmRewriteAllowed,
    };
}

describe('buildCompleteTrainingProtocol', () => {
    it('builds a complete protocol with dose, preparation, validation, transfer and audit fields', () => {
        const plan = buildCoachPlan({ analysisResult: analysisResultBase });
        const protocol = plan.completeProtocol;

        expect(protocol).toEqual(expect.objectContaining({
            version: 'complete-protocol-v1',
            drillId: 'vertical_recoil_lane',
            environment: 'training_mode',
            llmRewriteAllowed: false,
            dose: expect.objectContaining({
                durationMinutes: 12,
                sprayReps: expect.any(Number),
                spraysPerRep: expect.any(Number),
            }),
            validation: expect.objectContaining({
                compatibleClipChecklist: expect.any(Array),
                minimumConfidence: expect.any(Number),
                minimumCoverage: expect.any(Number),
            }),
            transfer: expect.objectContaining({
                countsAsTechnicalValidation: false,
            }),
            audit: expect.objectContaining({
                source: 'deterministic_coach',
            }),
        }));
        expect(protocol?.preparation.some((item) => item.id === 'pain-stop-rule')).toBe(true);
        expect(protocol?.stopConditions.length).toBeGreaterThan(0);
        expect(protocol?.continueCriteria.length).toBeGreaterThan(0);
    });

    it('keeps partial safe reads downgraded and away from apply-strength validation copy', () => {
        const partialResult = createAnalysisResultFixture({
            analysisDecision: resolveAnalysisDecision({
                blockerReasons: ['low_confidence'],
                confidence: 0.55,
                coverage: 0.7,
            }),
        });
        const plan = buildCoachPlan({ analysisResult: partialResult });
        const protocol = plan.completeProtocol;
        const validationCopy = protocol?.validation.successCriteria.join(' ') ?? '';

        expect(protocol?.downgrade.reasons).toContain('partial_safe_read');
        expect(protocol?.tier).toBe('test_protocol');
        expect(validationCopy).not.toMatch(/apply-strength|aplicar protocolo|conclusao forte/i);
    });

    it('downgrades an apply protocol fixture when compatible validation is missing', () => {
        const applyBase = withoutCompleteProtocol(buildCoachPlan({
            analysisResult: analysisResultWithStrongSensitivity,
        }));
        const protocol = buildCompleteTrainingProtocol({
            analysisResult: {
                ...analysisResultWithStrongSensitivity,
                analysisDecision: resolveAnalysisDecision({
                    confidence: 0.91,
                    coverage: 0.9,
                    commercialEvidence: true,
                }),
            },
            coachPlanBase: {
                ...applyBase,
                tier: 'apply_protocol',
            },
        });

        expect(protocol.downgrade.tierBefore).toBe('apply_protocol');
        expect(protocol.tier).toBe('test_protocol');
        expect(protocol.downgrade.reasons).toContain('insufficient_compatible_validation');
        expect(protocol.downgrade.repairCtas).toEqual(expect.arrayContaining([
            expect.stringContaining('clip compativel'),
        ]));
    });

    it('keeps preparation copy as setup/control guidance without medical or strength prescriptions', () => {
        const preparation = buildTrainingProtocolPreparation('vertical_control', 'test_protocol', []);
        const copy = preparation.map((item) => `${item.label} ${item.reason}`).join(' ').toLowerCase();

        expect(copy).toContain('dor');
        expect(copy).toContain('dormencia');
        expect(copy).toContain('formigamento');
        expect(copy).not.toMatch(/tratamento|diagnostico medico|carga|serie|musculacao/);
    });
});
