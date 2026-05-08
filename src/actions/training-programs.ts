'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import {
    buildTrainingProgramMonthlyCheckpoint,
    buildTrainingProgramTechnicalCheckpoint,
    buildTrainingProgramWeeklyCheckpoint,
} from '@/core/training-program-checkpoints';
import {
    createTrainingProgramCycle,
    reduceTrainingProgramEvent,
    trainingProgramReasonCopy,
} from '@/core/training-programs';
import { db } from '@/db';
import {
    analysisSessions,
    completeTrainingProtocolRevisions,
    sprayLabSessions,
    sprayLabValidationLinks,
    trainingProgramCheckpoints,
    trainingProgramCycles,
    trainingProgramEvents,
    trainingProgramMissions,
    trainingProgramWeeks,
    type TrainingProgramCycleRow,
    type TrainingProgramMissionRow,
} from '@/db/schema';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
} from '@/types/engine';
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCheckpointLayer,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramEvidenceSummary,
    TrainingProgramEventType,
    TrainingProgramMission,
    TrainingProgramReasonCode,
    TrainingProgramState,
    TrainingProgramTransitionEvent,
} from '@/types/training-programs';

export interface CreateTrainingProgramCycleActionInput {
    readonly baseAnalysisSessionId: string;
    readonly protocolRevisionId?: string;
    readonly now?: string;
}

export interface GetActiveTrainingProgramCycleActionInput {
    readonly baseAnalysisSessionId?: string;
}

export interface GetTrainingProgramCycleActionInput {
    readonly cycleId: string;
}

export interface ReenterTrainingProgramCycleActionInput {
    readonly cycleId: string;
    readonly missedDays?: number;
    readonly staleContext?: boolean;
    readonly variableChanged?: boolean;
    readonly occurredAt?: string;
}

export interface CompleteTrainingProgramMissionActionInput {
    readonly cycleId: string;
    readonly missionId: string;
    readonly labSessionId?: string;
    readonly validationLinkId?: string;
    readonly reasonCodes?: readonly TrainingProgramReasonCode[];
    readonly occurredAt?: string;
}

export interface CloseTrainingProgramWeekActionInput {
    readonly cycleId: string;
    readonly weekNumber?: 1 | 2 | 3 | 4;
    readonly labSessionId?: string;
    readonly validationLinkId?: string;
    readonly occurredAt?: string;
}

export interface RecordTrainingProgramCheckpointActionInput {
    readonly cycleId: string;
    readonly layer: TrainingProgramCheckpointLayer;
    readonly weekNumber?: 1 | 2 | 3 | 4;
    readonly labSessionId?: string;
    readonly validationLinkId?: string;
    readonly occurredAt?: string;
}

export interface PauseTrainingProgramCycleActionInput {
    readonly cycleId: string;
    readonly reasonCode?: Extract<
        TrainingProgramReasonCode,
        'discomfort_stop' | 'fatigue_reduced_dose' | 'stale_context' | 'missed_day_reentry'
    >;
    readonly occurredAt?: string;
}

export type TrainingProgramActionResult<TValue> =
    | {
        readonly success: true;
        readonly value: TValue;
    }
    | {
        readonly success: false;
        readonly error: string;
    };

type OwnedAnalysisSessionRow = {
    readonly id: string;
    readonly fullResult: Record<string, unknown> | null;
};

type OwnedProtocolRevisionRow = {
    readonly id: string;
    readonly revisedProtocol: CompleteTrainingProtocol;
};

type OwnedLabSessionRow = {
    readonly id: string;
    readonly baseAnalysisSessionId: string;
    readonly snapshot: SprayLabSessionSnapshot;
};

type OwnedValidationLinkRow = {
    readonly id: string;
    readonly labSessionId: string;
    readonly baseAnalysisSessionId: string;
    readonly payload: SprayLabValidationLink;
};

const ACTIVE_PROGRAM_STATES = [
    'preparando',
    'ativo',
    'reparando',
    'consolidando',
    'validacao_pendente',
    'progresso_validado',
    'sem_mudanca_clara',
    'regressao_validada',
    'inconclusivo',
    'linha_reiniciada',
    'pausado',
    'contexto_desatualizado',
] as const satisfies readonly TrainingProgramState[];

