import { describe, expect, it } from 'vitest';

import { createSprayLabSessionFromProtocol } from './spray-lab-session';
import {
    buildSprayLabValidationRepairState,
    buildSprayLabValidationTarget,
    compareSprayLabValidationContext,
    resolveSprayLabValidationStatus,
    type SprayLabValidationTargetSnapshot,
} from './spray-lab-validation';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
} from '@/types/engine';

function completeProtocol(overrides: Partial<CompleteTrainingProtocol> = {}): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'protocol-vertical-1',
        drillId: 'vertical_recoil_lane',
        tier: 'test_protocol',
        title: 'Ficha vertical',
        summary: 'Bloco controlado para recoil vertical.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl-m762',
            weaponName: 'Beryl M762',
            opticId: 'scope-3x',
            opticName: '3x',
            distanceMeters: 50,
            distanceMode: 'exact',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            patchVersion: '36.1',
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Treinar puxada vertical sem trocar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 4,
            spraysPerRep: 2,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Training Mode 50m',
        executionSteps: ['Spray controlado', 'Descanso curto'],
        preparation: [{
            id: 'setup',
            label: 'Confirmar setup',
            reason: 'Evita misturar variaveis.',
            required: true,
            safetyKind: 'variable_control',
        }],
        validation: {
            compatibleClipChecklist: ['Mesma arma', 'Mesma mira', 'Mesma distancia'],
            minimumConfidence: 0.75,
            minimumCoverage: 0.8,
            successCriteria: ['Melhorar controle vertical.'],
            failCriteria: ['Perder cobertura.'],
            variableControlChecklist: ['Nao trocar sensibilidade'],
            nextClipCopy: 'Grave outro clip igual.',
        },
        transfer: {
            situationChecklist: ['TDM curto'],
            conservativeConfidenceCopy: 'Transferencia nao substitui validacao compativel.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'test_protocol',
            tierAfter: 'test_protocol',
            reasons: [],
            blockedFields: [],
            repairCtas: [],
            userCopy: 'Sem downgrade ativo.',
        },
        audit: {
            createdAt: '2026-05-08T05:00:00.000Z',
            analysisDecisionLevel: 'usable_analysis',
            primaryFocusArea: 'vertical_control',
            secondaryFocusAreas: [],
            confidence: 0.84,
            coverage: 0.86,
            source: 'deterministic_coach',
        },
        stopConditions: ['Pare se houver dor ou fadiga.'],
        continueCriteria: ['Continuar se contexto ficar igual.'],
        antiMixingNotes: ['Nao misturar sens e grip.'],
        freeSummary: ['Foco e duracao visiveis.'],
        proSections: ['Auditoria completa.'],
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function validationTarget(): SprayLabValidationTargetSnapshot {
    const session = createSprayLabSessionFromProtocol({
        protocol: completeProtocol(),
        sessionId: 'lab-session-1',
        baseAnalysisId: 'analysis-1',
        createdAt: '2026-05-08T05:10:00.000Z',
    });

    return buildSprayLabValidationTarget({
        session,
        baseAnalysisSessionId: 'analysis-1',
    });
}

function analysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        id: 'analysis-validation-1',
        timestamp: new Date('2026-05-08T05:20:00.000Z'),
        patchVersion: '36.1',
        analysisContext: {
            targetDistanceMeters: 50,
            distanceMode: 'exact',
            optic: {
                scopeId: 'scope-3x',
                opticId: 'scope-3x',
                opticStateId: 'scope-3x-default',
                opticName: '3x',
                opticStateName: '3x',
                availableStateIds: ['scope-3x-default'],
                isDynamicOptic: false,
            },
        },
        trajectory: {
            weaponId: 'beryl-m762',
        } as AnalysisResult['trajectory'],
        loadout: {
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'none',
        },
        metrics: {} as AnalysisResult['metrics'],
        diagnoses: [],
        sensitivity: {
            recommended: 'balanced',
        } as AnalysisResult['sensitivity'],
        coaching: [],
        ...overrides,
    };
}

function trend(label: PrecisionTrendSummary['label']): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: label === 'validated_progress' ? 'strong' : 'initial',
        compatibleCount: label === 'baseline' ? 1 : 3,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.9,
        nextValidationHint: 'Mantenha contexto fixo.',
    };
}

