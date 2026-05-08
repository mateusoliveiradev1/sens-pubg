import { describe, expect, it } from 'vitest';

import { buildCoachPlan } from './coach-plan-builder';
import {
    analysisResultBase,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { calculateSprayLabFidelity } from './spray-lab-fidelity';
import {
    createSprayLabSessionFromProtocol,
    reduceSprayLabSessionEvent,
} from './spray-lab-session';
import {
    buildSprayLabBenchmarkSnapshot,
    buildSprayLabIndexSnapshot,
    resolveSprayLabEvidenceLevel,
} from './spray-lab-scoring';
import type {
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
    SprayLabSessionEvent,
    SprayLabSessionEventType,
    SprayLabSessionSnapshot,
} from '../types/engine';

function protocolFixture(distanceMeters = 30): CompleteTrainingProtocol {
    const result = createAnalysisResultFixture({
        analysisContext: {
            ...analysisResultBase.analysisContext,
            targetDistanceMeters: distanceMeters,
        },
    });
    const protocol = buildCoachPlan({ analysisResult: result }).completeProtocol;

    if (!protocol) {
        throw new Error('Expected complete protocol fixture');
    }

    return protocol;
}

function createSession(distanceMeters = 30): SprayLabSessionSnapshot {
    return createSprayLabSessionFromProtocol({
        protocol: protocolFixture(distanceMeters),
        sessionId: `scoring-session-${distanceMeters}`,
        createdAt: '2026-05-08T07:00:00.000Z',
    });
}

function event(
    session: SprayLabSessionSnapshot,
    type: SprayLabSessionEventType,
    id: string,
    minute: number,
): SprayLabSessionEvent {
    return {
        id,
        sessionId: session.id,
        type,
        occurredAt: `2026-05-08T07:${String(minute).padStart(2, '0')}:00.000Z`,
    };
}

function completeSession(distanceMeters = 30): {
    readonly session: SprayLabSessionSnapshot;
    readonly events: readonly SprayLabSessionEvent[];
} {
    let session = createSession(distanceMeters);
    const events: SprayLabSessionEvent[] = [
        event(session, 'start', 'start', 0),
        event(session, 'ready', 'ready', 1),
    ];

    session = events.reduce(reduceSprayLabSessionEvent, session);

    for (let index = 0; index < session.totalSprays; index += 1) {
        const sprayEvents = [
            event(session, 'spray_start', `spray-start-${index}`, 2 + index * 2),
            event(session, 'spray_end', `spray-end-${index}`, 3 + index * 2),
        ];
        events.push(...sprayEvents);
        session = sprayEvents.reduce(reduceSprayLabSessionEvent, session);
    }

    const complete = event(session, 'complete_result', 'complete', 20);
    events.push(complete);
    session = reduceSprayLabSessionEvent(session, complete);

    return { session, events };
}

function precisionTrend(label: PrecisionTrendSummary['label']): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.9,
        nextValidationHint: 'Validacao compativel registrada.',
    };
}

describe('Spray Lab contextual scoring', () => {
    it('creates a provisional contextual index without marking it validated', () => {
        const { session, events } = completeSession();
        const fidelity = calculateSprayLabFidelity(session, events);
        const index = buildSprayLabIndexSnapshot({
            session,
            fidelity,
            createdAt: '2026-05-08T07:30:00.000Z',
        });

        expect(index.version).toBe('spray-lab-v1');
        expect(index.contextKey).toBe(session.contextKey);
        expect(index.laneId).toBe(session.lane.id);
        expect(index.fidelityTier).toBe('strong');
        expect(index.validationStatus).toBe('not_requested');
        expect(index.evidenceLevel).toBe('provisional_benchmark');
        expect(index.state).toBe('baseline');
        expect(index.validatedScore).toBeUndefined();
    });

    it('requires compatible validation before producing a validated benchmark score', () => {
        const { session, events } = completeSession();
        const fidelity = calculateSprayLabFidelity(session, events);
        const index = buildSprayLabIndexSnapshot({
            session,
            fidelity,
            validationStatus: 'validacao_confirmada',
            precisionTrend: precisionTrend('validated_progress'),
            createdAt: '2026-05-08T07:31:00.000Z',
        });
        const benchmark = buildSprayLabBenchmarkSnapshot({
            session,
            index,
            createdAt: '2026-05-08T07:32:00.000Z',
        });

        expect(resolveSprayLabEvidenceLevel(fidelity, 'validacao_confirmada')).toBe('validated_benchmark');
        expect(index.state).toBe('progresso_validado');
        expect(index.validatedScore).toEqual(expect.any(Number));
        expect(benchmark.eligibleForReleaseBenchmark).toBe(true);
    });

    it('does not collapse different contexts into one global line', () => {
        const first = completeSession(30);
        const second = completeSession(60);
        const firstFidelity = calculateSprayLabFidelity(first.session, first.events);
        const secondFidelity = calculateSprayLabFidelity(second.session, second.events);
        const firstIndex = buildSprayLabIndexSnapshot({
            session: first.session,
            fidelity: firstFidelity,
            createdAt: '2026-05-08T07:33:00.000Z',
        });
        const secondIndex = buildSprayLabIndexSnapshot({
            session: second.session,
            fidelity: secondFidelity,
            createdAt: '2026-05-08T07:34:00.000Z',
        });

        expect(firstIndex.contextKey).not.toBe(secondIndex.contextKey);
        expect(firstIndex.sessionId).not.toBe(secondIndex.sessionId);
        expect(firstIndex.state).toBe('baseline');
        expect(secondIndex.state).toBe('baseline');
    });

    it('blocks benchmark snapshots when fidelity is too weak', () => {
        const session = createSession();
        const fidelity = calculateSprayLabFidelity(session, []);
        const index = buildSprayLabIndexSnapshot({
            session,
            fidelity,
            validationStatus: 'validacao_confirmada',
            createdAt: '2026-05-08T07:35:00.000Z',
        });
        const benchmark = buildSprayLabBenchmarkSnapshot({
            session,
            index,
            createdAt: '2026-05-08T07:36:00.000Z',
        });

        expect(index.state).toBe('bloqueado_por_fidelidade');
        expect(index.evidenceLevel).toBe('practice');
        expect(benchmark.eligibleForReleaseBenchmark).toBe(false);
    });
});
