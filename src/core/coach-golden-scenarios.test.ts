import { describe, expect, it } from 'vitest';
import type {
    CompleteTrainingProtocol,
    SprayLabBenchmarkSnapshot,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
} from '@/types/engine';

import { buildSprayLabCoachHandoff } from './spray-lab-coach-handoff';

function protocol(): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'protocol-vertical',
        drillId: 'vertical_recoil_lane',
        tier: 'stabilize_block',
        title: 'Beryl 3x vertical',
        summary: 'Bloco controlado de vertical.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl-m762',
            weaponName: 'Beryl M762',
            opticId: '3x-scope',
            opticName: '3x',
            distanceMeters: 50,
            distanceMode: 'exact',
            stance: 'crouching',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            patchVersion: '41.1',
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Reduzir subida vertical sem misturar variaveis.',
        dose: {
            durationMinutes: 18,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 18,
        },
        target: 'Grupo vertical menor em 50m.',
        executionSteps: ['Preparar contexto', 'Executar sprays', 'Fechar resultado'],
        preparation: [],
        validation: {
            compatibleClipChecklist: ['Beryl M762', '3x', '50m', 'mesma sensibilidade'],
            minimumConfidence: 0.72,
            minimumCoverage: 0.7,
            successCriteria: ['Menos subida vertical sem aumentar ruido.'],
            failCriteria: ['Variavel mudou ou ruido subiu.'],
            variableControlChecklist: ['sens fixa'],
            nextClipCopy: 'Grave Beryl 3x em 50m.',
        },
        transfer: {
            situationChecklist: ['TDM curta com Beryl 3x'],
            conservativeConfidenceCopy: 'Transferencia pratica nao substitui clip compativel.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'apply_protocol',
            tierAfter: 'stabilize_block',
            reasons: ['insufficient_compatible_validation'],
            blockedFields: ['apply_protocol'],
            repairCtas: ['Gravar validacao compativel'],
            userCopy: 'Falta validacao compativel.',
        },
        audit: {
            createdAt: '2026-05-08T10:00:00.000Z',
            primaryFocusArea: 'vertical_control',
            secondaryFocusAreas: [],
            confidence: 0.78,
            coverage: 0.74,
            source: 'deterministic_coach',
        },
        stopConditions: [],
        continueCriteria: [],
        antiMixingNotes: [],
        freeSummary: ['Controle vertical'],
        proSections: ['auditoria', 'benchmark'],
        llmRewriteAllowed: false,
    };
}

function session(overrides: Partial<SprayLabSessionSnapshot> = {}): SprayLabSessionSnapshot {
    const baseProtocol = protocol();

    return {
        version: 'spray-lab-v1',
        id: 'lab-vertical',
        status: 'completed',
        act: 'fechar_resultado',
        stepState: 'resultado',
        protocolId: baseProtocol.id,
        protocol: baseProtocol,
        lane: {
            version: 'spray-lab-v1',
            id: 'lane-vertical',
            drillId: 'vertical_recoil_lane',
            label: 'Beryl 3x 50m vertical',
            shortLabel: 'Vertical 50m',
            objective: 'Controle vertical',
            familyLabel: 'Vertical',
            difficulty: 'controlled',
            recommendedEnvironment: 'training_mode',
            evidenceRequirements: {
                minimumFidelityTier: 'usable',
                compatibleValidationRequired: true,
                allowedEvidenceLevels: ['provisional_benchmark', 'validated_benchmark'],
            },
            suggestedSetup: [],
            supportNotes: [],
            supportLevel: 'full',
        },
        contextKey: 'beryl|3x|50|vertical',
        baseAnalysisId: 'analysis-1',
        createdAt: '2026-05-08T10:00:00.000Z',
        updatedAt: '2026-05-08T10:20:00.000Z',
        activeBlockIndex: 0,
        activeRepIndex: 3,
        totalReps: 4,
        completedReps: 4,
        totalSprays: 12,
        completedSprays: 12,
        manualInterventionCount: 0,
        problemReasonCodes: [],
        blocks: [],
        eventIds: ['complete_result'],
        validationStatus: 'not_requested',
        fidelity: {
            version: 'spray-lab-v1',
            sessionId: 'lab-vertical',
            tier: 'strong',
            score: 92,
            components: [],
            reasonCodes: [],
            evidenceLevel: 'provisional_benchmark',
            benchmarkEligible: true,
            safetyDowngrade: false,
            coachImpactCopy: 'Fidelidade forte.',
            repairCtas: [],
        },
        index: {
            version: 'spray-lab-v1',
            id: 'index-vertical',
            sessionId: 'lab-vertical',
            protocolId: baseProtocol.id,
            laneId: 'lane-vertical',
            contextKey: 'beryl|3x|50|vertical',
            state: 'baseline',
            evidenceLevel: 'provisional_benchmark',
            provisionalScore: 82,
            components: [],
            fidelityTier: 'strong',
            validationStatus: 'not_requested',
            blockerReasons: [],
            createdAt: '2026-05-08T10:20:00.000Z',
        },
        ...overrides,
    };
}

