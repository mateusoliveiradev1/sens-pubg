import { describe, expect, it } from 'vitest';

import { createSprayLabSessionFromProtocol } from '@/core/spray-lab-session';
import { calculateSprayLabFidelity } from '@/core/spray-lab-fidelity';
import {
    buildSprayLabBenchmarkSnapshot,
    buildSprayLabIndexSnapshot,
} from '@/core/spray-lab-scoring';
import { resolveProductAccess } from './product-entitlements';
import { projectSprayLabForAccess } from './spray-lab-projection';
import type { CompleteTrainingProtocol, SprayLabSessionSnapshot } from '@/types/engine';

const now = new Date('2026-05-08T06:00:00.000Z');

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
        executionSteps: ['Spray controlado', 'Descanso curto', 'Checagem curta'],
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
    };
}

function labSession(): SprayLabSessionSnapshot {
    const base = createSprayLabSessionFromProtocol({
        protocol: completeProtocol(),
        sessionId: 'lab-session-1',
        baseAnalysisId: 'analysis-1',
        createdAt: now.toISOString(),
    });
    const completed: SprayLabSessionSnapshot = {
        ...base,
        status: 'completed',
        act: 'fechar_resultado',
        stepState: 'resultado',
        completedReps: base.totalReps,
        completedSprays: base.totalSprays,
        validationStatus: 'validacao_confirmada',
        eventIds: ['start', 'ready', 'complete'],
        blocks: base.blocks.map((block) => ({
            ...block,
            completedReps: block.repCount,
            completedSprays: block.repCount * block.spraysPerRep,
        })),
    };
    const fidelity = calculateSprayLabFidelity(completed, [
        {
            id: 'start',
            sessionId: completed.id,
            type: 'start',
            occurredAt: now.toISOString(),
        },
        {
            id: 'ready',
            sessionId: completed.id,
            type: 'ready',
            occurredAt: now.toISOString(),
        },
    ]);
    const index = buildSprayLabIndexSnapshot({
        session: completed,
        fidelity,
        validationStatus: 'validacao_confirmada',
        createdAt: now.toISOString(),
    });

    return {
        ...completed,
        fidelity,
        index,
    };
}

describe('spray lab Free/Pro projection', () => {
    it('keeps Free useful without leaking Pro audit or benchmark fields', () => {
        const session = labSession();
        const benchmark = buildSprayLabBenchmarkSnapshot({
            session,
            index: session.index!,
            createdAt: now.toISOString(),
        });
        const projection = projectSprayLabForAccess({
            access: resolveProductAccess({ now }),
            session,
            benchmark,
        });

        expect(projection.canStartBasicSession).toBe(true);
        expect(projection.canUseFullSessionRunner).toBe(false);
        expect(projection.canSeeContextBenchmarks).toBe(false);
        expect(projection.session?.provisionalIndex?.provisionalScore).toBeGreaterThan(0);
        expect(projection.session?.validatedIndex).toBeNull();
        expect(projection.session?.audit).toBeNull();
        expect(projection.session?.benchmark).toBeNull();
        expect(projection.locks).toEqual(expect.arrayContaining([
            expect.objectContaining({ featureKey: 'spray_lab.session_runner' }),
            expect.objectContaining({ featureKey: 'spray_lab.benchmarks' }),
        ]));
    });

    it('projects full runner audit and context benchmark only from server-owned Pro entitlements', () => {
        const session = labSession();
        const benchmark = buildSprayLabBenchmarkSnapshot({
            session,
            index: session.index!,
            createdAt: now.toISOString(),
        });
        const access = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
        });
        const projection = projectSprayLabForAccess({ access, session, benchmark });

        expect(projection.canUseFullSessionRunner).toBe(true);
        expect(projection.canSeeContextBenchmarks).toBe(true);
        expect(projection.canCompareSessions).toBe(true);
        expect(projection.session?.audit?.protocolTitle).toBe('Ficha vertical');
        expect(projection.session?.validatedIndex?.evidenceLevel).toBe('validated_benchmark');
        expect(projection.session?.benchmark).toBe(benchmark);
        expect(projection.locks).toEqual([]);
    });

    it('describes Pro value without selling PUBG API-derived data as exclusive paid value', () => {
        const projection = projectSprayLabForAccess({
            access: resolveProductAccess({ now }),
        });
        const copy = `${projection.freeValueCopy} ${projection.proValueCopy} ${projection.locks.map((lock) => lock.body).join(' ')}`;

        expect(copy).toContain('suas proprias sessoes');
        expect(copy).not.toMatch(/PUBG API.*exclusiv/i);
    });
});