describe('spray lab validation contract', () => {
    it('builds a sanitized target from the Lab session context', () => {
        const target = validationTarget();

        expect(target).toMatchObject({
            labSessionId: 'lab-session-1',
            baseAnalysisSessionId: 'analysis-1',
            protocolId: 'protocol-vertical-1',
            context: {
                weaponId: 'beryl-m762',
                opticId: 'scope-3x',
                distanceMeters: 50,
                distanceMode: 'exact',
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                sensitivityProfile: 'balanced',
                patchVersion: '36.1',
            },
            checklist: ['Mesma arma', 'Mesma mira', 'Mesma distancia'],
        });
        expect(target.targetCopy).toContain('Beryl M762');
    });

    it('keeps the same strict context compatible for technical validation', () => {
        const comparison = compareSprayLabValidationContext({
            target: validationTarget(),
            result: analysisResult(),
            confirmedVariables: true,
        });

        expect(comparison.compatible).toBe(true);
        expect(comparison.blockers).toEqual([]);
    });

    it('blocks changed weapon, optic, distance, sensitivity, and unconfirmed variables', () => {
        const changedVariables = compareSprayLabValidationContext({
            target: validationTarget(),
            result: analysisResult(),
            confirmedVariables: false,
        });
        const changedContext = compareSprayLabValidationContext({
            target: validationTarget(),
            result: analysisResult({
                patchVersion: '37.1',
                analysisContext: {
                    ...analysisResult().analysisContext!,
                    targetDistanceMeters: 65,
                    distanceMode: 'estimated',
                    optic: {
                        ...analysisResult().analysisContext!.optic,
                        scopeId: 'red-dot',
                        opticId: 'red-dot',
                    },
                },
                trajectory: {
                    weaponId: 'm416',
                } as AnalysisResult['trajectory'],
                sensitivity: {
                    recommended: 'high',
                } as AnalysisResult['sensitivity'],
            }),
            confirmedVariables: true,
        });

        expect(changedVariables.compatible).toBe(false);
        expect(changedVariables.blockers.map((blocker) => blocker.code)).toEqual(['evidence_mismatch']);
        expect(changedContext.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
            'patch_mismatch',
            'weapon_mismatch',
            'scope_mismatch',
            'distance_out_of_tolerance',
            'distance_ambiguous',
            'sensitivity_change',
        ]));
    });

    it('resolves progress, promising, unchanged, regression, incompatible, and inconclusive statuses', () => {
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: true,
            trend: trend('validated_progress'),
        })).toBe('validacao_confirmada');
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: true,
            trend: trend('initial_signal'),
        })).toBe('sinal_promissor');
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: true,
            trend: trend('oscillation'),
        })).toBe('sem_mudanca_clara');
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: true,
            trend: trend('validated_regression'),
        })).toBe('regressao_validada');
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: false,
            trend: trend('validated_progress'),
        })).toBe('nao_compativel');
        expect(resolveSprayLabValidationStatus({
            confirmedVariables: true,
            result: analysisResult({
                analysisDecision: {
                    version: 'spray-truth-v2',
                    level: 'inconclusive_recapture',
                    blockerReasons: ['low_confidence'],
                    permissionMatrix: {
                        canDisplayDiagnosis: true,
                        canDisplaySensitivity: false,
                        canDisplayCoach: false,
                        canSaveAuditResult: true,
                        countsAsUsefulAnalysis: false,
                        canEnterPrecisionTrend: false,
                        canEnterCorpus: false,
                        allowedClaimLevel: 'limited_read',
                    },
                    recommendedNextStep: 'Recapturar.',
                    legacyActionState: 'inconclusive',
                    confidence: 0.4,
                },
            }),
            trend: trend('validated_progress'),
        })).toBe('inconclusivo');
    });

    it('turns incompatible validation into a repair state instead of a generic error', () => {
        const repair = buildSprayLabValidationRepairState({
            status: 'nao_compativel',
            blockers: [{
                code: 'weapon_mismatch',
                field: 'weaponId',
                message: 'Arma diferente.',
            }],
        });

        expect(repair).toMatchObject({
            type: 'contexto_incompativel',
            title: 'Contexto incompativel',
            stillUsefulAs: 'practice',
        });
        expect(repair?.whatHappened.toLowerCase()).not.toContain('erro tecnico');
    });
});

