import { describe, expect, it } from 'vitest';

import { buildCoachPlan } from './coach-plan-builder';
import { analysisResultBase } from './coach-test-fixtures';
import {
    createSprayLabSessionFromProtocol,
    reduceSprayLabSessionEvent,
} from './spray-lab-session';
import type {
    CompleteTrainingProtocol,
    SprayLabSessionEvent,
    SprayLabSessionEventType,
    SprayLabSessionSnapshot,
} from '../types/engine';

function protocolFixture(): CompleteTrainingProtocol {
    const protocol = buildCoachPlan({ analysisResult: analysisResultBase }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return protocol;
}

function sessionFixture(): SprayLabSessionSnapshot {
    return createSprayLabSessionFromProtocol({
        protocol: protocolFixture(),
        sessionId: 'lab-session-1',
        createdAt: '2026-05-08T05:00:00.000Z',
        baseAnalysisId: 'analysis-fixture-base',
    });
}

function event(
    session: SprayLabSessionSnapshot,
    type: SprayLabSessionEventType,
    suffix: string,
    patch: Partial<Omit<SprayLabSessionEvent, 'id' | 'sessionId' | 'type' | 'occurredAt'>> = {},
): SprayLabSessionEvent {
    return {
        id: `${session.id}:${suffix}`,
        sessionId: session.id,
        type,
        occurredAt: `2026-05-08T05:0${suffix.length}:00.000Z`,
        ...patch,
    };
}

describe('Spray Lab session state machine', () => {
    it('creates a draft session from a complete protocol with coherent dose counts', () => {
        const protocol = protocolFixture();
        const session = createSprayLabSessionFromProtocol({
            protocol,
            createdAt: '2026-05-08T05:00:00.000Z',
        });

        expect(session.version).toBe('spray-lab-v1');
        expect(session.protocolId).toBe(protocol.id);
        expect(session.status).toBe('draft');
        expect(session.stepState).toBe('preparar');
        expect(session.totalReps).toBe(protocol.dose.sprayReps);
        expect(session.totalSprays).toBe(protocol.dose.sprayReps * protocol.dose.spraysPerRep);
        expect(session.blocks[0]).toEqual(expect.objectContaining({
            drillId: protocol.drillId,
            repCount: protocol.dose.sprayReps,
            spraysPerRep: protocol.dose.spraysPerRep,
        }));
    });

    it('keeps reducer transitions deterministic from explicit event timestamps', () => {
        const session = sessionFixture();
        const start = event(session, 'start', 'start');
        const first = reduceSprayLabSessionEvent(session, start);
        const second = reduceSprayLabSessionEvent(session, start);
        const duplicate = reduceSprayLabSessionEvent(first, start);

        expect(first).toEqual(second);
        expect(first.updatedAt).toBe(start.occurredAt);
        expect(first.status).toBe('active');
        expect(first.eventIds).toEqual([start.id]);
        expect(duplicate.eventIds).toEqual([start.id]);
    });

    it('moves through prepare, spray, rest, result and validation states', () => {
        let session = sessionFixture();

        session = reduceSprayLabSessionEvent(session, event(session, 'start', 's1'));
        session = reduceSprayLabSessionEvent(session, event(session, 'ready', 's2'));
        expect(session.stepState).toBe('pronto_para_spray');

        session = reduceSprayLabSessionEvent(session, event(session, 'spray_start', 's3'));
        expect(session.stepState).toBe('spray_em_andamento');

        session = reduceSprayLabSessionEvent(session, event(session, 'spray_end', 's4'));
        expect(session.completedSprays).toBe(1);
        expect(session.completedReps).toBe(1);
        expect(session.stepState).toBe('checagem_rapida');

        session = reduceSprayLabSessionEvent(session, event(session, 'rest_start', 's5'));
        expect(session.stepState).toBe('descanso');

        session = reduceSprayLabSessionEvent(session, event(session, 'rest_end', 's6'));
        expect(session.stepState).toBe('pronto_para_spray');

        session = reduceSprayLabSessionEvent(session, event(session, 'complete_result', 's7'));
        expect(session.status).toBe('completed');
        expect(session.act).toBe('fechar_resultado');

        session = reduceSprayLabSessionEvent(session, event(session, 'request_validation', 's8'));
        expect(session.stepState).toBe('validar_clip');
        expect(session.act).toBe('validar_clip_compativel');
        expect(session.validationStatus).toBe('pending');
    });

    it('records pause, repeat, skip and problem reports as auditable interventions', () => {
        let session = sessionFixture();

        session = reduceSprayLabSessionEvent(session, event(session, 'start', 'a1'));
        session = reduceSprayLabSessionEvent(session, event(session, 'spray_end', 'a2'));
        expect(session.completedReps).toBe(1);

        session = reduceSprayLabSessionEvent(session, event(session, 'repeat_rep', 'a3'));
        expect(session.completedReps).toBe(0);
        expect(session.manualInterventionCount).toBe(1);

        session = reduceSprayLabSessionEvent(session, event(session, 'skip_rep', 'a4'));
        expect(session.completedReps).toBe(1);
        expect(session.problemReasonCodes).toContain('skipped_reps');

        session = reduceSprayLabSessionEvent(session, event(session, 'pause', 'a5'));
        expect(session.status).toBe('paused');

        session = reduceSprayLabSessionEvent(session, event(session, 'resume', 'a6'));
        session = reduceSprayLabSessionEvent(session, event(session, 'report_problem', 'a7', {
            variablesChanged: true,
            reasonCodes: ['fatigue_or_pain'],
        }));

        expect(session.status).toBe('active');
        expect(session.problemReasonCodes).toEqual(expect.arrayContaining([
            'skipped_reps',
            'variable_changed',
            'fatigue_or_pain',
        ]));
        expect(session.manualInterventionCount).toBe(4);
    });
});
