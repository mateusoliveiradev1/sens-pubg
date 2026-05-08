import { describe, expect, it } from 'vitest';
import type {
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
    SprayLabBenchmarkSnapshot,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
} from '@/types/engine';

import { buildSprayLabCoachHandoff } from './spray-lab-coach-handoff';

function protocol(): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'stabilize_block',
        title: 'Beryl 3x vertical',
        summary: 'Controle vertical com contexto fixo.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl',
            weaponName: 'Beryl',
            opticId: '3x',
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
            patchVersion: '36.1',
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Reduzir subida vertical sem trocar variavel.',
        dose: {
            durationMinutes: 18,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 18,
        },
        target: 'Grupo vertical menor em 50m.',
        executionSteps: ['Preparar', 'Executar sprays', 'Fechar resultado'],
        preparation: [],
        validation: {
            compatibleClipChecklist: ['Beryl', '3x', '50m', 'mesma sensibilidade'],
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
        proSections: ['auditoria'],
        llmRewriteAllowed: false,
    };
}

function trend(label: PrecisionTrendSummary['label']): PrecisionTrendSummary {
    return {
        label,
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
    };
}

function session(overrides: Partial<SprayLabSessionSnapshot> = {}): SprayLabSessionSnapshot {
    const baseProtocol = protocol();

    return {
        version: 'spray-lab-v1',
        id: 'lab-1',
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
            sessionId: 'lab-1',
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
            id: 'index-1',
            sessionId: 'lab-1',
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

function validationLink(overrides: Partial<SprayLabValidationLink> = {}): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: 'validation-1',
        labSessionId: 'lab-1',
        baseAnalysisId: 'analysis-1',
        validationAnalysisId: 'analysis-2',
        contextKey: 'beryl|3x|50|vertical',
        targetCopy: 'Beryl 3x 50m',
        status: 'validacao_confirmada',
        confirmedVariables: true,
        blockers: [],
        precisionTrend: trend('validated_progress'),
        createdAt: '2026-05-08T10:30:00.000Z',
        updatedAt: '2026-05-08T10:30:00.000Z',
        ...overrides,
    };
}

describe('spray lab coach handoff', () => {
    it('keeps an unvalidated Lab session as execution evidence only', () => {
        const handoff = buildSprayLabCoachHandoff({
            session: session(),
        });

        expect(handoff).toMatchObject({
            technicalProofState: 'none',
            validatedScore: null,
            compatibleClipProof: {
                countsAsTechnicalProof: false,
            },
            nextAction: {
                kind: 'record_validation',
            },
        });
        expect(handoff?.summary).toContain('nao confirma melhora tecnica');
    });

    it('elevates context confidence only when compatible validation is strong', () => {
        const validatedSession = session({
            validationStatus: 'validacao_confirmada',
            index: {
                ...session().index!,
                state: 'progresso_validado',
                evidenceLevel: 'validated_benchmark',
                validationStatus: 'validacao_confirmada',
                validatedScore: 88,
                precisionTrend: trend('validated_progress'),
            },
            validationLink: validationLink(),
        });
        const benchmark: SprayLabBenchmarkSnapshot = {
            version: 'spray-lab-v1',
            id: 'benchmark-1',
            sessionId: 'lab-1',
            protocolId: 'protocol-1',
            laneId: 'lane-vertical',
            contextKey: 'beryl|3x|50|vertical',
            index: validatedSession.index!,
            fidelityTier: 'strong',
            evidenceLevel: 'validated_benchmark',
            validationStatus: 'validacao_confirmada',
            eligibleForReleaseBenchmark: true,
            blockerReasons: [],
            createdAt: '2026-05-08T10:30:00.000Z',
        };

        const handoff = buildSprayLabCoachHandoff({
            session: validatedSession,
            benchmark,
        });

        expect(handoff?.technicalProofState).toBe('confirmed_progress');
        expect(handoff?.confidence).toBeGreaterThanOrEqual(0.8);
        expect(handoff?.validatedScore).toBe(88);
        expect(handoff?.compatibleClipProof.countsAsTechnicalProof).toBe(true);
        expect(handoff?.coachSignals.some((signal) => signal.key === 'spray_lab.technical.confirmed_progress')).toBe(true);
    });

    it('keeps TDM and real-match records as practical transfer only', () => {
        const handoff = buildSprayLabCoachHandoff({
            session: session(),
            transfers: [{
                situation: 'TDM curta',
                result: 'segurou melhor em cover',
                countsAsTechnicalValidation: false,
                createdAt: '2026-05-08T11:00:00.000Z',
            }],
        });

        expect(handoff?.practicalTransfer).toMatchObject({
            count: 1,
            countsAsTechnicalProof: false,
        });
        expect(handoff?.compatibleClipProof.countsAsTechnicalProof).toBe(false);
        expect(handoff?.coachSignals.find((signal) => signal.key === 'spray_lab.transfer.practical')?.weight)
            .toBeLessThan(0.2);
    });
});
