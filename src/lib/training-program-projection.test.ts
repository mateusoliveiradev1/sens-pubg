import { describe, expect, it } from 'vitest';

import { resolveAnalysisDecision } from '@/core/analysis-decision';
import { buildCoachPlan } from '@/core/coach-plan-builder';
import { createAnalysisResultFixture } from '@/core/coach-test-fixtures';
import { buildTrainingProgramWeeklyCheckpoint } from '@/core/training-program-checkpoints';
import { createTrainingProgramCycle } from '@/core/training-programs';
import { resolveProductAccess } from './product-entitlements';
import { projectTrainingProgramForAccess } from './training-program-projection';
import type { AnalysisResult, CompleteTrainingProtocol } from '@/types/engine';
import type { TrainingProgramCycleSnapshot } from '@/types/training-programs';

const now = new Date('2026-05-08T22:30:00.000Z');

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

function programCycle(): TrainingProgramCycleSnapshot {
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
    };
}

describe('training program Free/Pro projection', () => {
    it('keeps Free useful with one real basic mission and no fake hidden 30-day data', () => {
        const cycle = programCycle();
        const projection = projectTrainingProgramForAccess({
            access: resolveProductAccess({ now }),
            cycle,
        });

        expect(projection.canSeeNextStep).toBe(true);
        expect(projection.canUseGuidedWeekly).toBe(false);
        expect(projection.canUseGuidedMonthly).toBe(false);
        expect(projection.depth).toBe('basic_next_step');
        expect(projection.basicMission?.id).toBe(cycle.currentMissionId);
        expect(projection.basicMission?.agora).not.toHaveLength(0);
        expect(projection.evidence).toEqual(expect.objectContaining({
            confidence: 0.88,
            coverage: 0.86,
        }));
        expect(projection.fullCycle).toBeNull();
        expect(projection.locks).toEqual(expect.arrayContaining([
            expect.objectContaining({ featureKey: 'programs.guided_weekly' }),
            expect.objectContaining({ featureKey: 'programs.guided_monthly' }),
        ]));
    });

    it('projects the full adaptive and auditable 30-day cycle only from server-owned Pro access', () => {
        const cycle = programCycle();
        const projection = projectTrainingProgramForAccess({
            access: resolveProductAccess({
                now,
                subscription: {
                    status: 'active',
                    tier: 'pro',
                    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
                },
            }),
            cycle,
        });

        expect(projection.canUseGuidedWeekly).toBe(true);
        expect(projection.canUseGuidedMonthly).toBe(true);
        expect(projection.canSeeProgramAudit).toBe(true);
        expect(projection.fullCycle?.weeks).toHaveLength(4);
        expect(projection.fullCycle?.weeks.flatMap((week) => week.missions)).toHaveLength(28);
        expect(projection.fullCycle?.checkpoints).toHaveLength(1);
        expect(projection.fullCycle?.activeLine?.contextKey).toBe(cycle.activeLine?.contextKey);
        expect(projection.locks).toEqual([]);
    });

    it('describes original Sens PUBG value without API exclusivity or guaranteed improvement', () => {
        const projection = projectTrainingProgramForAccess({
            access: resolveProductAccess({ now }),
            cycle: programCycle(),
        });
        const copy = `${projection.freeValueCopy} ${projection.proValueCopy} ${projection.locks.map((lock) => lock.body).join(' ')}`;

        expect(copy).toContain('Ciclo Pro');
        expect(copy).toContain('evidencia');
        expect(copy).toContain('sem dados falsos');
        expect(copy).not.toMatch(/PUBG API.*exclusiv/i);
        expect(copy).not.toMatch(/garantid|rank|sensibilidade perfeita|perfect sensitivity/i);
    });
});
