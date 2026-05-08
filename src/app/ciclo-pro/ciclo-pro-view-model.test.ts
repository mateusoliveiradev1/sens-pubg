import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveAnalysisDecision } from '@/core/analysis-decision';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import { createAnalysisResultFixture } from '@/core/coach-test-fixtures';
import { buildTrainingProgramWeeklyCheckpoint } from '@/core/training-program-checkpoints';
import { createTrainingProgramCycle } from '@/core/training-programs';
import { resolveProductAccess } from '@/lib/product-entitlements';
import { projectTrainingProgramForAccess } from '@/lib/training-program-projection';
import type { AnalysisResult, CompleteTrainingProtocol } from '@/types/engine';
import type { TrainingProgramCycleSnapshot, TrainingProgramState } from '@/types/training-programs';
import { buildCicloProViewModel } from './ciclo-pro-view-model';

const now = new Date('2026-05-08T23:10:00.000Z');

function savedAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return createAnalysisResultFixture({
        historySessionId: 'analysis-ciclo-pro-1',
        analysisDecision: resolveAnalysisDecision({
            confidence: 0.9,
            coverage: 0.86,
            commercialEvidence: true,
        }),
        mastery: {
            actionState: 'ready',
            actionLabel: 'Pronto',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: 79,
            mechanicalScore: 77,
            pillars: {
                control: 78,
                consistency: 76,
                confidence: 90,
                clipQuality: 86,
            },
            evidence: {
                coverage: 0.86,
                confidence: 0.9,
                visibleFrames: 31,
                lostFrames: 2,
                framesProcessed: 33,
                sampleSize: 31,
                qualityScore: 86,
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

function programCycle(overrides: Partial<TrainingProgramCycleSnapshot> = {}): TrainingProgramCycleSnapshot {
    const analysis = savedAnalysis();
    const cycle = createTrainingProgramCycle({
        analysisResult: analysis,
        protocol: protocolFor(analysis),
        now: now.toISOString(),
    });
    const weekly = buildTrainingProgramWeeklyCheckpoint({
        cycle,
        now: now.toISOString(),
    });

    return {
        ...cycle,
        checkpoints: [weekly],
        ...overrides,
    };
}

function proAccess() {
    return resolveProductAccess({
        now,
        subscription: {
            status: 'active',
            tier: 'pro',
            currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
        },
    });
}

describe('Ciclo Pro view model', () => {
    it('keeps Free useful with one real basic mission and upgrade CTA', () => {
        const cycle = programCycle();
        const model = buildCicloProViewModel({
            projection: projectTrainingProgramForAccess({
                access: resolveProductAccess({ now }),
                cycle,
            }),
        });

        expect(model.routeState).toBe('locked');
        expect(model.freeMission?.id).toBe(cycle.currentMissionId);
        expect(model.freeMission?.agora).not.toHaveLength(0);
        expect(model.freeMission?.porQueImporta).not.toHaveLength(0);
        expect(model.freeMission?.oQueInvalida).not.toHaveLength(0);
        expect(model.freeMission?.evidenciaGerada).not.toHaveLength(0);
        expect(model.primaryAction).toEqual(expect.objectContaining({
            label: 'Desbloqueie o Ciclo Pro de 30 dias',
            href: '/pricing',
        }));
        expect(model.lock?.body).toContain('O Free te mostra o proximo passo');
        expect(model.programMap).toBeNull();
    });

    it('projects four Pro weeks with all missions and checkpoint layers', () => {
        const model = buildCicloProViewModel({
            projection: projectTrainingProgramForAccess({
                access: proAccess(),
                cycle: programCycle(),
            }),
        });

        expect(model.routeState).toBe('active');
        expect(model.programMap?.weeks).toHaveLength(4);
        expect(model.programMap?.weeks.flatMap((week) => week.missions)).toHaveLength(28);
        expect(model.programMap?.weeks.every((week) => week.missions.length === 7)).toBe(true);
        expect(model.programMap?.checkpoints).toEqual(expect.arrayContaining([
            expect.objectContaining({
                layerLabel: 'Checkpoint operacional semanal',
            }),
        ]));
        expect(model.evidenceItems.map((item) => item.label)).toEqual(expect.arrayContaining([
            'Confianca',
            'Cobertura',
            'Blocker',
        ]));
    });

    it.each([
        ['reparando', 'Reparo ativo'],
        ['consolidando', 'Consolidacao'],
        ['validacao_pendente', 'Validacao pendente'],
        ['regressao_validada', 'Regressao validada'],
        ['concluido', 'Ciclo concluido'],
    ] as const satisfies readonly [TrainingProgramState, string][])(
        'renders distinct %s state labels and reasons',
        (state, label) => {
            const base = programCycle();
            const cycle: TrainingProgramCycleSnapshot = {
                ...base,
                state,
                weeks: base.weeks.map((week, index) => index === 0
                    ? {
                        ...week,
                        state,
                        reasonCodes: ['fidelity_dropped'],
                        recoveryAction: state === 'concluido' ? 'consolidar' : 'reparar',
                    }
                    : week),
                reasonCodes: ['fidelity_dropped'],
                recoveryAction: state === 'concluido' ? 'consolidar' : 'reparar',
            };
            const model = buildCicloProViewModel({
                projection: projectTrainingProgramForAccess({
                    access: proAccess(),
                    cycle,
                }),
            });

            expect(model.stateLabel).toBe(label);
            expect(model.blockerLabel).toContain('Sem blocker ativo');
            expect(model.programMap?.repairPanels[0]?.reasonLabels[0]).toContain('fidelidade');
        },
    );

    it('keeps route copy away from static course, XP, global grade, and overclaim language', () => {
        const source = readFileSync(join(process.cwd(), 'src/app/ciclo-pro/ciclo-pro-view-model.ts'), 'utf8')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(source).toContain('ciclo pro');
        expect(source).toContain('validacao');
        expect(source).toContain('reparo');
        expect(source).toContain('consolidacao');
        expect(source).toContain('reencaixar');
        expect(source).not.toMatch(/\bcurso\b|\baula\b|\bxp\b|grind|melhora garantida|rank garantido|sensibilidade perfeita|nota global|global grade/);
    });
});
