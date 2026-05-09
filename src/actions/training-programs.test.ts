import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveAnalysisDecision } from '@/core/analysis-decision';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import { createAnalysisResultFixture } from '@/core/coach-test-fixtures';
import { buildTrainingProgramTechnicalCheckpoint } from '@/core/training-program-checkpoints';
import { createTrainingProgramCycle } from '@/core/training-programs';
import type { TrainingProgramCycleRow } from '@/db/schema';
import { resolveProductAccess } from '@/lib/product-entitlements';
import { projectTrainingProgramForAccess } from '@/lib/training-program-projection';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    SprayLabValidationLink,
} from '@/types/engine';
import type { TrainingProgramCycleSnapshot } from '@/types/training-programs';

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
    completeTrainingProgramMissionAction,
    createTrainingProgramCycleAction,
    getActiveTrainingProgramCycleAction,
    getTrainingProgramCycleAction,
    pauseTrainingProgramCycleAction,
    recordTrainingProgramCheckpointAction,
    reenterTrainingProgramCycleAction,
} from './training-programs';

const NOW = '2026-05-08T22:00:00.000Z';

function savedAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return createAnalysisResultFixture({
        historySessionId: 'analysis-1',
        analysisDecision: resolveAnalysisDecision({
            confidence: 0.88,
            coverage: 0.86,
            commercialEvidence: true,
        }),
        mastery: {
            actionState: 'ready',
            actionLabel: 'Pronto',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: 78,
            mechanicalScore: 76,
            pillars: {
                control: 77,
                consistency: 75,
                confidence: 88,
                clipQuality: 84,
            },
            evidence: {
                coverage: 0.86,
                confidence: 0.88,
                visibleFrames: 30,
                lostFrames: 2,
                framesProcessed: 32,
                sampleSize: 30,
                qualityScore: 84,
                usableForAnalysis: true,
            },
            reasons: [],
            blockedRecommendations: [],
        },
        ...overrides,
    });
}

