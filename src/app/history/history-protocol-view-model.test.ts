import { describe, expect, it } from 'vitest';
import type {
    AnalysisResult,
    CoachPlan,
    CoachProtocolOutcome,
    CompleteTrainingProtocol,
} from '@/types/engine';

import { buildHistoryProtocolViewModel } from './history-protocol-view-model';

function createProtocol(): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'stabilize_block',
        title: 'Ficha vertical controlada',
        summary: 'Bloco de estabilizacao vertical.',
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
        objective: 'Reduzir subida sem trocar variaveis.',
        dose: {
            durationMinutes: 18,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 18,
        },
        target: 'Agrupamento vertical menor.',
        executionSteps: ['Preparar', 'Executar', 'Registrar'],
        preparation: [],
        validation: {
            compatibleClipChecklist: ['Beryl', '3x', '50m', 'mesma sensibilidade'],
            minimumConfidence: 0.7,
            minimumCoverage: 0.7,
            successCriteria: ['Menos subida vertical sem aumentar ruido.'],
            failCriteria: ['Variavel mudou ou ruido subiu.'],
            variableControlChecklist: ['sens fixa', 'grip fixo'],
            nextClipCopy: 'Grave Beryl 3x em 50m com variaveis fixas.',
        },
        transfer: {
            situationChecklist: ['TDM curta', 'aproximar 50m', 'mesma arma/mira'],
            conservativeConfidenceCopy: 'Transferencia pratica pede confirmacao controlada.',
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
            createdAt: '2026-05-07T12:00:00.000Z',
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

function createCoachPlan(): CoachPlan {
    return {
        tier: 'stabilize_block',
        sessionSummary: 'Estabilizar vertical.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Subida no sustentado.',
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
            instruction: 'Executar bloco.',
            expectedEffect: 'Estabilizar.',
            risk: 'low',
            applyWhen: 'Contexto fixo.',
        }],
        nextBlock: {
            title: 'Bloco vertical',
            durationMinutes: 18,
            steps: ['Executar'],
            checks: [],
        },
        stopConditions: [],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
        completeProtocol: createProtocol(),
    };
}

function createResult(): AnalysisResult {
    return {
        id: 'analysis-1',
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

const improvedOutcome: CoachProtocolOutcome = {
    id: 'outcome-1',
    sessionId: 'session-1',
    coachPlanId: 'coach-plan-1',
    protocolId: 'protocol-1',
    focusArea: 'vertical_control',
    status: 'improved',
    reasonCodes: [],
    recordedAt: '2026-05-07T12:10:00.000Z',
    evidenceStrength: 'weak_self_report',
};

describe('history protocol view model', () => {
    it('builds snapshot, outcome, validation, transfer, revision, and audit sections', () => {
        const model = buildHistoryProtocolViewModel({
            result: createResult(),
            savedAt: '2026-05-07T12:00:00.000Z',
            outcomes: [improvedOutcome],
            revisions: [{
                revisionReason: 'Fadiga reportada depois do bloco.',
                tierDirection: 'more_conservative',
                changedFields: ['tier', 'dose'],
                createdAt: '2026-05-07T12:20:00.000Z',
            }],
            transfers: [{
                situation: 'TDM curta em cover',
                weaponId: 'beryl',
                opticId: '3x',
                approximateDistanceMeters: 50,
                pressureLevel: 'media',
                feltControl: 'melhor',
                result: 'segurou melhor',
                countsAsTechnicalValidation: false,
                createdAt: '2026-05-07T12:30:00.000Z',
            }],
            canSeeFullProtocol: true,
        });

        expect(model?.snapshotCard).toMatchObject({
            title: 'Ficha vertical controlada',
            version: 'complete-protocol-v1',
            tier: 'stabilize_block',
            drillId: 'vertical_recoil_lane',
            focus: 'Controle vertical',
            duration: '18 min',
        });
        expect(model?.outcomeCard).toMatchObject({
            status: 'improved',
            evidenceStrength: 'weak_self_report',
            needsCompatibleValidation: true,
        });
        expect(model?.validationCard).toMatchObject({
            title: 'Validacao compativel',
            checklist: ['Beryl', '3x', '50m', 'mesma sensibilidade'],
        });
        expect(model?.transferCard.countsAsTechnicalValidationCopy).toContain('nao conta como validacao tecnica');
        expect(model?.transferCard.latestRecord).toMatchObject({
            situation: 'TDM curta em cover',
            countsAsTechnicalValidation: false,
        });
        expect(model?.revisionTimeline[0]).toMatchObject({
            tierDirection: 'more_conservative',
            changedFieldsLabel: 'tier, dose',
        });
        expect(model?.auditRows.map((row) => row.label)).toEqual(expect.arrayContaining([
            'Downgrade codes',
            'Blocker reasons',
            'Support limitations',
            'Confidence/Coverage',
            'Free/Pro state',
        ]));
    });

    it('returns null for old saved analyses without complete protocol snapshots', () => {
        const { completeProtocol: _completeProtocol, ...coachPlanWithoutProtocol } = createCoachPlan();
        const model = buildHistoryProtocolViewModel({
            result: {
                ...createResult(),
                coachPlan: coachPlanWithoutProtocol,
            },
        });

        expect(model).toBeNull();
    });
});
