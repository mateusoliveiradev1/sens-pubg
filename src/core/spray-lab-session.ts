import type {
    CompleteTrainingProtocol,
    SprayLabFidelityReasonCode,
    SprayLabSessionBlock,
    SprayLabSessionEvent,
    SprayLabSessionSnapshot,
    SprayLabStepState,
} from '../types/engine';
import {
    buildSprayLabLaneContextKey,
    selectSprayLabLaneForProtocol,
} from './spray-lab-lanes';

export interface CreateSprayLabSessionInput {
    readonly protocol: CompleteTrainingProtocol;
    readonly sessionId?: string;
    readonly createdAt: string;
    readonly baseAnalysisId?: string;
}

export function createSprayLabSessionFromProtocol(
    input: CreateSprayLabSessionInput,
): SprayLabSessionSnapshot {
    const lane = selectSprayLabLaneForProtocol(input.protocol);
    const totalReps = Math.max(1, input.protocol.dose.sprayReps);
    const spraysPerRep = Math.max(1, input.protocol.dose.spraysPerRep);
    const totalSprays = totalReps * spraysPerRep;
    const sessionId = input.sessionId ?? [
        'spray-lab-v1',
        input.protocol.id,
        lane.id,
    ].join(':');

    return {
        version: 'spray-lab-v1',
        id: sessionId,
        status: 'draft',
        act: 'preparar',
        stepState: 'preparar',
        protocolId: input.protocol.id,
        protocol: input.protocol,
        lane,
        contextKey: buildSprayLabLaneContextKey(input.protocol.context),
        ...(input.baseAnalysisId ? { baseAnalysisId: input.baseAnalysisId } : {}),
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        activeBlockIndex: 0,
        activeRepIndex: 0,
        totalReps,
        completedReps: 0,
        totalSprays,
        completedSprays: 0,
        manualInterventionCount: 0,
        problemReasonCodes: [],
        blocks: [{
            id: `${sessionId}:block:0`,
            drillId: input.protocol.drillId,
            label: lane.label,
            target: input.protocol.target,
            repCount: totalReps,
            spraysPerRep,
            restSeconds: input.protocol.dose.restBetweenSpraysSeconds,
            completedReps: 0,
            completedSprays: 0,
        }],
        eventIds: [],
        validationStatus: 'not_requested',
    };
}

export function reduceSprayLabSessionEvent(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
): SprayLabSessionSnapshot {
    if (event.sessionId !== session.id) {
        throw new Error(`Spray Lab event ${event.id} does not belong to session ${session.id}`);
    }

    switch (event.type) {
        case 'start':
            return withEvent(session, event, {
                status: 'active',
                stepState: 'preparar',
            });
        case 'ready':
            return withEvent(session, event, {
                status: 'active',
                stepState: 'pronto_para_spray',
            });
        case 'spray_start':
            return withEvent(session, event, {
                status: 'active',
                stepState: 'spray_em_andamento',
            });
        case 'spray_end':
            return reduceSprayEnd(session, event);
        case 'rest_start':
            return withEvent(session, event, {
                status: 'active',
                stepState: 'descanso',
            });
        case 'rest_end':
            return withEvent(session, event, {
                status: 'active',
                stepState: session.completedSprays >= session.totalSprays ? 'resultado' : 'pronto_para_spray',
            });
        case 'quick_check':
            return withEvent(session, event, {
                status: 'active',
                stepState: 'checagem_rapida',
            });
        case 'pause':
            return withEvent(session, event, {
                status: 'paused',
                manualInterventionCount: session.manualInterventionCount + 1,
            });
        case 'resume':
            return withEvent(session, event, {
                status: 'active',
            });
        case 'skip_rep':
            return reduceSkipRep(session, event);
        case 'repeat_rep':
            return reduceRepeatRep(session, event);
        case 'report_problem':
            return reduceReportProblem(session, event);
        case 'end_early':
            return withEvent(session, event, {
                status: 'completed',
                stepState: 'resultado',
                manualInterventionCount: session.manualInterventionCount + 1,
                problemReasonCodes: mergeReasonCodes(session.problemReasonCodes, ['early_stop', ...(event.reasonCodes ?? [])]),
            });
        case 'complete_result':
            return withEvent(session, event, {
                status: 'completed',
                stepState: 'resultado',
            });
        case 'request_validation':
            return withEvent(session, event, {
                status: 'completed',
                stepState: 'validar_clip',
                validationStatus: 'pending',
            });
    }
}

function reduceSprayEnd(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
): SprayLabSessionSnapshot {
    const completedSprays = clampCount(
        session.completedSprays + Math.max(1, event.completedSprays ?? 1),
        session.totalSprays,
    );

    return withProgress(session, event, completedSprays, {
        status: 'active',
        stepState: 'checagem_rapida',
    });
}

