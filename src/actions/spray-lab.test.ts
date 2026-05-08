import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSprayLabSessionFromProtocol } from '@/core/spray-lab-session';
import type {
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
    SprayLabFidelityReport,
    SprayLabSessionEvent,
    SprayLabSessionSnapshot,
} from '@/types/engine';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const values = vi.fn();
    const update = vi.fn();
    const set = vi.fn();
    const updateWhere = vi.fn();
    const revalidatePath = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        orderBy,
        insert,
        values,
        update,
        set,
        updateWhere,
        revalidatePath,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        update: mocks.update,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

import {
    completeSprayLabSessionAction,
    createSprayLabSessionAction,
    createSprayLabValidationLinkAction,
    getActiveSprayLabSessionAction,
    getSprayLabSessionAction,
    recordSprayLabSessionEventAction,
    resolveSprayLabValidationTargetAction,
} from './spray-lab';

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

function labSnapshot(overrides: Partial<SprayLabSessionSnapshot> = {}): SprayLabSessionSnapshot {
    const snapshot = createSprayLabSessionFromProtocol({
        protocol: completeProtocol(),
        sessionId: 'lab-session-1',
        baseAnalysisId: 'analysis-1',
        createdAt: '2026-05-08T05:10:00.000Z',
    });

    return {
        ...snapshot,
        ...overrides,
    };
}

function completeProgress(snapshot: SprayLabSessionSnapshot): SprayLabSessionSnapshot {
    return {
        ...snapshot,
        status: 'active',
        completedReps: snapshot.totalReps,
        completedSprays: snapshot.totalSprays,
        blocks: snapshot.blocks.map((block) => ({
            ...block,
            completedReps: block.repCount,
            completedSprays: block.repCount * block.spraysPerRep,
        })),
    };
}

function practiceOnlyFidelity(sessionId = 'lab-session-1'): SprayLabFidelityReport {
    return {
        version: 'spray-lab-v1',
        sessionId,
        tier: 'practice_only',
        score: 62,
        components: [],
        reasonCodes: ['variable_changed'],
        evidenceLevel: 'practice',
        benchmarkEligible: false,
        safetyDowngrade: false,
        coachImpactCopy: 'Sessao fica como pratica.',
        repairCtas: ['Repita sem trocar variavel.'],
    };
}

function precisionTrend(label: PrecisionTrendSummary['label'] = 'validated_progress'): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: null as never,
        current: null as never,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.9,
        nextValidationHint: 'Consolidar contexto antes de trocar variavel.',
    };
}

function labRow(snapshot: SprayLabSessionSnapshot) {
    return {
        id: snapshot.id,
        userId: 'user-1',
        baseAnalysisSessionId: snapshot.baseAnalysisId ?? 'analysis-1',
        protocolRevisionId: null,
        protocolId: snapshot.protocolId,
        laneId: snapshot.lane.id,
        contextKey: snapshot.contextKey,
        status: snapshot.status,
        snapshot,
    };
}

function eventRow(event: SprayLabSessionEvent) {
    return {
        payload: { event },
        createdAt: new Date(event.occurredAt),
    };
}

function mockDbChains() {
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({
        limit: mocks.limit,
        orderBy: mocks.orderBy,
    });
    mocks.orderBy.mockReturnValue({ limit: mocks.limit });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.updateWhere });
    mocks.values.mockResolvedValue(undefined);
    mocks.updateWhere.mockResolvedValue(undefined);
}

