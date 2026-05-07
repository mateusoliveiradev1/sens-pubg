import { describe, expect, it } from 'vitest';

import type { CompleteTrainingProtocol } from '@/types/engine';
import { buildCompleteTrainingProtocolViewModelFromProtocol } from './complete-training-protocol-view-model';

function createCompleteProtocol(overrides: Partial<CompleteTrainingProtocol> = {}): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'complete-protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'test_protocol',
        title: 'Ficha de controle vertical',
        summary: 'Treino controlado para pull vertical.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl-m762',
            weaponName: 'Beryl M762',
            opticId: 'red-dot',
            opticName: 'Red Dot',
            distanceMode: 'unknown',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            supportStatus: 'full',
            personalizationLimited: true,
            limitationReasons: ['missing_distance'],
        },
        objective: 'Treinar controle vertical sem misturar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Parede do Training Mode',
        executionSteps: ['Spray 1', 'Spray 2', 'Spray 3', 'Spray 4'],
        preparation: [
            { id: 'space', label: 'Espaco do mousepad', reason: 'Evita travar o pull.', required: true, safetyKind: 'setup_control' },
            { id: 'grip', label: 'Grip repetivel', reason: 'Mantem variavel fixa.', required: true, safetyKind: 'variable_control' },
            { id: 'rest', label: 'Pausa curta', reason: 'Evita fadiga.', required: true, safetyKind: 'rest' },
            { id: 'stop', label: 'Parar com dor', reason: 'Seguranca do bloco.', required: true, safetyKind: 'stop_rule' },
            { id: 'posture', label: 'Postura repetivel', reason: 'Controla setup.', required: true, safetyKind: 'setup_control' },
            { id: 'extra', label: 'Item extra', reason: 'Nao deve aparecer.', required: false, safetyKind: 'setup_control' },
        ],
        validation: {
            compatibleClipChecklist: [
                'Mesma arma',
                'Mesma mira',
                'Mesma distancia',
                'Mesma postura',
                'Mesmo grip',
                'Mesma sens',
                'Mesmo alvo',
                'Mesma duracao',
                'Item extra',
            ],
            minimumConfidence: 0.75,
            minimumCoverage: 0.8,
            successCriteria: ['VCI melhora sem piorar ruido.'],
            failCriteria: ['Cobertura cai.'],
            variableControlChecklist: ['Nao trocar grip'],
            nextClipCopy: 'Grave o proximo clip igual.',
        },
        transfer: {
            situationChecklist: ['TDM curta', 'Mesma arma/mira', 'Pressao media'],
            conservativeConfidenceCopy: 'Transferencia pratica.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'test_protocol',
            tierAfter: 'test_protocol',
            reasons: ['missing_distance'],
            blockedFields: ['distance'],
            repairCtas: ['Confirmar distancia do clip'],
            userCopy: 'Distancia ausente bloqueia criterio exato.',
        },
        audit: {
            createdAt: '2026-05-07T12:00:00.000Z',
            analysisDecisionLevel: 'usable_analysis',
            primaryFocusArea: 'vertical_control',
            secondaryFocusAreas: [],
            confidence: 0.84,
            coverage: 0.86,
            source: 'deterministic_coach',
        },
        stopConditions: ['Parar se houver dor.'],
        continueCriteria: ['Continuar com cobertura suficiente.'],
        antiMixingNotes: ['Nao misturar sens e grip.'],
        freeSummary: ['Foco e duracao visiveis.'],
        proSections: ['Auditoria completa'],
        llmRewriteAllowed: false,
        ...overrides,
    };
}

describe('complete training protocol view model', () => {
    it('returns null when no complete protocol exists', () => {
        expect(buildCompleteTrainingProtocolViewModelFromProtocol(undefined)).toBeNull();
    });

    it('builds a bounded ficha with repair, validation, transfer, and audit copy', () => {
        const model = buildCompleteTrainingProtocolViewModelFromProtocol(createCompleteProtocol());

        expect(model).not.toBeNull();
        expect(model?.headline).toBe('Ficha de controle vertical');
        expect(model?.summaryRows.map((row) => row.label)).toEqual(['Arma', 'Mira', 'Distancia', 'Foco', 'Alvo']);
        expect(model?.essentialSteps).toEqual(['Spray 1', 'Spray 2', 'Spray 3']);
        expect(model?.preparationItems).toHaveLength(5);
        expect(model?.blockerPanel).toMatchObject({
            reason: 'Distancia ausente',
            repairAction: 'Confirmar distancia do clip',
        });
        expect(model?.validationCard.title).toBe('Grave o proximo clip assim');
        expect(model?.validationCard.checklist).toHaveLength(8);
        expect(model?.transferCard.title).toBe('Transferir para TDM/partida');
        expect(model?.transferCard.technicalProofCopy).toContain('nao substitui a validacao compativel');
        expect(model?.auditDisclosure).toMatchObject({
            version: 'complete-protocol-v1',
            confidence: '84%',
            coverage: '86%',
            downgradeCodes: ['missing_distance'],
        });
    });
});
