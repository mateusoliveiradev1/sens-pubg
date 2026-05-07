import { describe, expect, it } from 'vitest';
import type { AnalysisResult, CoachPlan, CompleteTrainingProtocol } from '@/types/engine';

import {
    buildDashboardActiveCoachLoop,
    DASHBOARD_PROTOCOL_EVIDENCE_HIERARCHY_LABEL,
} from './dashboard-active-coach-loop';

function createCompleteProtocol(): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'complete-protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'stabilize_block',
        title: 'Trilho vertical M416 3x',
        summary: 'Controle vertical com variaveis fixas.',
        environment: 'training_mode',
        context: {
            weaponId: 'm416',
            weaponName: 'M416',
            opticId: '3x',
            opticName: '3x',
            distanceMeters: 50,
            distanceMode: 'exact',
            stance: 'crouching',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'tactical',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            patchVersion: '36.1',
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Segurar o recoil vertical sem trocar variavel.',
        dose: {
            durationMinutes: 18,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 18,
        },
        target: 'Grupo vertical mais compacto em 50m.',
        executionSteps: ['Aquece o padrao.', 'Faz sprays comparaveis.', 'Para se a execucao degradar.'],
        preparation: [{
            id: 'stop-pain',
            label: 'Parar se houver dor',
            reason: 'Dor, dormencia ou formigamento invalidam o bloco.',
            required: true,
            safetyKind: 'stop_rule',
        }],
        validation: {
            compatibleClipChecklist: [
                'Arma: M416',
                'Mira: 3x',
                'Distancia: 50m',
                'Mesma sensibilidade e grip vertical',
            ],
            minimumConfidence: 0.72,
            minimumCoverage: 0.7,
            successCriteria: ['Sucesso: reduzir subida vertical sem aumentar ruido horizontal.'],
            failCriteria: ['Falha: subir mais ou mudar variavel.'],
            variableControlChecklist: ['sensibilidade fixa', 'grip fixo'],
            nextClipCopy: 'Grave o proximo clip com M416 3x em 50m.',
        },
        transfer: {
            situationChecklist: ['TDM curta com M416 3x', 'Distancia aproximada 50m'],
            conservativeConfidenceCopy: 'Partida/TDM valida transferencia pratica, mas nao substitui clip compativel.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'apply_protocol',
            tierAfter: 'stabilize_block',
            reasons: ['insufficient_compatible_validation'],
            blockedFields: ['apply_protocol'],
            repairCtas: ['Gravar validacao compativel antes de aplicar mais forte.'],
            userCopy: 'Falta validacao compativel antes de aplicar protocolo forte.',
        },
        audit: {
            createdAt: '2026-05-07T12:00:00.000Z',
            analysisDecisionLevel: 'usable_analysis',
            primaryFocusArea: 'vertical_control',
            secondaryFocusAreas: [],
            confidence: 0.78,
            coverage: 0.74,
            source: 'deterministic_coach',
        },
        stopConditions: ['Dor, dormencia ou formigamento interrompe o bloco.'],
        continueCriteria: ['Sem dor e variaveis fixas.'],
        antiMixingNotes: ['Nao trocar sensibilidade no mesmo bloco.'],
        freeSummary: ['Treine vertical com M416 3x.'],
        proSections: ['dose', 'validacao', 'transferencia', 'auditoria'],
        llmRewriteAllowed: false,
    };
}

function createCoachPlan(): CoachPlan {
    return {
        tier: 'stabilize_block',
        sessionSummary: 'Estabilizar vertical.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Spray sobe no sustentado.',
            priorityScore: 0.8,
            severity: 4,
            confidence: 0.78,
            coverage: 0.74,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [{
            id: 'vertical-control-drill-protocol',
            kind: 'drill',
            instruction: 'Fazer bloco vertical curto.',
            expectedEffect: 'Melhorar controle vertical.',
            risk: 'low',
            applyWhen: 'Quando contexto estiver fixo.',
        }],
        nextBlock: {
            title: 'Bloco vertical M416 3x',
            durationMinutes: 18,
            steps: ['Fazer 4 reps.'],
            checks: [{
                label: 'Validacao vertical',
                target: 'reduzir subida',
                minimumCoverage: 0.7,
                minimumConfidence: 0.7,
                successCondition: 'Subida reduz sem trocar variavel.',
                failCondition: 'Subida piora ou variavel muda.',
            }],
        },
        stopConditions: ['Parar se houver dor.'],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
        completeProtocol: createCompleteProtocol(),
    };
}

function createResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        historySessionId: 'session-1',
        timestamp: new Date('2026-05-07T12:00:00.000Z'),
        patchVersion: '36.1',
        trajectory: {} as AnalysisResult['trajectory'],
        loadout: {} as AnalysisResult['loadout'],
        metrics: {} as AnalysisResult['metrics'],
        diagnoses: [],
        sensitivity: {} as AnalysisResult['sensitivity'],
        coaching: [],
        coachPlan: createCoachPlan(),
    };
}

describe('dashboard active complete protocol continuity', () => {
    it('projects protocol action fields without treating transfer as technical validation', () => {
        const loop = buildDashboardActiveCoachLoop({
            sessionId: 'session-1',
            result: createResult(),
            latestOutcome: {
                status: 'improved',
                evidenceStrength: 'weak_self_report',
                conflictPayload: null,
                createdAt: new Date('2026-05-07T12:10:00.000Z'),
            },
        });

        expect(loop?.completeProtocol).toMatchObject({
            protocolTitle: 'Trilho vertical M416 3x',
            protocolTier: 'stabilize_block',
            durationLabel: '18 min',
            environmentLabel: 'Training Mode',
            primaryFocusTitle: 'Controle vertical',
            repairActionLabel: 'Gravar validacao compativel antes de aplicar mais forte.',
            evidenceHierarchyLabel: DASHBOARD_PROTOCOL_EVIDENCE_HIERARCHY_LABEL,
        });
        expect(loop?.completeProtocol?.nextCompatibleClipChecklist).toEqual(expect.arrayContaining([
            'Arma: M416',
            'Mira: 3x',
            'Distancia: 50m',
            'Sucesso: reduzir subida vertical sem aumentar ruido horizontal.',
        ]));
        expect(loop?.completeProtocol?.transferPromptLabel).toContain('nao substitui clip compativel');
        expect(loop?.completeProtocol?.safetyStopLabel).toContain('dor, formigamento ou dormencia interrompe o bloco');
    });

    it('keeps the dashboard protocol card out of Phase 9 runner semantics', () => {
        const loop = buildDashboardActiveCoachLoop({
            sessionId: 'session-1',
            result: createResult(),
            latestOutcome: null,
        });

        expect(loop?.ctaLabel).toBe('Continuar protocolo');
        expect(Object.keys(loop?.completeProtocol ?? {})).not.toEqual(expect.arrayContaining([
            'timer',
            'sessionRunner',
            'benchmarkRunner',
            'guidedSession',
        ]));
    });
});