function validation(status: SprayLabValidationLink['status']): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: `validation-${status}`,
        labSessionId: 'lab-vertical',
        baseAnalysisId: 'analysis-1',
        validationAnalysisId: 'analysis-2',
        contextKey: 'beryl|3x|50|vertical',
        targetCopy: 'Beryl 3x 50m',
        status,
        confirmedVariables: status !== 'nao_compativel',
        blockers: status === 'nao_compativel'
            ? [{
                code: 'scope_mismatch',
                field: 'opticId',
                message: 'contexto incompativel',
            }]
            : [],
        precisionTrend: {
            label: status === 'regressao_validada' ? 'validated_regression' : 'validated_progress',
            evidenceLevel: 'strong',
            compatibleCount: 3,
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
            coverage: 0.88,
            nextValidationHint: 'Validar Beryl 3x em 50m.',
        },
        createdAt: '2026-05-08T10:30:00.000Z',
        updatedAt: '2026-05-08T10:30:00.000Z',
    };
}

function benchmark(sprayLabSession: SprayLabSessionSnapshot): SprayLabBenchmarkSnapshot {
    return {
        version: 'spray-lab-v1',
        id: 'benchmark-vertical',
        sessionId: sprayLabSession.id,
        protocolId: sprayLabSession.protocolId,
        laneId: sprayLabSession.lane.id,
        contextKey: sprayLabSession.contextKey,
        index: sprayLabSession.index!,
        fidelityTier: sprayLabSession.fidelity!.tier,
        evidenceLevel: sprayLabSession.index!.evidenceLevel,
        validationStatus: sprayLabSession.index!.validationStatus,
        eligibleForReleaseBenchmark: sprayLabSession.index!.evidenceLevel === 'validated_benchmark',
        blockerReasons: sprayLabSession.index!.blockerReasons,
        createdAt: '2026-05-08T10:31:00.000Z',
    };
}

