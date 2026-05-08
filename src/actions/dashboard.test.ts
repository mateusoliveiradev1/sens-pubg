import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, CoachPlan } from '@/types/engine';

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
    },
}));

import { buildDashboardActiveCoachLoop } from './dashboard-active-coach-loop';

function createCoachPlan(overrides: Partial<CoachPlan> = {}): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Teste controlado.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Spray subindo.',
            priorityScore: 0.7,
            severity: 4,
            confidence: 0.82,
            coverage: 0.84,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [{
            id: 'vertical-control-drill-protocol',
            kind: 'drill',
            instruction: 'Faca bloco curto.',
            expectedEffect: 'Validar controle vertical.',
            risk: 'low',
            applyWhen: 'Quando a captura estiver usavel.',
        }],
        nextBlock: {
            title: 'Bloco curto de teste de controle vertical',
            durationMinutes: 12,
            steps: ['Faca 3 sprays comparaveis.'],
            checks: [{
                label: 'Validacao de controle vertical',
                target: 'reduzir erro vertical',
                minimumCoverage: 0.7,
                minimumConfidence: 0.7,
                successCondition: 'Controle melhora.',
                failCondition: 'Controle nao melhora.',
            }],
        },
        stopConditions: [],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function createResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        id: 'analysis-1',
        historySessionId: 'session-1',
        timestamp: new Date('2026-05-05T12:00:00.000Z'),
        patchVersion: '36.1',
        trajectory: {} as AnalysisResult['trajectory'],
        loadout: {} as AnalysisResult['loadout'],
        metrics: {} as AnalysisResult['metrics'],
        diagnoses: [],
        sensitivity: {} as AnalysisResult['sensitivity'],
        coaching: [],
        coachPlan: createCoachPlan(),
        coachDecisionSnapshot: {
            tier: 'test_protocol',
            primaryFocusArea: 'vertical_control',
            primaryFocusTitle: 'Controle vertical',
            secondaryFocusAreas: [],
            protocolId: 'vertical-control-drill-protocol',
            validationTarget: 'reduzir erro vertical',
            memorySummary: 'Memoria compativel ainda curta.',
            outcomeMemory: {
                activeLayer: 'none',
                strictCompatible: {
                    source: 'strict_compatible',
                    outcomeCount: 0,
                    pendingCount: 0,
                    neutralCount: 0,
                    weakSelfReportCount: 0,
                    confirmedCount: 0,
                    invalidCount: 0,
                    conflictCount: 0,
                    repeatedFailureCount: 0,
                    staleOutcomeCount: 0,
                    technicalEvidenceCount: 0,
                    focusAreas: [],
                    confidence: 0,
                    summary: 'Sem outcome compativel.',
                },
                globalFallback: {
                    source: 'global_fallback',
                    outcomeCount: 0,
                    pendingCount: 0,
                    neutralCount: 0,
                    weakSelfReportCount: 0,
                    confirmedCount: 0,
                    invalidCount: 0,
                    conflictCount: 0,
                    repeatedFailureCount: 0,
                    staleOutcomeCount: 0,
                    technicalEvidenceCount: 0,
                    focusAreas: [],
                    confidence: 0,
                    summary: 'Sem outcome global.',
                },
                pendingCount: 0,
                neutralCount: 0,
                confirmedCount: 0,
                invalidCount: 0,
                conflictCount: 0,
                repeatedFailureCount: 0,
                staleOutcomeCount: 0,
                confidence: 0,
                summary: 'Sem outcome compativel.',
            },
            outcomeEvidenceState: 'none',
            conflicts: [],
            blockerReasons: [],
            createdAt: '2026-05-05T12:00:00.000Z',
        },
        ...overrides,
    };
}

describe('dashboard active coach loop model', () => {
    it('creates a pending dashboard loop when the latest saved coach plan has no outcome yet', () => {
        const loop = buildDashboardActiveCoachLoop({
            sessionId: 'session-1',
            result: createResult(),
            latestOutcome: null,
        });

        expect(loop).toMatchObject({
            status: 'pending',
            ctaLabel: 'Continuar protocolo',
            ctaHref: '/history/session-1',
            primaryFocusTitle: 'Controle vertical',
            memorySummary: 'Memoria compativel ainda curta.',
        });
    });

    it('routes outcome/trend conflict to validation instead of a stronger coach action', () => {
        const loop = buildDashboardActiveCoachLoop({
            sessionId: 'session-1',
            result: createResult(),
            latestOutcome: {
                status: 'improved',
                evidenceStrength: 'conflict',
                conflictPayload: { reason: 'conflict' },
                createdAt: new Date('2026-05-05T12:10:00.000Z'),
            },
        });

        expect(loop).toMatchObject({
            status: 'conflict',
            statusLabel: 'Resultado em conflito',
            ctaLabel: 'Gravar validacao compativel',
            ctaHref: '/analyze',
        });
        expect(loop?.body).not.toContain('Aplicar');
    });

    it('keeps Free dashboard payload on compact projection instead of exposing full Pro protocol audit', () => {
        const source = readFileSync(new URL('./dashboard.ts', import.meta.url), 'utf8');

        expect(source).toMatch(/const activeLoopVisible = access\.features\['coach\.validation_loop'\]\.granted\s*\|\| Boolean\(activeCoachLoop\?\.sprayLab\)/);
        expect(source).toMatch(/activeCoachLoop: activeLoopVisible \? activeCoachLoop : null/);
        expect(source).toMatch(/premiumProjection: createPremiumProjectionSummary\(access, latestTruthResult \?\? undefined\)/);
        expect(source).not.toMatch(/activeCoachLoop: activeCoachLoop/);
        expect(source).not.toMatch(/timer|sessionRunner|benchmarkRunner/);
    });

    it('loads the active Ciclo Pro cycle through server-owned projection for dashboard now-state', () => {
        const source = readFileSync(new URL('./dashboard.ts', import.meta.url), 'utf8');

        expect(source).toMatch(/getActiveTrainingProgramCycleAction/);
        expect(source).toMatch(/projectTrainingProgramForAccess/);
        expect(source).toMatch(/buildDashboardActiveTrainingProgram/);
        expect(source).toMatch(/activeTrainingProgramProjection/);
        expect(source).toMatch(/activeTrainingProgram,/);
        expect(source).toMatch(/currentWeekLabel: `Semana \$\{mission\.weekNumber\} de 4`/);
        expect(source).toMatch(/currentMissionTitle: mission\.title/);
        expect(source).toMatch(/visibleAdaptationReason/);
        expect(source).toMatch(/blockerCount/);
        expect(source).toMatch(/evidenceStatus/);
        expect(source).toMatch(/primaryCtaLabel: mission\.proximoCta\.label/);
        expect(source).toMatch(/programCtaLabel: 'Abrir Ciclo Pro'/);
        expect(source).toMatch(/lockState/);
        expect(source).toMatch(/projection\.canSeeFullThirtyDayCycle/);
        expect(source).not.toMatch(/activeTrainingProgram: activeProgramCycle/);
    });
});
