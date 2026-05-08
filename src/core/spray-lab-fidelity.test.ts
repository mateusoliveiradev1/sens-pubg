import { describe, expect, it } from 'vitest';

import { buildCoachPlan } from './coach-plan-builder';
import { analysisResultBase } from './coach-test-fixtures';
import {
    calculateSprayLabFidelity,
    buildSprayLabRepairState,
} from './spray-lab-fidelity';
import {
    createSprayLabSessionFromProtocol,
    reduceSprayLabSessionEvent,
} from './spray-lab-session';
import type {
    CompleteTrainingProtocol,
    SprayLabFidelityReasonCode,
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

function createSession(): SprayLabSessionSnapshot {
    return createSprayLabSessionFromProtocol({
        protocol: protocolFixture(),
        sessionId: 'fidelity-session',
        createdAt: '2026-05-08T06:00:00.000Z',
    });
}

function event(
    session: SprayLabSessionSnapshot,
    type: SprayLabSessionEventType,
    id: string,
    minute: number,
    patch: Partial<Omit<SprayLabSessionEvent, 'id' | 'sessionId' | 'type' | 'occurredAt'>> = {},
): SprayLabSessionEvent {
    return {
        id,
        sessionId: session.id,
        type,
        occurredAt: `2026-05-08T06:${String(minute).padStart(2, '0')}:00.000Z`,
        ...patch,
    };
}

function applyEvents(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
): SprayLabSessionSnapshot {
    return events.reduce(reduceSprayLabSessionEvent, session);
}

function completeSession(): {
    readonly session: SprayLabSessionSnapshot;
    readonly events: readonly SprayLabSessionEvent[];
} {
    let session = createSession();
    const events: SprayLabSessionEvent[] = [
        event(session, 'start', 'start', 0),
        event(session, 'ready', 'ready', 1),
    ];

    session = applyEvents(session, events);

    for (let index = 0; index < session.totalSprays; index += 1) {
        const sprayEvents = [
            event(session, 'spray_start', `spray-start-${index}`, 2 + index * 2),
            event(session, 'spray_end', `spray-end-${index}`, 3 + index * 2),
        ];
        events.push(...sprayEvents);
        session = applyEvents(session, sprayEvents);
    }

    const resultEvent = event(session, 'complete_result', 'complete', 20);
    events.push(resultEvent);
    session = reduceSprayLabSessionEvent(session, resultEvent);

    return { session, events };
}

describe('Spray Lab fidelity scoring', () => {
    it('marks a complete controlled session as strong benchmark-ready provisional evidence', () => {
        const { session, events } = completeSession();
        const fidelity = calculateSprayLabFidelity(session, events);

        expect(fidelity.tier).toBe('strong');
        expect(fidelity.benchmarkEligible).toBe(true);
        expect(fidelity.evidenceLevel).toBe('provisional_benchmark');
        expect(fidelity.reasonCodes).toEqual([]);
    });

    it('downgrades skipped reps to practice-only instead of benchmark evidence', () => {
        let session = createSession();
        const events = [
            event(session, 'start', 'start', 0),
            event(session, 'ready', 'ready', 1),
        ];
        session = applyEvents(session, events);

        const skip = event(session, 'skip_rep', 'skip', 2);
        const complete = event(session, 'complete_result', 'complete', 3);
        const allEvents = [...events, skip, complete];
        session = applyEvents(session, [skip, complete]);

        const fidelity = calculateSprayLabFidelity(session, allEvents);

        expect(fidelity.tier).toBe('practice_only');
        expect(fidelity.benchmarkEligible).toBe(false);
        expect(fidelity.reasonCodes).toContain('skipped_reps');
    });

    it('treats fatigue or pain as a safety downgrade, not an aim failure', () => {
        const { session: complete, events } = completeSession();
        const problem = event(complete, 'report_problem', 'fatigue', 21, {
            reasonCodes: ['fatigue_or_pain'],
        });
        const session = reduceSprayLabSessionEvent(complete, problem);
        const fidelity = calculateSprayLabFidelity(session, [...events, problem]);

        expect(fidelity.tier).toBe('practice_only');
        expect(fidelity.safetyDowngrade).toBe(true);
        expect(fidelity.coachImpactCopy).toMatch(/nao conta como falha de mira/i);
    });

    it('blocks strong benchmark when capture blockers are reported', () => {
        let session = createSession();
        const blockerReasons: readonly SprayLabFidelityReasonCode[] = ['capture_blocker'];
        const events = [
            event(session, 'start', 'start', 0),
            event(session, 'report_problem', 'blocker', 1, {
                reasonCodes: blockerReasons,
            }),
        ];
        session = applyEvents(session, events);

        const fidelity = calculateSprayLabFidelity(session, events);
        const repair = buildSprayLabRepairState(fidelity);

        expect(fidelity.tier).toBe('invalid_for_benchmark');
        expect(fidelity.benchmarkEligible).toBe(false);
        expect(repair?.type).toBe('captura_fraca');
    });
});