describe('spray lab actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbChains();
        mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('rejects unauthenticated session creation', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await createSprayLabSessionAction({
            baseAnalysisSessionId: 'analysis-1',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('creates a Lab session from an owned saved analysis and preserves protocol context', async () => {
        const protocol = completeProtocol();
        mocks.limit.mockResolvedValueOnce([{
            id: 'analysis-1',
            fullResult: {
                coachPlan: {
                    completeProtocol: protocol,
                },
            },
        }]);

        const result = await createSprayLabSessionAction({
            baseAnalysisSessionId: 'analysis-1',
            protocolId: protocol.id,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.contextKey : '').toContain('weapon:beryl-m762');
        expect(result.success ? result.value.contextKey : '').toContain('optic:scope-3x');
        expect(result.success ? result.value.baseAnalysisId : null).toBe('analysis-1');
        expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            baseAnalysisSessionId: 'analysis-1',
            protocolId: 'protocol-vertical-1',
            laneId: 'spray-lab-vertical-sustain',
            contextKey: expect.stringContaining('distance:50m'),
        }));
    });

    it('loads an owned Lab session snapshot for the runner route', async () => {
        const snapshot = labSnapshot();
        mocks.limit.mockResolvedValueOnce([labRow(snapshot)]);

        const result = await getSprayLabSessionAction({
            labSessionId: snapshot.id,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.id : null).toBe(snapshot.id);
        expect(result.success ? result.value.protocol.context.weaponId : null).toBe('beryl-m762');
    });

    it('keeps a completed source-session Lab open so validation buttons do not reset the runner', async () => {
        const completed = labSnapshot({
            status: 'completed',
            act: 'fechar_resultado',
            stepState: 'resultado',
        });
        mocks.limit.mockResolvedValueOnce([{ snapshot: completed }]);

        const result = await getActiveSprayLabSessionAction({
            baseAnalysisSessionId: 'analysis-1',
        });

        expect(result).toEqual({
            success: true,
            value: completed,
        });
        expect(mocks.orderBy).toHaveBeenCalled();
    });

    it('rejects events that would mutate a completed session', async () => {
        mocks.limit.mockResolvedValueOnce([{
            id: 'lab-session-1',
            userId: 'user-1',
            baseAnalysisSessionId: 'analysis-1',
            protocolRevisionId: null,
            protocolId: 'protocol-vertical-1',
            laneId: 'spray-lab-vertical-sustain',
            contextKey: 'ctx',
            status: 'completed',
            snapshot: labSnapshot({
                status: 'completed',
                stepState: 'resultado',
                act: 'fechar_resultado',
            }),
        }]);

        const result = await recordSprayLabSessionEventAction({
            labSessionId: 'lab-session-1',
            event: {
                id: 'event-new-spray',
                type: 'spray_start',
                occurredAt: '2026-05-08T05:12:00.000Z',
            },
        });

        expect(result).toEqual({
            success: false,
            error: 'Transicao Lab invalida para o estado atual.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('denies validation target resolution when the Lab session is not owned by the user', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await resolveSprayLabValidationTargetAction({
            labSessionId: 'other-user-lab',
        });

        expect(result).toEqual({
            success: false,
            error: 'Alvo de validacao nao encontrado.',
        });
    });

    it('resolves validation target with preloadable context for Analyze validation mode', async () => {
        const snapshot = labSnapshot();
        mocks.limit.mockResolvedValueOnce([labRow(snapshot)]);

        const result = await resolveSprayLabValidationTargetAction({
            labSessionId: snapshot.id,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value : null).toEqual(expect.objectContaining({
            labSessionId: snapshot.id,
            baseAnalysisSessionId: 'analysis-1',
            weaponId: 'beryl-m762',
            opticId: 'scope-3x',
            distanceMeters: 50,
            distanceMode: 'exact',
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'none',
            sensitivityProfile: 'balanced',
            patchVersion: '36.1',
        }));
    });

    it('composes and persists a benchmark snapshot when completing a Lab session', async () => {
        const snapshot = completeProgress(labSnapshot({
            eventIds: ['event-start', 'event-ready'],
        }));
        mocks.limit.mockResolvedValueOnce([labRow(snapshot)]);
        mocks.orderBy.mockResolvedValueOnce([
            eventRow({
                id: 'event-start',
                sessionId: snapshot.id,
                type: 'start',
                occurredAt: '2026-05-08T05:11:00.000Z',
            }),
            eventRow({
                id: 'event-ready',
                sessionId: snapshot.id,
                type: 'ready',
                occurredAt: '2026-05-08T05:12:00.000Z',
            }),
        ]);

        const result = await completeSprayLabSessionAction({
            labSessionId: snapshot.id,
            occurredAt: '2026-05-08T05:20:00.000Z',
        });

        expect(result.success).toBe(true);
        const benchmarkInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => 'eligibleForReleaseBenchmark' in value);

        expect(benchmarkInsert).toEqual(expect.objectContaining({
            userId: 'user-1',
            labSessionId: snapshot.id,
            baseAnalysisSessionId: 'analysis-1',
            evidenceLevel: 'provisional_benchmark',
            validationStatus: 'not_requested',
            eligibleForReleaseBenchmark: false,
        }));
    });

    it('keeps practice-only fidelity out of validated benchmark even when validation trend is positive', async () => {
        const completed = labSnapshot({
            status: 'completed',
            act: 'fechar_resultado',
            stepState: 'resultado',
            fidelity: practiceOnlyFidelity(),
        });
        mocks.limit
            .mockResolvedValueOnce([labRow(completed)])
            .mockResolvedValueOnce([{ id: 'analysis-1', fullResult: null }])
            .mockResolvedValueOnce([{
                id: 'validation-1',
                fullResult: {
                    precisionTrend: precisionTrend('validated_progress'),
                },
            }]);

        const result = await createSprayLabValidationLinkAction({
            labSessionId: completed.id,
            validationAnalysisSessionId: 'validation-1',
            confirmedVariables: true,
        });

        expect(result.success ? result.value.status : null).toBe('validacao_confirmada');

        const updateSet = mocks.set.mock.calls[0]?.[0] as { snapshot?: SprayLabSessionSnapshot } | undefined;
        expect(updateSet?.snapshot?.index?.evidenceLevel).toBe('practice');
        expect(updateSet?.snapshot?.index).not.toHaveProperty('validatedScore');

        const benchmarkInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => 'eligibleForReleaseBenchmark' in value);
        expect(benchmarkInsert).toEqual(expect.objectContaining({
            evidenceLevel: 'practice',
            validationStatus: 'validacao_confirmada',
            eligibleForReleaseBenchmark: false,
        }));
    });

    it('records changed validation variables as non-compatible and preserves base Lab clip IDs', async () => {
        const completed = labSnapshot({
            status: 'completed',
            act: 'fechar_resultado',
            stepState: 'resultado',
            fidelity: practiceOnlyFidelity(),
        });
        mocks.limit
            .mockResolvedValueOnce([labRow(completed)])
            .mockResolvedValueOnce([{ id: 'analysis-1', fullResult: null }]);

        const result = await createSprayLabValidationLinkAction({
            labSessionId: completed.id,
            confirmedVariables: false,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value : null).toEqual(expect.objectContaining({
            labSessionId: completed.id,
            baseAnalysisId: 'analysis-1',
            status: 'nao_compativel',
            confirmedVariables: false,
            blockers: [expect.objectContaining({
                code: 'evidence_mismatch',
                field: 'variables',
            })],
        }));

        const linkInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => value.status === 'nao_compativel');
        expect(linkInsert).toEqual(expect.objectContaining({
            labSessionId: completed.id,
            baseAnalysisSessionId: 'analysis-1',
            status: 'nao_compativel',
            confirmedVariables: false,
        }));
    });
});