describe('Phase 9 Spray Lab coach golden scenarios', () => {
    it('uses confirmed compatible validation as technical proof', () => {
        const validatedSession = session({
            validationStatus: 'validacao_confirmada',
            validationLink: validation('validacao_confirmada'),
            index: {
                ...session().index!,
                state: 'progresso_validado',
                evidenceLevel: 'validated_benchmark',
                validationStatus: 'validacao_confirmada',
                validatedScore: 88,
            },
        });

        const handoff = buildSprayLabCoachHandoff({
            session: validatedSession,
            benchmark: benchmark(validatedSession),
        });

        expect(handoff?.technicalProofState).toBe('confirmed_progress');
        expect(handoff?.compatibleClipProof.countsAsTechnicalProof).toBe(true);
        expect(handoff?.validatedScore).toBe(88);
        expect(handoff?.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('keeps a strong unvalidated session as execution evidence only', () => {
        const handoff = buildSprayLabCoachHandoff({ session: session() });

        expect(handoff?.technicalProofState).toBe('none');
        expect(handoff?.validatedScore).toBeNull();
        expect(handoff?.evidenceLevel).toBe('provisional_benchmark');
        expect(handoff?.nextAction.kind).toBe('record_validation');
    });

    it('caps practice_only fidelity at practical evidence', () => {
        const practiceSession = session({
            fidelity: {
                ...session().fidelity!,
                tier: 'practice_only',
                evidenceLevel: 'practice',
                benchmarkEligible: false,
                reasonCodes: ['fatigue_or_pain'],
            },
            index: {
                ...session().index!,
                state: 'bloqueado_por_fidelidade',
                evidenceLevel: 'practice',
                fidelityTier: 'practice_only',
                blockerReasons: ['fatigue_or_pain'],
            },
        });
        const handoff = buildSprayLabCoachHandoff({ session: practiceSession });

        expect(handoff?.evidenceLevel).toBe('practice');
        expect(handoff?.compatibleClipProof.countsAsTechnicalProof).toBe(false);
        expect(handoff?.blockerReasons).toContain('fadiga/dor rebaixou a sessao para seguranca');
    });

    it('routes incompatible context to repair instead of success', () => {
        const incompatibleSession = session({
            validationStatus: 'nao_compativel',
            validationLink: validation('nao_compativel'),
            repairState: {
                type: 'contexto_incompativel',
                title: 'Contexto incompativel',
                whatHappened: 'Mira ou distancia mudou.',
                whyItMatters: 'Validacao compativel exige contexto fixo.',
                stillUsefulAs: 'practice',
                ctas: ['Reparar contexto'],
                reasonCodes: ['variable_changed'],
            },
        });
        const handoff = buildSprayLabCoachHandoff({ session: incompatibleSession });

        expect(handoff?.technicalProofState).toBe('blocked');
        expect(handoff?.nextAction.kind).toBe('repair_capture');
        expect(handoff?.blockerReasons.join(' ')).toContain('Mira ou distancia mudou');
    });

    it('keeps blocked validation clips inconclusive', () => {
        const blockedSession = session({
            status: 'blocked',
            validationStatus: 'inconclusivo',
            repairState: {
                type: 'clip_inconclusivo',
                title: 'Clip inconclusivo',
                whatHappened: 'Tracking insuficiente no clip de validacao.',
                whyItMatters: 'Sem cobertura suficiente, a validacao nao vira prova tecnica.',
                stillUsefulAs: 'practice',
                ctas: ['Repetir validacao'],
                reasonCodes: ['capture_blocker'],
            },
        });
        const handoff = buildSprayLabCoachHandoff({ session: blockedSession });

        expect(handoff?.technicalProofState).toBe('inconclusive');
        expect(handoff?.nextAction.kind).toBe('repair_capture');
        expect(handoff?.summary).not.toContain('melhora comprovada');
    });

    it('keeps Free runner value without Pro benchmark audit claims', () => {
        const handoff = buildSprayLabCoachHandoff({ session: session() });

        expect(handoff?.nextAction.href).toBe('/analyze?mode=validation&labSessionId=lab-vertical&protocolId=protocol-vertical');
        expect(handoff?.summary).toContain('nao confirma melhora tecnica');
        expect(handoff?.coachSignals.some((signal) => signal.key.includes('validated'))).toBe(false);
    });

    it('keeps Pro benchmark audit bounded to validated evidence', () => {
        const proSession = session({
            validationStatus: 'sinal_promissor',
            validationLink: validation('sinal_promissor'),
            index: {
                ...session().index!,
                state: 'sinal_promissor',
                evidenceLevel: 'validated_benchmark',
                validationStatus: 'sinal_promissor',
                validatedScore: 84,
            },
        });
        const handoff = buildSprayLabCoachHandoff({
            session: proSession,
            benchmark: benchmark(proSession),
            transfers: [{
                situation: 'TDM curta',
                result: 'controle percebido melhor',
                countsAsTechnicalValidation: false,
                createdAt: '2026-05-08T10:45:00.000Z',
            }],
        });

        expect(handoff?.compatibleClipProof.countsAsTechnicalProof).toBe(true);
        expect(handoff?.practicalTransfer.countsAsTechnicalProof).toBe(false);
        expect(handoff?.validatedScore).toBe(84);
    });
});
