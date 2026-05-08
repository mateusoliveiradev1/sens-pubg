import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSprayLabSessionFromProtocol } from '@/core/spray-lab-session';
import type { CompleteTrainingProtocol, SprayLabSessionSnapshot } from '@/types/engine';

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
    createSprayLabSessionAction,
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
});