function reduceSkipRep(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
): SprayLabSessionSnapshot {
    const spraysPerRep = readSpraysPerRep(session);
    const nextRepBoundary = Math.ceil((session.completedSprays + 1) / spraysPerRep) * spraysPerRep;
    const completedSprays = clampCount(nextRepBoundary, session.totalSprays);

    return withProgress(session, event, completedSprays, {
        status: completedSprays >= session.totalSprays ? 'completed' : 'active',
        stepState: completedSprays >= session.totalSprays ? 'resultado' : 'descanso',
        manualInterventionCount: session.manualInterventionCount + 1,
        problemReasonCodes: mergeReasonCodes(session.problemReasonCodes, ['skipped_reps', ...(event.reasonCodes ?? [])]),
    });
}

function reduceRepeatRep(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
): SprayLabSessionSnapshot {
    const spraysPerRep = readSpraysPerRep(session);
    const completedSprays = clampCount(
        Math.max(0, session.completedSprays - spraysPerRep),
        session.totalSprays,
    );

    return withProgress(session, event, completedSprays, {
        status: 'active',
        stepState: 'pronto_para_spray',
        manualInterventionCount: session.manualInterventionCount + 1,
    });
}

function reduceReportProblem(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
): SprayLabSessionSnapshot {
    const eventReasons = event.reasonCodes ?? [];
    const reasonCodes = mergeReasonCodes(
        session.problemReasonCodes,
        event.variablesChanged ? ['variable_changed', ...eventReasons] : eventReasons,
    );

    return withEvent(session, event, {
        status: reasonCodes.includes('capture_blocker') ? 'blocked' : 'active',
        stepState: 'checagem_rapida',
        manualInterventionCount: session.manualInterventionCount + 1,
        problemReasonCodes: reasonCodes,
    });
}

function withProgress(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
    completedSprays: number,
    patch: Partial<Pick<
        SprayLabSessionSnapshot,
        'manualInterventionCount' | 'problemReasonCodes' | 'status' | 'stepState'
    >>,
): SprayLabSessionSnapshot {
    const completedReps = Math.floor(completedSprays / readSpraysPerRep(session));
    const blocks = session.blocks.map((block, index): SprayLabSessionBlock => (
        index === session.activeBlockIndex
            ? {
                ...block,
                completedSprays,
                completedReps,
            }
            : block
    ));

    return withEvent(session, event, {
        ...patch,
        blocks,
        completedSprays,
        completedReps,
        activeRepIndex: resolveActiveRepIndex(completedReps, session.totalReps),
    });
}

function withEvent(
    session: SprayLabSessionSnapshot,
    event: SprayLabSessionEvent,
    patch: Partial<Pick<
        SprayLabSessionSnapshot,
        | 'activeRepIndex'
        | 'blocks'
        | 'completedReps'
        | 'completedSprays'
        | 'manualInterventionCount'
        | 'problemReasonCodes'
        | 'status'
        | 'stepState'
        | 'validationStatus'
    >>,
): SprayLabSessionSnapshot {
    const stepState = patch.stepState ?? session.stepState;

    return {
        ...session,
        ...patch,
        act: actForStepState(stepState),
        stepState,
        status: patch.status ?? session.status,
        updatedAt: event.occurredAt,
        eventIds: session.eventIds.includes(event.id)
            ? session.eventIds
            : [...session.eventIds, event.id],
    };
}

function actForStepState(stepState: SprayLabStepState): SprayLabSessionSnapshot['act'] {
    switch (stepState) {
        case 'preparar':
        case 'pronto_para_spray':
            return 'preparar';
        case 'spray_em_andamento':
        case 'descanso':
        case 'checagem_rapida':
            return 'executar';
        case 'resultado':
            return 'fechar_resultado';
        case 'validar_clip':
            return 'validar_clip_compativel';
    }
}

function readSpraysPerRep(session: SprayLabSessionSnapshot): number {
    return Math.max(1, session.blocks[session.activeBlockIndex]?.spraysPerRep ?? 1);
}

function resolveActiveRepIndex(completedReps: number, totalReps: number): number {
    return Math.min(completedReps, Math.max(0, totalReps - 1));
}

function clampCount(value: number, max: number): number {
    return Math.max(0, Math.min(max, value));
}

function mergeReasonCodes(
    current: readonly SprayLabFidelityReasonCode[],
    next: readonly SprayLabFidelityReasonCode[],
): readonly SprayLabFidelityReasonCode[] {
    return Array.from(new Set([...current, ...next]));
}
