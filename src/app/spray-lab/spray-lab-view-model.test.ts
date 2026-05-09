import { describe, expect, it } from 'vitest';

import { createSprayLabSessionFromProtocol } from '@/core/spray-lab-session';
import { resolveProductAccess } from '@/lib/product-entitlements';
import { projectSprayLabForAccess } from '@/lib/spray-lab-projection';
import type { CompleteTrainingProtocol, SprayLabSessionSnapshot } from '@/types/engine';
import { buildSprayLabViewModel } from './spray-lab-view-model';

function completeProtocol(): CompleteTrainingProtocol {
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
            opticId: 'red-dot',
            opticName: 'Red Dot',
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
        objective: 'Treinar recoil vertical sem misturar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 4,
            spraysPerRep: 2,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Training Mode 50m',
        executionSteps: ['Spray sustentado', 'Descanso curto', 'Repetir mantendo setup'],
        preparation: [
            { id: 'setup', label: 'Confirmar setup', reason: 'Evita misturar variaveis.', required: true, safetyKind: 'variable_control' },
            { id: 'mousepad', label: 'Espaco do mouse', reason: 'Evita travar o pull.', required: true, safetyKind: 'setup_control' },
            { id: 'rest', label: 'Pausa curta', reason: 'Evita fadiga.', required: true, safetyKind: 'rest' },
        ],
        validation: {
            compatibleClipChecklist: ['Mesma arma', 'Mesma mira', 'Mesma distancia', 'Mesma sens'],
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
        stopConditions: ['Pare se houver dor.'],
        continueCriteria: ['Continuar se contexto ficar igual.'],
        antiMixingNotes: ['Nao misturar sens e grip.'],
        freeSummary: ['Foco e duracao visiveis.'],
        proSections: ['Auditoria completa.'],
        llmRewriteAllowed: false,
    };
}

function session(overrides: Partial<SprayLabSessionSnapshot> = {}): SprayLabSessionSnapshot {
    const base = createSprayLabSessionFromProtocol({
        protocol: completeProtocol(),
        sessionId: 'lab-session-1',
        baseAnalysisId: 'analysis-1',
        createdAt: '2026-05-08T05:10:00.000Z',
    });

    return {
        ...base,
        ...overrides,
    };
}

function projection(currentSession: SprayLabSessionSnapshot | null) {
    return projectSprayLabForAccess({
        access: resolveProductAccess({ now: new Date('2026-05-08T05:30:00.000Z') }),
        session: currentSession,
    });
}

function proProjection(currentSession: SprayLabSessionSnapshot | null) {
    return projectSprayLabForAccess({
        access: resolveProductAccess({
            now: new Date('2026-05-08T05:30:00.000Z'),
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
        }),
        session: currentSession,
    });
}

describe('spray lab view model', () => {
    it('builds an empty state when no Lab session is active', () => {
        const model = buildSprayLabViewModel({
            projection: projection(null),
            session: null,
        });

        expect(model.routeState).toBe('empty');
        expect(model.primaryAction).toEqual({ label: 'Ver historico', href: '/history' });
        expect(model.evidenceItems.map((item) => item.label)).toContain('Entrada');
        expect(model.loopStage).toBe('block');
    });

    it('routes the validation step back to Analyze with the Lab target context', () => {
        const currentSession = session({
            status: 'completed',
            act: 'validar_clip',
            stepState: 'validar_clip',
            validationStatus: 'pending',
        });
        const model = buildSprayLabViewModel({
            projection: projection(currentSession),
            session: currentSession,
        });

        expect(model.routeState).toBe('session');
        expect(model.loopStage).toBe('validation');
        expect(model.session?.step.primaryAction).toMatchObject({
            label: 'Abrir validacao',
            kind: 'href',
        });
        expect(model.session?.step.primaryAction.href).toContain('/analyze?mode=validation');
        expect(model.session?.step.primaryAction.href).toContain('labSessionId=lab-session-1');
        expect(model.session?.step.primaryAction.href).toContain('baseSessionId=analysis-1');
        expect(model.session?.step.secondaryActions).toEqual([]);
    });

    it('builds Social Pro handoffs from Lab source IDs while preserving execution and validation limits', () => {
        const currentSession = session({
            status: 'completed',
            act: 'fechar_resultado',
            stepState: 'resultado',
            validationStatus: 'not_requested',
            problemReasonCodes: ['variable_changed'],
            repairState: {
                title: 'Reparar variavel',
                whatHappened: 'A variavel mudou durante a sessao.',
                whyItMatters: 'Sessao vale como pratica, nao como prova tecnica.',
                ctas: ['Repetir mantendo o mesmo setup.'],
            },
        });
        const model = buildSprayLabViewModel({
            projection: proProjection(currentSession),
            session: currentSession,
        });

        expect(model.socialPro.title).toBe('Social Pro do Spray Lab');
        expect(model.socialPro.evidenceHierarchy).toEqual([
            'Execucao Spray Lab',
            'Transferencia pratica',
            'Validacao tecnica compativel',
        ]);
        expect(model.socialPro.reportAction).toMatchObject({
            disabled: false,
            sourceIds: {
                sourceSprayLabSessionId: currentSession.id,
                sourceAnalysisSessionId: 'analysis-1',
            },
        });
        expect(model.socialPro.reportAction.sourceIds).not.toHaveProperty('sessionSnapshot');
        expect(model.socialPro.libraryActions[0]).toMatchObject({
            disabled: false,
            item: {
                kind: 'spray_lab_session',
                id: currentSession.id,
                context: {
                    sprayLabLaneId: currentSession.lane.id,
                    weaponId: 'beryl-m762',
                    opticId: 'red-dot',
                    distanceMeters: 50,
                    objectiveKey: currentSession.lane.objective,
                    validationState: 'not_requested',
                    blockerKey: 'variable_changed',
                },
            },
        });
        expect(model.socialPro.blockerLabels.join(' ')).toMatch(/variavel|reparo|pratica/i);
        expect(JSON.stringify(model.socialPro).toLowerCase()).not.toMatch(/melhora garantida|rank garantido|sensibilidade perfeita|prova tecnica automatica|ranking|payout/);
    });

    it('locks Spray Lab Social Pro actions for Free while keeping public reading copy useful', () => {
        const currentSession = session();
        const model = buildSprayLabViewModel({
            projection: projection(currentSession),
            session: currentSession,
        });

        expect(model.socialPro.reportAction.disabled).toBe(true);
        expect(model.socialPro.reportAction.lockCopy).toMatch(/free|leitura publica|pro/i);
        expect(model.socialPro.libraryActions[0]?.disabled).toBe(true);
        expect(model.socialPro.libraryActions[0]?.lockCopy).toMatch(/saves normais|biblioteca/i);
    });

    it('turns load failures into a repair state instead of a blank runner', () => {
        const model = buildSprayLabViewModel({
            projection: projection(null),
            loadError: 'Sessao Lab nao encontrada.',
        });

        expect(model.routeState).toBe('repair');
        expect(model.repair?.whatHappened).toBe('Sessao Lab nao encontrada.');
        expect(model.evidenceItems.map((item) => item.label)).toContain('Estado');
    });
});