const PROGRAM_REASON_CODES = new Set<TrainingProgramReasonCode>([
    'fidelity_dropped',
    'validation_inconclusive',
    'variable_changed',
    'outcome_conflict',
    'fatigue_reduced_dose',
    'discomfort_stop',
    'stale_context',
    'compatible_proof_missing',
    'blocker_repaired',
    'missed_day_reentry',
    'line_restart',
    'missing_saved_analysis',
    'missing_context',
    'missing_protocol',
    'weak_base_evidence',
    'low_coverage',
    'low_confidence',
    'confusion_simplified',
    'repeated_failure_consolidation',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompleteTrainingProtocol(value: unknown): value is CompleteTrainingProtocol {
    if (!isRecord(value)) {
        return false;
    }

    return value.version === 'complete-protocol-v1'
        && typeof value.id === 'string'
        && typeof value.drillId === 'string'
        && isRecord(value.context)
        && isRecord(value.dose)
        && Array.isArray(value.executionSteps)
        && isRecord(value.validation);
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
    return isRecord(value)
        && isRecord(value.metrics)
        && isRecord(value.sensitivity)
        && Array.isArray(value.diagnoses)
        && Array.isArray(value.coaching);
}

function readCompleteProtocolFromFullResult(
    fullResult: Record<string, unknown> | null,
): CompleteTrainingProtocol | null {
    const coachPlan = isRecord(fullResult?.coachPlan)
        ? fullResult.coachPlan
        : null;
    const protocol = coachPlan?.completeProtocol;

    return isCompleteTrainingProtocol(protocol) ? protocol : null;
}

function readAnalysisResultFromFullResult(
    row: OwnedAnalysisSessionRow,
): AnalysisResult | null {
    if (!isAnalysisResult(row.fullResult)) {
        return null;
    }

    return {
        ...row.fullResult,
        historySessionId: row.id,
    };
}

function normalizeOccurredAt(value: string | undefined): string {
    if (!value) {
        return new Date().toISOString();
    }

    const timestamp = Date.parse(value);

    return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();
}

function filterReasonCodes(
    reasonCodes: readonly TrainingProgramReasonCode[] | undefined,
): readonly TrainingProgramReasonCode[] {
    return Array.from(new Set((reasonCodes ?? []).filter((reason) => PROGRAM_REASON_CODES.has(reason))));
}

function visibleReasonFor(reasonCodes: readonly TrainingProgramReasonCode[], fallback: string): string {
    return reasonCodes[0] ? trainingProgramReasonCopy(reasonCodes[0]) : fallback;
}

function blockerSummaryFor(reasonCodes: readonly TrainingProgramReasonCode[]): string {
    if (reasonCodes.length === 0) {
        return 'Sem blocker ativo no ciclo.';
    }

    return reasonCodes.map(trainingProgramReasonCopy).join(' ');
}

function evidenceRefsWith(
    missionRefs: readonly TrainingProgramEvidenceReference[],
    labSession: OwnedLabSessionRow | null,
    validationLink: OwnedValidationLinkRow | null,
): readonly TrainingProgramEvidenceReference[] {
    const refs = [...missionRefs];

    if (labSession) {
        refs.push({
            kind: 'spray_lab_session',
            id: labSession.id,
            href: `/spray-lab?sessionId=${encodeURIComponent(labSession.id)}`,
        });
    }

    if (validationLink) {
        refs.push({
            kind: 'validation_link',
            id: validationLink.id,
            href: `/analyze?mode=validation&validationLinkId=${encodeURIComponent(validationLink.id)}`,
        });
    }

    const seen = new Set<string>();
    return refs.filter((ref) => {
        const key = `${ref.kind}:${ref.id}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function isCompatibleValidation(link: SprayLabValidationLink | null): boolean {
    if (!link) {
        return false;
    }

    return link.confirmedVariables
        && link.blockers.length === 0
        && (
            link.status === 'validacao_confirmada'
            || link.status === 'sinal_promissor'
            || link.status === 'sem_mudanca_clara'
            || link.status === 'regressao_validada'
        );
}

function findMission(
    cycle: TrainingProgramCycleSnapshot,
    missionId: string,
): TrainingProgramMission | null {
    return cycle.weeks
        .flatMap((week) => week.missions)
        .find((mission) => mission.id === missionId) ?? null;
}

function withUpdatedMission(
    cycle: TrainingProgramCycleSnapshot,
    missionId: string,
    updater: (mission: TrainingProgramMission) => TrainingProgramMission,
): TrainingProgramCycleSnapshot {
    return {
        ...cycle,
        weeks: cycle.weeks.map((week) => ({
            ...week,
            missions: week.missions.map((mission) => (
                mission.id === missionId ? updater(mission) : mission
            )),
        })),
    };
}

function withCheckpointAttached(
    cycle: TrainingProgramCycleSnapshot,
    checkpoint: TrainingProgramCheckpoint,
): TrainingProgramCycleSnapshot {
    const nextWeekNumber = checkpoint.layer === 'weekly_operational' && checkpoint.weekNumber && checkpoint.weekNumber < 4
        ? (checkpoint.weekNumber + 1) as 1 | 2 | 3 | 4
        : cycle.currentWeekNumber;
    const nextMissionId = nextWeekNumber !== cycle.currentWeekNumber
        ? cycle.weeks
            .find((week) => week.weekNumber === nextWeekNumber)
            ?.missions
            .find((mission) => mission.status !== 'completed')
            ?.id ?? cycle.currentMissionId
        : cycle.currentMissionId;

    return {
        ...cycle,
        state: checkpoint.state,
        updatedAt: checkpoint.createdAt,
        checkpoints: cycle.checkpoints.some((current) => current.id === checkpoint.id)
            ? cycle.checkpoints
            : [...cycle.checkpoints, checkpoint],
        weeks: cycle.weeks.map((week) => {
            if (checkpoint.weekNumber !== week.weekNumber) {
                return week;
            }

            return {
                ...week,
                state: checkpoint.state,
                ...(checkpoint.layer === 'weekly_operational'
                    ? { closedAt: checkpoint.createdAt }
                    : {}),
                checkpointIds: week.checkpointIds.includes(checkpoint.id)
                    ? week.checkpointIds
                    : [...week.checkpointIds, checkpoint.id],
                reasonCodes: Array.from(new Set([...week.reasonCodes, ...checkpoint.reasonCodes])),
                canIncreaseDifficulty: checkpoint.canIncreaseDifficulty,
            };
        }),
        currentWeekNumber: nextWeekNumber,
        currentMissionId: nextMissionId,
        reasonCodes: Array.from(new Set([...cycle.reasonCodes, ...checkpoint.reasonCodes])),
        recoveryAction: checkpoint.nextRecommendation,
    };
}

function revalidateTrainingProgramPaths(baseAnalysisSessionId: string | null): void {
    revalidatePath('/ciclo-pro');
    revalidatePath('/dashboard');
    revalidatePath('/history');
    revalidatePath('/spray-lab');
    revalidatePath('/analyze');

    if (baseAnalysisSessionId) {
        revalidatePath(`/history/${baseAnalysisSessionId}`);
    }
}

async function resolveActionUserId(): Promise<string | null> {
    const session = await auth();

    return session?.user?.id ?? null;
}

async function loadOwnedAnalysisSession(
    userId: string,
    analysisSessionId: string,
): Promise<OwnedAnalysisSessionRow | null> {
    const [row] = await db
        .select({
            id: analysisSessions.id,
            fullResult: analysisSessions.fullResult,
        })
        .from(analysisSessions)
        .where(and(
            eq(analysisSessions.id, analysisSessionId),
            eq(analysisSessions.userId, userId),
        ))
        .limit(1);

    return row ?? null;
}

async function loadProtocolRevision(
    userId: string,
    baseAnalysisSessionId: string,
    protocolRevisionId: string,
): Promise<OwnedProtocolRevisionRow | null> {
    const [row] = await db
        .select({
            id: completeTrainingProtocolRevisions.id,
            revisedProtocol: completeTrainingProtocolRevisions.revisedProtocol,
        })
        .from(completeTrainingProtocolRevisions)
        .where(and(
            eq(completeTrainingProtocolRevisions.id, protocolRevisionId),
            eq(completeTrainingProtocolRevisions.userId, userId),
            eq(completeTrainingProtocolRevisions.analysisSessionId, baseAnalysisSessionId),
        ))
        .limit(1);

    return row && isCompleteTrainingProtocol(row.revisedProtocol)
        ? row as OwnedProtocolRevisionRow
        : null;
}

async function loadOwnedCycleRow(
    userId: string,
    cycleId: string,
): Promise<TrainingProgramCycleRow | null> {
    const [row] = await db
        .select()
        .from(trainingProgramCycles)
        .where(and(
            eq(trainingProgramCycles.id, cycleId),
            eq(trainingProgramCycles.userId, userId),
        ))
        .limit(1);

    return row ?? null;
}

async function loadLatestActiveCycleRow(
    userId: string,
    baseAnalysisSessionId?: string,
): Promise<TrainingProgramCycleRow | null> {
    const predicates = [
        eq(trainingProgramCycles.userId, userId),
        inArray(trainingProgramCycles.state, ACTIVE_PROGRAM_STATES),
    ];

    if (baseAnalysisSessionId) {
        predicates.push(eq(trainingProgramCycles.baseAnalysisSessionId, baseAnalysisSessionId));
    }

    const [row] = await db
        .select()
        .from(trainingProgramCycles)
        .where(and(...predicates))
        .orderBy(desc(trainingProgramCycles.updatedAt))
        .limit(1);

    return row ?? null;
}

async function loadOwnedLabSession(
    userId: string,
    labSessionId: string,
): Promise<OwnedLabSessionRow | null> {
    const [row] = await db
        .select({
            id: sprayLabSessions.id,
            baseAnalysisSessionId: sprayLabSessions.baseAnalysisSessionId,
            snapshot: sprayLabSessions.snapshot,
        })
        .from(sprayLabSessions)
        .where(and(
            eq(sprayLabSessions.id, labSessionId),
            eq(sprayLabSessions.userId, userId),
        ))
        .limit(1);

    return row ?? null;
}

async function loadOwnedValidationLink(
    userId: string,
    validationLinkId: string,
): Promise<OwnedValidationLinkRow | null> {
    const [row] = await db
        .select({
            id: sprayLabValidationLinks.id,
            labSessionId: sprayLabValidationLinks.labSessionId,
            baseAnalysisSessionId: sprayLabValidationLinks.baseAnalysisSessionId,
            payload: sprayLabValidationLinks.payload,
        })
        .from(sprayLabValidationLinks)
        .where(and(
            eq(sprayLabValidationLinks.id, validationLinkId),
            eq(sprayLabValidationLinks.userId, userId),
        ))
        .limit(1);

    return row ?? null;
}

function ensureEvidenceBelongsToCycle(
    cycle: TrainingProgramCycleSnapshot,
    labSession: OwnedLabSessionRow | null,
    validationLink: OwnedValidationLinkRow | null,
): string | null {
    if (labSession && labSession.baseAnalysisSessionId !== cycle.baseAnalysisId) {
        return 'Sessao Lab nao pertence a analise base do ciclo.';
    }

    if (validationLink && validationLink.baseAnalysisSessionId !== cycle.baseAnalysisId) {
        return 'Validacao nao pertence a analise base do ciclo.';
    }

    if (validationLink && labSession && validationLink.labSessionId !== labSession.id) {
        return 'Validacao nao pertence a sessao Lab informada.';
    }

    return null;
}

async function resolveOptionalEvidence(
    userId: string,
    cycle: TrainingProgramCycleSnapshot,
    input: {
        readonly labSessionId?: string;
        readonly validationLinkId?: string;
    },
): Promise<TrainingProgramActionResult<{
    readonly labSession: OwnedLabSessionRow | null;
    readonly validationLink: OwnedValidationLinkRow | null;
}>> {
    const labSession = input.labSessionId
        ? await loadOwnedLabSession(userId, input.labSessionId)
        : null;

    if (input.labSessionId && !labSession) {
        return { success: false, error: 'Sessao Lab nao encontrada.' };
    }

    const validationLink = input.validationLinkId
        ? await loadOwnedValidationLink(userId, input.validationLinkId)
        : null;

    if (input.validationLinkId && !validationLink) {
        return { success: false, error: 'Validacao compativel nao encontrada.' };
    }

    const ownershipError = ensureEvidenceBelongsToCycle(cycle, labSession, validationLink);
    if (ownershipError) {
        return { success: false, error: ownershipError };
    }

    return {
        success: true,
        value: {
            labSession,
            validationLink,
        },
    };
}

function evidenceSummaryWithRefs(
    cycle: TrainingProgramCycleSnapshot,
    labSession: OwnedLabSessionRow | null,
    validationLink: OwnedValidationLinkRow | null,
): TrainingProgramEvidenceSummary {
    const blockers = validationLink?.payload.blockers.length
        ? ['variable_changed' as const]
        : cycle.evidenceSummary.blockers;
    const labEvidence = labSession
        ? {
            sprayLabSession: labSession.snapshot,
            fidelityReasonCodes: labSession.snapshot.fidelity?.reasonCodes ?? [],
            ...(labSession.snapshot.fidelity?.tier ? {
                fidelityTier: labSession.snapshot.fidelity.tier,
            } : {}),
        }
        : {};

    return {
        ...cycle.evidenceSummary,
        ...labEvidence,
        ...(validationLink ? {
            validationLink: validationLink.payload,
            validationStatus: validationLink.payload.status,
            ...(validationLink.payload.precisionTrend ? {
                precisionTrend: validationLink.payload.precisionTrend,
            } : {}),
        } : {}),
        blockers,
        summary: validationLink
            ? `Validacao ${validationLink.payload.status} anexada ao ciclo.`
            : cycle.evidenceSummary.summary,
    };
}

function cycleRowValues(
    userId: string,
    baseAnalysisSessionId: string,
    cycle: TrainingProgramCycleSnapshot,
    protocolRevisionId?: string,
) {
    return {
        id: cycle.id,
        userId,
        baseAnalysisSessionId,
        ...(protocolRevisionId ? { protocolRevisionId } : {}),
        ...(cycle.evidenceSummary.protocolId ? { protocolId: cycle.evidenceSummary.protocolId } : {}),
        activeLineId: cycle.activeLine?.lineId ?? null,
        activeLineContextKey: cycle.activeLine?.contextKey ?? cycle.strictContextKey,
        strictContextKey: cycle.strictContextKey,
        kind: cycle.kind,
        state: cycle.state,
        currentWeekNumber: cycle.currentWeekNumber,
        currentMissionId: cycle.currentMissionId,
        recoveryAction: cycle.recoveryAction,
        reasonCodes: cycle.reasonCodes,
        visibleReason: visibleReasonFor(cycle.reasonCodes, cycle.evidenceSummary.summary),
        blockerSummary: blockerSummaryFor(cycle.reasonCodes),
        snapshot: cycle,
        payload: { snapshot: cycle },
        createdAt: new Date(cycle.createdAt),
        updatedAt: new Date(cycle.updatedAt),
        ...(cycle.state === 'concluido' ? { completedAt: new Date(cycle.updatedAt) } : {}),
    };
}

function weekRowValues(userId: string, cycleId: string, week: TrainingProgramCycleSnapshot['weeks'][number]) {
    return {
        id: week.id,
        userId,
        cycleId,
        weekNumber: week.weekNumber,
        state: week.state,
        recoveryAction: week.recoveryAction,
        reasonCodes: week.reasonCodes,
        canIncreaseDifficulty: week.canIncreaseDifficulty,
        snapshot: week,
        payload: { week },
        ...(week.startedAt ? { startedAt: new Date(week.startedAt) } : {}),
        ...(week.closedAt ? { closedAt: new Date(week.closedAt) } : {}),
        updatedAt: new Date(),
    };
}

function missionRowValues(
    userId: string,
    cycleId: string,
    mission: TrainingProgramMission,
    protocolRevisionId?: string,
) {
    return {
        id: mission.id,
        userId,
        cycleId,
        weekId: `${cycleId}:week:${mission.weekNumber}`,
        weekNumber: mission.weekNumber,
        slot: mission.slot,
        category: mission.category,
        status: mission.status,
        stateAfterCompletion: mission.stateAfterCompletion,
        ...(protocolRevisionId ? { protocolRevisionId } : {}),
        ...(mission.protocolId ? { protocolId: mission.protocolId } : {}),
        ...(mission.labSessionId ? { labSessionId: mission.labSessionId } : {}),
        ...(mission.validationLinkId ? { validationLinkId: mission.validationLinkId } : {}),
        reasonCodes: mission.reasonCodes,
        evidenceRefs: mission.evidenceRefs,
        visibleReason: visibleReasonFor(mission.reasonCodes, mission.anatomy.porQueImporta),
        snapshot: mission,
        payload: { mission },
        ...(mission.status === 'active' ? { startedAt: new Date() } : {}),
        ...(mission.status === 'completed' ? { completedAt: new Date() } : {}),
        updatedAt: new Date(),
    };
}

function checkpointRowValues(
    userId: string,
    cycleId: string,
    checkpoint: TrainingProgramCheckpoint,
    evidence: {
        readonly labSession: OwnedLabSessionRow | null;
        readonly validationLink: OwnedValidationLinkRow | null;
    },
) {
    return {
        id: checkpoint.id,
        userId,
        cycleId,
        ...(checkpoint.weekNumber ? { weekId: `${cycleId}:week:${checkpoint.weekNumber}` } : {}),
        ...(checkpoint.weekNumber ? { weekNumber: checkpoint.weekNumber } : {}),
        layer: checkpoint.layer,
        state: checkpoint.state,
        outcome: checkpoint.outcome,
        nextRecommendation: checkpoint.nextRecommendation,
        canIncreaseDifficulty: checkpoint.canIncreaseDifficulty,
        ...(evidence.labSession ? { labSessionId: evidence.labSession.id } : {}),
        ...(evidence.validationLink ? { validationLinkId: evidence.validationLink.id } : {}),
        ...(checkpoint.evidenceSummary.precisionCheckpoint ? {
            precisionCheckpointId: checkpoint.evidenceSummary.precisionCheckpoint.id,
        } : {}),
        reasonCodes: checkpoint.reasonCodes,
        evidenceSnapshot: checkpoint.evidenceSummary,
        snapshot: checkpoint,
        payload: { checkpoint },
        summary: checkpoint.summary,
        createdAt: new Date(checkpoint.createdAt),
    };
}

function eventRowValues(userId: string, event: TrainingProgramTransitionEvent) {
    return {
        id: event.id,
        userId,
        cycleId: event.cycleId,
        ...(event.missionId ? { missionId: event.missionId } : {}),
        ...(event.checkpointId ? { checkpointId: event.checkpointId } : {}),
        eventType: event.type,
        fromState: event.fromState,
        toState: event.toState,
        reasonCodes: event.reasonCodes,
        evidenceRefs: event.evidenceRefs,
        userVisibleReason: event.userVisibleReason,
        payload: { event },
        occurredAt: new Date(event.occurredAt),
        createdAt: new Date(),
    };
}

async function insertCycleGraph(
    userId: string,
    baseAnalysisSessionId: string,
    cycle: TrainingProgramCycleSnapshot,
    protocolRevisionId?: string,
): Promise<void> {
    await db.insert(trainingProgramCycles).values(cycleRowValues(
        userId,
        baseAnalysisSessionId,
        cycle,
        protocolRevisionId,
    ));

    if (cycle.weeks.length > 0) {
        await db.insert(trainingProgramWeeks).values(cycle.weeks.map((week) => weekRowValues(userId, cycle.id, week)));
    }

    const missions = cycle.weeks.flatMap((week) => week.missions);
    if (missions.length > 0) {
        await db.insert(trainingProgramMissions).values(missions.map((mission) => (
            missionRowValues(userId, cycle.id, mission, protocolRevisionId)
        )));
    }
}

async function persistCycleSnapshot(
    row: TrainingProgramCycleRow,
    cycle: TrainingProgramCycleSnapshot,
): Promise<void> {
    await db.update(trainingProgramCycles)
        .set({
            state: cycle.state,
            currentWeekNumber: cycle.currentWeekNumber,
            currentMissionId: cycle.currentMissionId,
            recoveryAction: cycle.recoveryAction,
            reasonCodes: cycle.reasonCodes,
            visibleReason: visibleReasonFor(cycle.reasonCodes, cycle.evidenceSummary.summary),
            blockerSummary: blockerSummaryFor(cycle.reasonCodes),
            activeLineId: cycle.activeLine?.lineId ?? row.activeLineId,
            activeLineContextKey: cycle.activeLine?.contextKey ?? row.activeLineContextKey,
            strictContextKey: cycle.strictContextKey,
            snapshot: cycle,
            payload: { snapshot: cycle },
            updatedAt: new Date(cycle.updatedAt),
            ...(cycle.state === 'concluido' ? { completedAt: new Date(cycle.updatedAt) } : {}),
        })
        .where(and(
            eq(trainingProgramCycles.id, row.id),
            eq(trainingProgramCycles.userId, row.userId),
        ));

    for (const week of cycle.weeks) {
        await db.update(trainingProgramWeeks)
            .set({
                state: week.state,
                recoveryAction: week.recoveryAction,
                reasonCodes: week.reasonCodes,
                canIncreaseDifficulty: week.canIncreaseDifficulty,
                snapshot: week,
                payload: { week },
                ...(week.startedAt ? { startedAt: new Date(week.startedAt) } : {}),
                ...(week.closedAt ? { closedAt: new Date(week.closedAt) } : {}),
                updatedAt: new Date(cycle.updatedAt),
            })
            .where(and(
                eq(trainingProgramWeeks.id, week.id),
                eq(trainingProgramWeeks.userId, row.userId),
            ));
    }
}

async function persistMissionSnapshot(
    userId: string,
    mission: TrainingProgramMission,
): Promise<void> {
    await db.update(trainingProgramMissions)
        .set({
            status: mission.status,
            reasonCodes: mission.reasonCodes,
            evidenceRefs: mission.evidenceRefs,
            visibleReason: visibleReasonFor(mission.reasonCodes, mission.anatomy.porQueImporta),
            snapshot: mission,
            payload: { mission },
            ...(mission.labSessionId ? { labSessionId: mission.labSessionId } : {}),
            ...(mission.validationLinkId ? { validationLinkId: mission.validationLinkId } : {}),
            ...(mission.status === 'active' ? { startedAt: new Date() } : {}),
            ...(mission.status === 'completed' ? { completedAt: new Date() } : {}),
            updatedAt: new Date(),
        })
        .where(and(
            eq(trainingProgramMissions.id, mission.id),
            eq(trainingProgramMissions.userId, userId),
        ));
}

async function persistEvent(userId: string, event: TrainingProgramTransitionEvent): Promise<void> {
    await db.insert(trainingProgramEvents).values(eventRowValues(userId, event));
}

async function persistCheckpoint(
    userId: string,
    cycleId: string,
    checkpoint: TrainingProgramCheckpoint,
    evidence: {
        readonly labSession: OwnedLabSessionRow | null;
        readonly validationLink: OwnedValidationLinkRow | null;
    },
): Promise<void> {
    await db.insert(trainingProgramCheckpoints).values(checkpointRowValues(
        userId,
        cycleId,
        checkpoint,
        evidence,
    ));
}

async function archiveExistingCycle(row: TrainingProgramCycleRow, archivedAt: string): Promise<void> {
    await db.update(trainingProgramCycles)
        .set({
            state: 'linha_reiniciada',
            archivedAt: new Date(archivedAt),
            updatedAt: new Date(archivedAt),
        })
        .where(and(
            eq(trainingProgramCycles.id, row.id),
            eq(trainingProgramCycles.userId, row.userId),
        ));
}

export async function createTrainingProgramCycleAction(
    input: CreateTrainingProgramCycleActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const baseSession = await loadOwnedAnalysisSession(userId, input.baseAnalysisSessionId);
    if (!baseSession) {
        return { success: false, error: 'Analise base nao encontrada.' };
    }

    const analysisResult = readAnalysisResultFromFullResult(baseSession);
    if (!analysisResult) {
        return { success: false, error: 'Analise base sem resultado completo.' };
    }

    const protocolRevision = input.protocolRevisionId
        ? await loadProtocolRevision(userId, baseSession.id, input.protocolRevisionId)
        : null;

    if (input.protocolRevisionId && !protocolRevision) {
        return { success: false, error: 'Revisao de protocolo nao pertence a analise base.' };
    }

    const protocol = protocolRevision?.revisedProtocol ?? readCompleteProtocolFromFullResult(baseSession.fullResult);
    const previousCycle = await loadLatestActiveCycleRow(userId);
    const now = normalizeOccurredAt(input.now);
    const cycle = createTrainingProgramCycle({
        analysisResult,
        protocol,
        activeLine: previousCycle?.snapshot.activeLine ?? null,
        archivedLines: previousCycle?.snapshot.archivedLines ?? [],
        now,
    });

    if (previousCycle && cycle.reasonCodes.includes('line_restart')) {
        await archiveExistingCycle(previousCycle, now);
    }

    await insertCycleGraph(userId, baseSession.id, cycle, protocolRevision?.id);

    revalidateTrainingProgramPaths(baseSession.id);

    return { success: true, value: cycle };
}

export async function getActiveTrainingProgramCycleAction(
    input: GetActiveTrainingProgramCycleActionInput = {},
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot | null>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadLatestActiveCycleRow(userId, input.baseAnalysisSessionId);

    return { success: true, value: row?.snapshot ?? null };
}

export async function getTrainingProgramCycleAction(
    input: GetTrainingProgramCycleActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedCycleRow(userId, input.cycleId);
    if (!row) {
        return { success: false, error: 'Ciclo Pro nao encontrado.' };
    }

    return { success: true, value: row.snapshot };
}

export async function completeTrainingProgramMissionAction(
    input: CompleteTrainingProgramMissionActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedCycleRow(userId, input.cycleId);
    if (!row) {
        return { success: false, error: 'Ciclo Pro nao encontrado.' };
    }

    const cycle = row.snapshot;
    const mission = findMission(cycle, input.missionId);
    if (!mission) {
        return { success: false, error: 'Missao do Ciclo Pro nao encontrada.' };
    }

    if (mission.status === 'completed') {
        return { success: true, value: cycle };
    }

    if (cycle.currentMissionId && input.missionId !== cycle.currentMissionId) {
        return { success: false, error: 'Conclua a missao atual antes de pular blockers do ciclo.' };
    }

    const evidenceResult = await resolveOptionalEvidence(userId, cycle, input);
    if (!evidenceResult.success) {
        return evidenceResult;
    }

    const { labSession, validationLink } = evidenceResult.value;
    const reasonCodes = filterReasonCodes(input.reasonCodes);
    if (
        mission.stateAfterCompletion === 'progresso_validado'
        && !isCompatibleValidation(validationLink?.payload ?? null)
    ) {
        return { success: false, error: 'Progresso tecnico exige validacao compativel confirmada.' };
    }

    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const evidenceRefs = evidenceRefsWith(mission.evidenceRefs, labSession, validationLink);
    const event: TrainingProgramTransitionEvent = {
        id: randomUUID(),
        cycleId: cycle.id,
        type: 'mission_completed',
        occurredAt,
        fromState: cycle.state,
        toState: mission.stateAfterCompletion,
        reasonCodes,
        userVisibleReason: visibleReasonFor(reasonCodes, 'Missao concluida com evidencia do ciclo preservada.'),
        evidenceRefs,
        missionId: mission.id,
    };
    const reduced = reduceTrainingProgramEvent(cycle, event);
    const nextCycle = withUpdatedMission(reduced, mission.id, (current) => ({
        ...current,
        status: 'completed',
        ...(labSession ? { labSessionId: labSession.id } : {}),
        ...(validationLink ? { validationLinkId: validationLink.id } : {}),
        evidenceRefs,
        reasonCodes: Array.from(new Set([...current.reasonCodes, ...reasonCodes])),
    }));
    const updatedMission = findMission(nextCycle, mission.id);

    await persistEvent(userId, event);
    await persistCycleSnapshot(row, nextCycle);
    if (updatedMission) {
        await persistMissionSnapshot(userId, updatedMission);
    }

    revalidateTrainingProgramPaths(row.baseAnalysisSessionId);

    return { success: true, value: nextCycle };
}

export async function closeTrainingProgramWeekAction(
    input: CloseTrainingProgramWeekActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    return recordProgramCheckpoint({
        cycleId: input.cycleId,
        layer: 'weekly_operational',
        ...(input.weekNumber ? { weekNumber: input.weekNumber } : {}),
        ...(input.labSessionId ? { labSessionId: input.labSessionId } : {}),
        ...(input.validationLinkId ? { validationLinkId: input.validationLinkId } : {}),
        ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    });
}

export async function recordTrainingProgramCheckpointAction(
    input: RecordTrainingProgramCheckpointActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    return recordProgramCheckpoint(input);
}

async function recordProgramCheckpoint(
    input: RecordTrainingProgramCheckpointActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedCycleRow(userId, input.cycleId);
    if (!row) {
        return { success: false, error: 'Ciclo Pro nao encontrado.' };
    }

    const cycle = row.snapshot;
    const evidenceResult = await resolveOptionalEvidence(userId, cycle, input);
    if (!evidenceResult.success) {
        return evidenceResult;
    }

    const { labSession, validationLink } = evidenceResult.value;
    const evidenceSummary = evidenceSummaryWithRefs(cycle, labSession, validationLink);
    const occurredAt = normalizeOccurredAt(input.occurredAt);
    let checkpoint: TrainingProgramCheckpoint | null;

    if (input.layer === 'technical_validated') {
        if (!isCompatibleValidation(validationLink?.payload ?? null)) {
            return { success: false, error: 'Checkpoint tecnico exige validacao compativel confirmada.' };
        }

        checkpoint = buildTrainingProgramTechnicalCheckpoint({
            cycle,
            evidenceSummary,
            ...(input.weekNumber ? { weekNumber: input.weekNumber } : {}),
            now: occurredAt,
        });

        if (!checkpoint) {
            return { success: false, error: 'Evidencia insuficiente para checkpoint tecnico.' };
        }
    } else if (input.layer === 'monthly_program') {
        checkpoint = buildTrainingProgramMonthlyCheckpoint({
            cycle,
            evidenceSummary,
            now: occurredAt,
        });
    } else {
        checkpoint = buildTrainingProgramWeeklyCheckpoint({
            cycle,
            evidenceSummary,
            ...(input.weekNumber ? { weekNumber: input.weekNumber } : {}),
            now: occurredAt,
        });
    }

    const event: TrainingProgramTransitionEvent = {
        id: randomUUID(),
        cycleId: cycle.id,
        type: checkpoint.layer === 'monthly_program' && checkpoint.outcome === 'cycle_completed'
            ? 'cycle_completed'
            : 'checkpoint_recorded',
        occurredAt,
        fromState: cycle.state,
        toState: checkpoint.state,
        reasonCodes: checkpoint.reasonCodes,
        userVisibleReason: checkpoint.summary,
        evidenceRefs: evidenceRefsWith(cycle.evidenceSummary.savedAnalysisId
            ? [{
                kind: 'analysis',
                id: cycle.evidenceSummary.savedAnalysisId,
                href: `/history/${cycle.evidenceSummary.savedAnalysisId}`,
            }]
            : [], labSession, validationLink),
        checkpointId: checkpoint.id,
    };
    const reduced = reduceTrainingProgramEvent(cycle, event);
    const nextCycle = withCheckpointAttached(reduced, checkpoint);

    await persistCheckpoint(userId, cycle.id, checkpoint, { labSession, validationLink });
    await persistEvent(userId, event);
    await persistCycleSnapshot(row, nextCycle);

    revalidateTrainingProgramPaths(row.baseAnalysisSessionId);

    return { success: true, value: nextCycle };
}

export async function reenterTrainingProgramCycleAction(
    input: ReenterTrainingProgramCycleActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedCycleRow(userId, input.cycleId);
    if (!row) {
        return { success: false, error: 'Ciclo Pro nao encontrado.' };
    }

    const cycle = row.snapshot;
    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const type: TrainingProgramEventType = input.variableChanged === true
        ? 'variable_changed'
        : input.staleContext === true
            ? 'context_marked_stale'
            : 'missed_day_reentered';
    const reasonCodes: readonly TrainingProgramReasonCode[] = input.variableChanged === true
        ? ['variable_changed']
        : input.staleContext === true
            ? ['stale_context']
            : ['missed_day_reentry'];
    const event: TrainingProgramTransitionEvent = {
        id: randomUUID(),
        cycleId: cycle.id,
        type,
        occurredAt,
        fromState: cycle.state,
        toState: cycle.state,
        reasonCodes,
        userVisibleReason: visibleReasonFor(reasonCodes, 'O ciclo foi reencaixado para preservar evidencia.'),
        evidenceRefs: [],
    };
    const nextCycle = reduceTrainingProgramEvent(cycle, event);

    await persistEvent(userId, event);
    await persistCycleSnapshot(row, nextCycle);

    revalidateTrainingProgramPaths(row.baseAnalysisSessionId);

    return { success: true, value: nextCycle };
}

export async function pauseTrainingProgramCycleAction(
    input: PauseTrainingProgramCycleActionInput,
): Promise<TrainingProgramActionResult<TrainingProgramCycleSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedCycleRow(userId, input.cycleId);
    if (!row) {
        return { success: false, error: 'Ciclo Pro nao encontrado.' };
    }

    const cycle = row.snapshot;
    const reasonCode = input.reasonCode ?? 'stale_context';
    const type: TrainingProgramEventType = reasonCode === 'discomfort_stop'
        ? 'discomfort_reported'
        : reasonCode === 'fatigue_reduced_dose'
            ? 'fatigue_reported'
            : reasonCode === 'missed_day_reentry'
                ? 'missed_day_reentered'
                : 'context_marked_stale';
    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const event: TrainingProgramTransitionEvent = {
        id: randomUUID(),
        cycleId: cycle.id,
        type,
        occurredAt,
        fromState: cycle.state,
        toState: cycle.state,
        reasonCodes: [reasonCode],
        userVisibleReason: trainingProgramReasonCopy(reasonCode),
        evidenceRefs: [],
    };
    const nextCycle = reduceTrainingProgramEvent(cycle, event);

    await persistEvent(userId, event);
    await persistCycleSnapshot(row, nextCycle);

    revalidateTrainingProgramPaths(row.baseAnalysisSessionId);

    return { success: true, value: nextCycle };
}