function protocolFor(result: AnalysisResult): CompleteTrainingProtocol {
    const protocol = buildCoachPlan({ analysisResult: result }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return protocol;
}

function fullResultWithProtocol(result = savedAnalysis()): Record<string, unknown> {
    return {
        ...result,
        coachPlan: {
            ...result.coachPlan,
            completeProtocol: protocolFor(result),
        },
    } as unknown as Record<string, unknown>;
}

function cycleSnapshot(): TrainingProgramCycleSnapshot {
    const analysis = savedAnalysis();

    return createTrainingProgramCycle({
        analysisResult: analysis,
        protocol: protocolFor(analysis),
        now: NOW,
    });
}

function cycleRow(cycle = cycleSnapshot()): TrainingProgramCycleRow {
    return {
        id: cycle.id,
        userId: 'user-1',
        baseAnalysisSessionId: 'analysis-1',
        protocolRevisionId: null,
        protocolId: cycle.evidenceSummary.protocolId ?? null,
        activeLineId: cycle.activeLine?.lineId ?? null,
        activeLineContextKey: cycle.activeLine?.contextKey ?? cycle.strictContextKey,
        strictContextKey: cycle.strictContextKey,
        kind: cycle.kind,
        state: cycle.state,
        currentWeekNumber: cycle.currentWeekNumber,
        currentMissionId: cycle.currentMissionId,
        recoveryAction: cycle.recoveryAction,
        reasonCodes: cycle.reasonCodes,
        visibleReason: 'Base salva com contexto.',
        blockerSummary: 'Sem blocker ativo no ciclo.',
        snapshot: cycle,
        payload: { snapshot: cycle },
        createdAt: new Date(cycle.createdAt),
        updatedAt: new Date(cycle.updatedAt),
        archivedAt: null,
        completedAt: null,
    };
}

function validationLink(status: SprayLabValidationLink['status'] = 'validacao_confirmada'): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: 'validation-1',
        labSessionId: 'lab-1',
        baseAnalysisId: 'analysis-1',
        validationAnalysisId: 'validation-analysis-1',
        contextKey: 'program:context',
        targetCopy: 'Beryl 3x 50m',
        status,
        confirmedVariables: true,
        blockers: [],
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function cycleWithTechnicalCheckpoint(includeArchivedLine = false): TrainingProgramCycleSnapshot {
    const cycle = cycleSnapshot();
    const technical = buildTrainingProgramTechnicalCheckpoint({
        cycle,
        evidenceSummary: {
            ...cycle.evidenceSummary,
            validationLink: validationLink('validacao_confirmada'),
            validationStatus: 'validacao_confirmada',
            blockers: [],
            summary: 'Validacao compativel anexada ao ciclo.',
        },
        now: NOW,
    });

    if (!technical || !cycle.activeLine) {
        throw new Error('Expected technical checkpoint and active line');
    }

    return {
        ...cycle,
        state: 'progresso_validado',
        archivedLines: includeArchivedLine ? [{
            ...cycle.activeLine,
            active: false,
            archivedAt: '2026-05-08T21:00:00.000Z',
            restartReasonCodes: ['line_restart'],
        }] : [],
        checkpoints: [technical],
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

describe('training program actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbChains();
        mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('rejects unauthenticated cycle creation', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await createTrainingProgramCycleAction({
            baseAnalysisSessionId: 'analysis-1',
            now: NOW,
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('creates a full Ciclo Pro only from an owned saved analysis and persists graph rows', async () => {
        mocks.limit
            .mockResolvedValueOnce([{ id: 'analysis-1', fullResult: fullResultWithProtocol() }])
            .mockResolvedValueOnce([]);

        const result = await createTrainingProgramCycleAction({
            baseAnalysisSessionId: 'analysis-1',
            now: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.kind : null).toBe('ciclo_pro');
        expect(result.success ? result.value.weeks : []).toHaveLength(4);

        const insertedValues = mocks.values.mock.calls.map(([value]) => value);
        expect(insertedValues[0]).toEqual(expect.objectContaining({
            userId: 'user-1',
            baseAnalysisSessionId: 'analysis-1',
            kind: 'ciclo_pro',
            state: 'ativo',
        }));
        expect(insertedValues[1]).toHaveLength(4);
        expect(insertedValues[2]).toHaveLength(28);
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/ciclo-pro');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('denies loading another user cycle through ownership predicates', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await getTrainingProgramCycleAction({
            cycleId: 'other-cycle',
        });

        expect(result).toEqual({
            success: false,
            error: 'Ciclo Pro nao encontrado.',
        });
    });

    it('loads an active projection-ready snapshot for route/dashboard use', async () => {
        const cycle = cycleSnapshot();
        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await getActiveTrainingProgramCycleAction();

        expect(result.success).toBe(true);
        const projection = projectTrainingProgramForAccess({
            access: resolveProductAccess({
                now: new Date(NOW),
                subscription: {
                    status: 'active',
                    tier: 'pro',
                    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
                },
            }),
            cycle: result.success ? result.value : null,
        });

        expect(projection.fullCycle?.currentMissionId).toBe(cycle.currentMissionId);
        expect(projection.fullCycle?.weeks[0]?.missions[0]?.proximoCta.href).toContain('/spray-lab');
        expect(projection.evidence?.summary).toContain('Base salva');
    });

    it('does not let a client skip the current repair or mission blocker', async () => {
        const cycle = cycleSnapshot();
        const skippedMission = cycle.weeks[0]?.missions[1]?.id;

        if (!skippedMission) {
            throw new Error('Expected second mission');
        }

        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await completeTrainingProgramMissionAction({
            cycleId: cycle.id,
            missionId: skippedMission,
        });

        expect(result).toEqual({
            success: false,
            error: 'Conclua a missao atual antes de pular blockers do ciclo.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('blocks technical progress checkpoints without compatible validation evidence', async () => {
        const cycle = cycleSnapshot();
        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await recordTrainingProgramCheckpointAction({
            cycleId: cycle.id,
            layer: 'technical_validated',
            occurredAt: NOW,
        });

        expect(result).toEqual({
            success: false,
            error: 'Checkpoint tecnico exige validacao compativel confirmada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('records a technical checkpoint only from an owned compatible validation link', async () => {
        const cycle = cycleSnapshot();
        mocks.limit
            .mockResolvedValueOnce([cycleRow(cycle)])
            .mockResolvedValueOnce([{
                id: 'validation-1',
                labSessionId: 'lab-1',
                baseAnalysisSessionId: 'analysis-1',
                payload: validationLink('validacao_confirmada'),
            }]);

        const result = await recordTrainingProgramCheckpointAction({
            cycleId: cycle.id,
            layer: 'technical_validated',
            validationLinkId: 'validation-1',
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.state : null).toBe('progresso_validado');

        const checkpointInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => value.layer === 'technical_validated');

        expect(checkpointInsert).toEqual(expect.objectContaining({
            userId: 'user-1',
            cycleId: cycle.id,
            validationLinkId: 'validation-1',
            outcome: 'progress_validated',
        }));
    });

    it('persists monthly completion with checkpoint audit', async () => {
        const cycle = cycleWithTechnicalCheckpoint();
        mocks.limit
            .mockResolvedValueOnce([cycleRow(cycle)])
            .mockResolvedValueOnce([{
                id: 'validation-1',
                labSessionId: 'lab-1',
                baseAnalysisSessionId: 'analysis-1',
                payload: validationLink('validacao_confirmada'),
            }]);

        const result = await recordTrainingProgramCheckpointAction({
            cycleId: cycle.id,
            layer: 'monthly_program',
            validationLinkId: 'validation-1',
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.state : null).toBe('concluido');
        expect(result.success ? result.value.currentMissionId : 'not-null').toBeNull();
        expect(result.success ? result.value.checkpoints.some((checkpoint) => checkpoint.layer === 'monthly_program') : false)
            .toBe(true);
    });

    it('keeps monthly archived-line checkpoints honest with old line references', async () => {
        const cycle = cycleWithTechnicalCheckpoint(true);
        mocks.limit
            .mockResolvedValueOnce([cycleRow(cycle)])
            .mockResolvedValueOnce([{
                id: 'validation-1',
                labSessionId: 'lab-1',
                baseAnalysisSessionId: 'analysis-1',
                payload: validationLink('validacao_confirmada'),
            }]);

        const result = await recordTrainingProgramCheckpointAction({
            cycleId: cycle.id,
            layer: 'monthly_program',
            validationLinkId: 'validation-1',
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.state : null).toBe('linha_reiniciada');
        expect(result.success ? result.value.archivedLines : []).toHaveLength(1);
        expect(result.success ? result.value.checkpoints.at(-1)?.outcome : null).toBe('line_restarted');
    });

    it('reenters missed or changed context as evidence preservation instead of fake progress', async () => {
        const cycle = cycleSnapshot();
        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await reenterTrainingProgramCycleAction({
            cycleId: cycle.id,
            variableChanged: true,
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.state : null).toBe('linha_reiniciada');
        expect(result.success ? result.value.reasonCodes : []).toContain('line_restart');

        const eventInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => value.eventType === 'variable_changed');

        expect(eventInsert).toEqual(expect.objectContaining({
            reasonCodes: ['variable_changed'],
        }));
    });

    it('keeps missed-day reentry reason visible in the durable snapshot', async () => {
        const cycle = cycleSnapshot();
        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await reenterTrainingProgramCycleAction({
            cycleId: cycle.id,
            missedDays: 2,
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        const latestEvent = result.success ? result.value.transitionEvents.at(-1) : null;
        expect(latestEvent?.reasonCodes).toContain('missed_day_reentry');
        expect(latestEvent?.userVisibleReason).toContain('reencaixado');
    });

    it('pauses discomfort as a safety/recovery reason without storing medical notes', async () => {
        const cycle = cycleSnapshot();
        mocks.limit.mockResolvedValueOnce([cycleRow(cycle)]);

        const result = await pauseTrainingProgramCycleAction({
            cycleId: cycle.id,
            reasonCode: 'discomfort_stop',
            occurredAt: NOW,
        });

        expect(result.success).toBe(true);
        expect(result.success ? result.value.state : null).toBe('pausado');
        expect(result.success ? result.value.state : null).not.toBe('regressao_validada');

        const eventInsert = mocks.values.mock.calls
            .map(([value]) => value as Record<string, unknown>)
            .find((value) => value.eventType === 'discomfort_reported');

        expect(eventInsert).toEqual(expect.objectContaining({
            reasonCodes: ['discomfort_stop'],
            payload: {
                event: expect.not.objectContaining({
                    note: expect.anything(),
                }),
            },
        }));
    });

    it('keeps Ciclo Pro Social Pro handoffs source-ID based and delegated to gated server actions', () => {
        const pageSource = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/page.tsx'), 'utf8');
        const viewModelSource = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/ciclo-pro-view-model.ts'), 'utf8');
        const reportActionSource = readFileSync(join(process.cwd(), 'src/actions/social-pro-reports.ts'), 'utf8');
        const libraryActionSource = readFileSync(join(process.cwd(), 'src/actions/social-pro-library.ts'), 'utf8');

        expect(pageSource).toContain('createSocialProReportAction');
        expect(pageSource).toContain('saveSocialProLibraryItem');
        expect(pageSource).toContain('sourceTrainingProgramCycleId');
        expect(pageSource).toContain('program_mission');
        expect(viewModelSource).toContain('sourceTrainingProgramCycleId');
        expect(viewModelSource).toContain('Social Pro do Ciclo Pro');
        expect(viewModelSource).not.toContain('cycleSnapshot');
        expect(reportActionSource).toContain("requireSocialProCapability('create_report')");
        expect(reportActionSource).toContain('eq(trainingProgramCycles.userId, userId)');
        expect(libraryActionSource).toContain("kind === 'program_mission'");
        expect(libraryActionSource).toContain('eq(trainingProgramMissions.userId, ownerUserId)');
    });
});
