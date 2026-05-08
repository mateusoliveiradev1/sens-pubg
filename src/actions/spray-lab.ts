'use server';

import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { calculateSprayLabFidelity, buildSprayLabRepairState } from '@/core/spray-lab-fidelity';
import {
    buildSprayLabBenchmarkSnapshot,
    buildSprayLabIndexSnapshot,
} from '@/core/spray-lab-scoring';
import {
    createSprayLabSessionFromProtocol,
    reduceSprayLabSessionEvent,
} from '@/core/spray-lab-session';
import { db } from '@/db';
import {
    analysisSessions,
    completeTrainingProtocolRevisions,
    sprayLabBenchmarkSnapshots,
    sprayLabSessionEvents,
    sprayLabSessions,
    sprayLabValidationLinks,
    type SprayLabSessionRow,
} from '@/db/schema';
import type {
    CompleteTrainingProtocol,
    PrecisionCompatibilityBlocker,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    SprayLabBenchmarkSnapshot,
    SprayLabFidelityReasonCode,
    SprayLabIndexSnapshot,
    SprayLabSessionEvent,
    SprayLabSessionEventType,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
    SprayLabValidationStatus,
} from '@/types/engine';

export interface CreateSprayLabSessionActionInput {
    readonly baseAnalysisSessionId: string;
    readonly protocolId?: string;
    readonly protocolRevisionId?: string;
}

export interface GetActiveSprayLabSessionActionInput {
    readonly baseAnalysisSessionId?: string;
}

export interface RecordSprayLabSessionEventActionInput {
    readonly labSessionId: string;
    readonly event: Omit<SprayLabSessionEvent, 'sessionId'> & {
        readonly sessionId?: string;
    };
}

export interface CompleteSprayLabSessionActionInput {
    readonly labSessionId: string;
    readonly occurredAt?: string;
}

export interface RecordSprayLabBenchmarkSnapshotActionInput {
    readonly labSessionId: string;
    readonly createdAt?: string;
}

export interface CreateSprayLabValidationLinkActionInput {
    readonly labSessionId: string;
    readonly validationAnalysisSessionId?: string;
    readonly confirmedVariables?: boolean;
}

export interface ResolveSprayLabValidationTargetActionInput {
    readonly labSessionId?: string;
    readonly validationLinkId?: string;
}

export interface SprayLabValidationTarget {
    readonly labSessionId: string;
    readonly validationLinkId: string | null;
    readonly baseAnalysisSessionId: string;
    readonly validationAnalysisSessionId: string | null;
    readonly protocolId: string;
    readonly laneId: string;
    readonly laneLabel: string;
    readonly contextKey: string;
    readonly targetCopy: string;
    readonly weaponId: string | null;
    readonly weaponName: string | null;
    readonly opticId: string | null;
    readonly opticName: string | null;
    readonly distanceMeters: number | null;
    readonly stance: string | null;
    readonly checklist: readonly string[];
    readonly validationStatus: SprayLabValidationStatus;
}

export type SprayLabActionResult<TValue> =
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

type OwnedLabSessionRow = Pick<
    SprayLabSessionRow,
    | 'id'
    | 'userId'
    | 'baseAnalysisSessionId'
    | 'protocolRevisionId'
    | 'protocolId'
    | 'laneId'
    | 'contextKey'
    | 'status'
    | 'snapshot'
>;

type StoredSprayLabEventRow = {
    readonly payload: {
        readonly event?: SprayLabSessionEvent;
    };
    readonly createdAt: Date;
};

const SPRAY_LAB_EVENT_TYPES = new Set<SprayLabSessionEventType>([
    'start',
    'ready',
    'spray_start',
    'spray_end',
    'rest_start',
    'rest_end',
    'quick_check',
    'pause',
    'resume',
    'skip_rep',
    'repeat_rep',
    'report_problem',
    'end_early',
    'complete_result',
    'request_validation',
]);

const SPRAY_LAB_REASON_CODES = new Set<SprayLabFidelityReasonCode>([
    'fatigue_or_pain',
    'variable_changed',
    'skipped_reps',
    'excessive_pause',
    'early_stop',
    'capture_blocker',
    'missing_context',
    'user_confused',
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
        && Array.isArray(value.preparation)
        && isRecord(value.validation);
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

function isSprayLabEventType(value: unknown): value is SprayLabSessionEventType {
    return typeof value === 'string' && SPRAY_LAB_EVENT_TYPES.has(value as SprayLabSessionEventType);
}

function filterReasonCodes(
    reasonCodes: readonly SprayLabFidelityReasonCode[] | undefined,
): readonly SprayLabFidelityReasonCode[] {
    return Array.from(new Set((reasonCodes ?? []).filter((reason) => (
        SPRAY_LAB_REASON_CODES.has(reason)
    ))));
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

function sanitizeEventInput(
    labSessionId: string,
    input: RecordSprayLabSessionEventActionInput['event'],
): SprayLabSessionEvent | null {
    if (!isSprayLabEventType(input.type)) {
        return null;
    }

    const reasonCodes = filterReasonCodes(input.reasonCodes);
    const event: SprayLabSessionEvent = {
        id: typeof input.id === 'string' && input.id.trim().length > 0
            ? input.id
            : randomUUID(),
        sessionId: labSessionId,
        type: input.type,
        occurredAt: normalizeOccurredAt(input.occurredAt),
        ...(typeof input.repIndex === 'number' ? { repIndex: input.repIndex } : {}),
        ...(typeof input.sprayIndex === 'number' ? { sprayIndex: input.sprayIndex } : {}),
        ...(typeof input.completedSprays === 'number' ? { completedSprays: input.completedSprays } : {}),
        ...(reasonCodes.length > 0 ? { reasonCodes } : {}),
        ...(input.variablesChanged === true ? { variablesChanged: true } : {}),
    };

    return event;
}

function isTransitionAllowed(
    session: SprayLabSessionSnapshot,
    eventType: SprayLabSessionEventType,
): boolean {
    if (session.eventIds.includes(eventType)) {
        return true;
    }

    switch (session.status) {
        case 'draft':
            return eventType === 'start'
                || eventType === 'ready'
                || eventType === 'report_problem'
                || eventType === 'complete_result'
                || eventType === 'end_early';
        case 'active':
            return true;
        case 'paused':
            return eventType === 'resume'
                || eventType === 'report_problem'
                || eventType === 'end_early';
        case 'completed':
            return eventType === 'request_validation';
        case 'blocked':
        case 'abandoned':
            return false;
    }
}

function applySessionCompletion(
    session: SprayLabSessionSnapshot,
    events: readonly SprayLabSessionEvent[],
    createdAt: string,
): {
    readonly snapshot: SprayLabSessionSnapshot;
    readonly index: SprayLabIndexSnapshot;
} {
    const completedSession: SprayLabSessionSnapshot = {
        ...session,
        status: 'completed',
        act: 'fechar_resultado',
        stepState: 'resultado',
        updatedAt: createdAt,
    };
    const fidelity = calculateSprayLabFidelity(completedSession, events);
    const index = buildSprayLabIndexSnapshot({
        session: completedSession,
        fidelity,
        validationStatus: completedSession.validationStatus,
        createdAt,
    });
    const repairState = buildSprayLabRepairState(fidelity);
    const snapshot: SprayLabSessionSnapshot = {
        ...completedSession,
        fidelity,
        index,
        ...(repairState ? { repairState } : {}),
    };

    return { snapshot, index };
}

function buildBenchmarkFromSession(
    row: OwnedLabSessionRow,
    snapshot: SprayLabSessionSnapshot,
    index: SprayLabIndexSnapshot,
    createdAt: string,
): SprayLabBenchmarkSnapshot {
    return buildSprayLabBenchmarkSnapshot({
        session: snapshot,
        index,
        createdAt,
        id: `${row.id}:benchmark:${index.validationStatus}:${Date.parse(createdAt)}`,
    });
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

async function loadOwnedLabSession(
    userId: string,
    labSessionId: string,
): Promise<OwnedLabSessionRow | null> {
    const [row] = await db
        .select({
            id: sprayLabSessions.id,
            userId: sprayLabSessions.userId,
            baseAnalysisSessionId: sprayLabSessions.baseAnalysisSessionId,
            protocolRevisionId: sprayLabSessions.protocolRevisionId,
            protocolId: sprayLabSessions.protocolId,
            laneId: sprayLabSessions.laneId,
            contextKey: sprayLabSessions.contextKey,
            status: sprayLabSessions.status,
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

async function loadSessionEvents(
    userId: string,
    labSessionId: string,
): Promise<readonly SprayLabSessionEvent[]> {
    const rows = await db
        .select({
            payload: sprayLabSessionEvents.payload,
            createdAt: sprayLabSessionEvents.createdAt,
        })
        .from(sprayLabSessionEvents)
        .where(and(
            eq(sprayLabSessionEvents.userId, userId),
            eq(sprayLabSessionEvents.labSessionId, labSessionId),
        ))
        .orderBy(sprayLabSessionEvents.createdAt) as readonly StoredSprayLabEventRow[];

    return rows
        .map((row) => row.payload.event)
        .filter((event): event is SprayLabSessionEvent => Boolean(event));
}

async function loadProtocolRevision(
    userId: string,
    baseAnalysisSessionId: string,
    protocolRevisionId: string,
): Promise<CompleteTrainingProtocol | null> {
    const [row] = await db
        .select({
            revisedProtocol: completeTrainingProtocolRevisions.revisedProtocol,
        })
        .from(completeTrainingProtocolRevisions)
        .where(and(
            eq(completeTrainingProtocolRevisions.id, protocolRevisionId),
            eq(completeTrainingProtocolRevisions.userId, userId),
            eq(completeTrainingProtocolRevisions.analysisSessionId, baseAnalysisSessionId),
        ))
        .limit(1);

    return isCompleteTrainingProtocol(row?.revisedProtocol)
        ? row.revisedProtocol
        : null;
}

async function resolveActionUserId(): Promise<string | null> {
    const session = await auth();

    return session?.user?.id ?? null;
}

async function persistSessionSnapshot(
    row: OwnedLabSessionRow,
    snapshot: SprayLabSessionSnapshot,
    completedAt?: Date,
): Promise<void> {
    await db
        .update(sprayLabSessions)
        .set({
            status: snapshot.status,
            act: snapshot.act,
            stepState: snapshot.stepState,
            evidenceLevel: snapshot.index?.evidenceLevel ?? snapshot.fidelity?.evidenceLevel ?? 'practice',
            fidelityTier: snapshot.fidelity?.tier,
            validationStatus: snapshot.validationStatus,
            snapshot,
            payload: { snapshot },
            updatedAt: new Date(snapshot.updatedAt),
            ...(completedAt ? { completedAt } : {}),
        })
        .where(and(
            eq(sprayLabSessions.id, row.id),
            eq(sprayLabSessions.userId, row.userId),
        ));
}

async function persistEvent(
    row: OwnedLabSessionRow,
    event: SprayLabSessionEvent,
    snapshot: SprayLabSessionSnapshot,
): Promise<void> {
    await db
        .insert(sprayLabSessionEvents)
        .values({
            userId: row.userId,
            labSessionId: row.id,
            eventId: event.id,
            eventType: event.type,
            act: snapshot.act,
            stepState: snapshot.stepState,
            occurredAt: new Date(event.occurredAt),
            payload: { event },
        });
}

async function persistBenchmarkSnapshot(
    row: OwnedLabSessionRow,
    benchmark: SprayLabBenchmarkSnapshot,
): Promise<void> {
    await db
        .insert(sprayLabBenchmarkSnapshots)
        .values({
            userId: row.userId,
            labSessionId: row.id,
            baseAnalysisSessionId: row.baseAnalysisSessionId,
            ...(row.protocolRevisionId ? { protocolRevisionId: row.protocolRevisionId } : {}),
            protocolId: benchmark.protocolId,
            laneId: benchmark.laneId,
            contextKey: benchmark.contextKey,
            evidenceLevel: benchmark.evidenceLevel,
            fidelityTier: benchmark.fidelityTier,
            validationStatus: benchmark.validationStatus,
            eligibleForReleaseBenchmark: benchmark.eligibleForReleaseBenchmark,
            snapshot: benchmark,
            createdAt: new Date(benchmark.createdAt),
        });
}

function buildTargetCopy(snapshot: SprayLabSessionSnapshot): string {
    const context = snapshot.protocol.context;
    const weapon = context.weaponName ?? context.weaponId ?? 'arma';
    const optic = context.opticName ?? context.opticId ?? 'mira';
    const distance = context.distanceMeters === undefined
        ? 'distancia do protocolo'
        : `${Math.round(context.distanceMeters)}m`;

    return `Validando ${weapon} - ${optic} - ${distance} - ${snapshot.lane.shortLabel}`;
}

function mapTrendLabelToValidationStatus(
    trend: PrecisionTrendSummary | undefined,
): SprayLabValidationStatus {
    const label: PrecisionTrendLabel | undefined = trend?.label;

    switch (label) {
        case 'validated_progress':
        case 'consolidated':
            return 'validacao_confirmada';
        case 'validated_regression':
            return 'regressao_validada';
        case 'initial_signal':
        case 'in_validation':
            return 'sinal_promissor';
        case 'oscillation':
        case 'baseline':
            return 'sem_mudanca_clara';
        case 'not_comparable':
            return 'nao_compativel';
        case undefined:
            return 'pending';
    }
}

function readPrecisionTrend(fullResult: Record<string, unknown> | null): PrecisionTrendSummary | undefined {
    const trend = fullResult?.precisionTrend;

    if (!isRecord(trend) || typeof trend.label !== 'string') {
        return undefined;
    }

    return trend as unknown as PrecisionTrendSummary;
}

function collectTrendBlockers(
    trend: PrecisionTrendSummary | undefined,
): readonly PrecisionCompatibilityBlocker[] {
    if (!trend) {
        return [];
    }

    return trend.blockedClips.flatMap((clip) => clip.blockers);
}

function buildValidationTarget(
    snapshot: SprayLabSessionSnapshot,
    row: OwnedLabSessionRow,
    link: SprayLabValidationLink | null,
): SprayLabValidationTarget {
    const context = snapshot.protocol.context;

    return {
        labSessionId: row.id,
        validationLinkId: link?.id ?? null,
        baseAnalysisSessionId: row.baseAnalysisSessionId,
        validationAnalysisSessionId: link?.validationAnalysisId ?? null,
        protocolId: snapshot.protocolId,
        laneId: snapshot.lane.id,
        laneLabel: snapshot.lane.label,
        contextKey: snapshot.contextKey,
        targetCopy: link?.targetCopy ?? buildTargetCopy(snapshot),
        weaponId: context.weaponId ?? null,
        weaponName: context.weaponName ?? null,
        opticId: context.opticId ?? null,
        opticName: context.opticName ?? null,
        distanceMeters: context.distanceMeters ?? null,
        stance: context.stance ?? null,
        checklist: snapshot.protocol.validation.compatibleClipChecklist,
        validationStatus: link?.status ?? snapshot.validationStatus,
    };
}

function updateSnapshotValidation(
    snapshot: SprayLabSessionSnapshot,
    validationLink: SprayLabValidationLink,
): SprayLabSessionSnapshot {
    const base: SprayLabSessionSnapshot = {
        ...snapshot,
        validationStatus: validationLink.status,
        validationLink,
        updatedAt: validationLink.updatedAt,
    };

    if (!snapshot.fidelity) {
        return base;
    }

    const index = buildSprayLabIndexSnapshot({
        session: base,
        fidelity: snapshot.fidelity,
        validationStatus: validationLink.status,
        ...(validationLink.precisionTrend ? { precisionTrend: validationLink.precisionTrend } : {}),
        createdAt: validationLink.updatedAt,
    });

    return {
        ...base,
        index,
    };
}

export async function createSprayLabSessionAction(
    input: CreateSprayLabSessionActionInput,
): Promise<SprayLabActionResult<SprayLabSessionSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const baseSession = await loadOwnedAnalysisSession(userId, input.baseAnalysisSessionId);
    if (!baseSession) {
        return { success: false, error: 'Analise base nao encontrada.' };
    }

    const baseProtocol = input.protocolRevisionId
        ? await loadProtocolRevision(userId, baseSession.id, input.protocolRevisionId)
        : readCompleteProtocolFromFullResult(baseSession.fullResult);

    if (!baseProtocol) {
        return { success: false, error: 'Analise base sem protocolo completo.' };
    }

    if (input.protocolId && input.protocolId !== baseProtocol.id) {
        return { success: false, error: 'Protocolo nao pertence a analise base.' };
    }

    const createdAt = new Date().toISOString();
    const snapshot = createSprayLabSessionFromProtocol({
        protocol: baseProtocol,
        sessionId: randomUUID(),
        baseAnalysisId: baseSession.id,
        createdAt,
    });

    await db
        .insert(sprayLabSessions)
        .values({
            id: snapshot.id,
            userId,
            baseAnalysisSessionId: baseSession.id,
            ...(input.protocolRevisionId ? { protocolRevisionId: input.protocolRevisionId } : {}),
            protocolId: snapshot.protocolId,
            laneId: snapshot.lane.id,
            contextKey: snapshot.contextKey,
            status: snapshot.status,
            act: snapshot.act,
            stepState: snapshot.stepState,
            evidenceLevel: 'practice',
            validationStatus: snapshot.validationStatus,
            snapshot,
            payload: { snapshot },
            createdAt: new Date(snapshot.createdAt),
            updatedAt: new Date(snapshot.updatedAt),
        });

    revalidatePath('/spray-lab');
    revalidatePath('/dashboard');
    revalidatePath(`/history/${baseSession.id}`);

    return { success: true, value: snapshot };
}

export async function getActiveSprayLabSessionAction(
    input: GetActiveSprayLabSessionActionInput = {},
): Promise<SprayLabActionResult<SprayLabSessionSnapshot | null>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const predicates = [
        eq(sprayLabSessions.userId, userId),
        inArray(sprayLabSessions.status, ['draft', 'active', 'paused', 'blocked']),
    ];

    if (input.baseAnalysisSessionId) {
        predicates.push(eq(sprayLabSessions.baseAnalysisSessionId, input.baseAnalysisSessionId));
    }

    const [row] = await db
        .select({ snapshot: sprayLabSessions.snapshot })
        .from(sprayLabSessions)
        .where(and(...predicates))
        .orderBy(desc(sprayLabSessions.updatedAt))
        .limit(1);

    return { success: true, value: row?.snapshot ?? null };
}

export async function recordSprayLabSessionEventAction(
    input: RecordSprayLabSessionEventActionInput,
): Promise<SprayLabActionResult<SprayLabSessionSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedLabSession(userId, input.labSessionId);
    if (!row) {
        return { success: false, error: 'Sessao Lab nao encontrada.' };
    }

    const event = sanitizeEventInput(row.id, input.event);
    if (!event) {
        return { success: false, error: 'Evento Lab invalido.' };
    }

    if (row.snapshot.eventIds.includes(event.id)) {
        return { success: true, value: row.snapshot };
    }

    if (!isTransitionAllowed(row.snapshot, event.type)) {
        return { success: false, error: 'Transicao Lab invalida para o estado atual.' };
    }

    const nextSnapshot = reduceSprayLabSessionEvent(row.snapshot, event);

    await persistEvent(row, event, nextSnapshot);
    await persistSessionSnapshot(row, nextSnapshot);

    revalidatePath('/spray-lab');
    revalidatePath('/dashboard');
    revalidatePath(`/history/${row.baseAnalysisSessionId}`);

    return { success: true, value: nextSnapshot };
}

export async function completeSprayLabSessionAction(
    input: CompleteSprayLabSessionActionInput,
): Promise<SprayLabActionResult<SprayLabSessionSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedLabSession(userId, input.labSessionId);
    if (!row) {
        return { success: false, error: 'Sessao Lab nao encontrada.' };
    }

    const occurredAt = normalizeOccurredAt(input.occurredAt);
    const events = await loadSessionEvents(userId, row.id);
    const completeEvent: SprayLabSessionEvent = {
        id: randomUUID(),
        sessionId: row.id,
        type: 'complete_result',
        occurredAt,
    };
    const reduced = row.snapshot.status === 'completed'
        ? row.snapshot
        : reduceSprayLabSessionEvent(row.snapshot, completeEvent);
    const finalEvents = row.snapshot.status === 'completed'
        ? events
        : [...events, completeEvent];
    const { snapshot } = applySessionCompletion(reduced, finalEvents, occurredAt);

    if (row.snapshot.status !== 'completed') {
        await persistEvent(row, completeEvent, snapshot);
    }

    await persistSessionSnapshot(row, snapshot, new Date(occurredAt));

    revalidatePath('/spray-lab');
    revalidatePath('/dashboard');
    revalidatePath(`/history/${row.baseAnalysisSessionId}`);

    return { success: true, value: snapshot };
}

export async function recordSprayLabBenchmarkSnapshotAction(
    input: RecordSprayLabBenchmarkSnapshotActionInput,
): Promise<SprayLabActionResult<SprayLabBenchmarkSnapshot>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedLabSession(userId, input.labSessionId);
    if (!row) {
        return { success: false, error: 'Sessao Lab nao encontrada.' };
    }

    const createdAt = normalizeOccurredAt(input.createdAt);
    const events = await loadSessionEvents(userId, row.id);
    const fidelity = row.snapshot.fidelity ?? calculateSprayLabFidelity(row.snapshot, events);
    const index = row.snapshot.index ?? buildSprayLabIndexSnapshot({
        session: row.snapshot,
        fidelity,
        validationStatus: row.snapshot.validationStatus,
        createdAt,
    });
    const snapshot = row.snapshot.index && row.snapshot.fidelity
        ? row.snapshot
        : {
            ...row.snapshot,
            fidelity,
            index,
        };
    const benchmark = buildBenchmarkFromSession(row, snapshot, index, createdAt);

    await persistBenchmarkSnapshot(row, benchmark);

    revalidatePath('/spray-lab');
    revalidatePath('/dashboard');

    return { success: true, value: benchmark };
}

export async function createSprayLabValidationLinkAction(
    input: CreateSprayLabValidationLinkActionInput,
): Promise<SprayLabActionResult<SprayLabValidationLink>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    const row = await loadOwnedLabSession(userId, input.labSessionId);
    if (!row) {
        return { success: false, error: 'Sessao Lab nao encontrada.' };
    }

    const baseSession = await loadOwnedAnalysisSession(userId, row.baseAnalysisSessionId);
    if (!baseSession) {
        return { success: false, error: 'Analise base nao encontrada.' };
    }

    const validationSession = input.validationAnalysisSessionId
        ? await loadOwnedAnalysisSession(userId, input.validationAnalysisSessionId)
        : null;

    if (input.validationAnalysisSessionId && !validationSession) {
        return { success: false, error: 'Clip de validacao nao encontrado.' };
    }

    const confirmedVariables = input.confirmedVariables === true;
    const precisionTrend = readPrecisionTrend(validationSession?.fullResult ?? null);
    const blockers = confirmedVariables
        ? collectTrendBlockers(precisionTrend)
        : [{
            code: 'evidence_mismatch',
            field: 'variables',
            message: 'Variaveis alteradas rebaixam a tentativa para pratica ou evidencia fraca.',
        } satisfies PrecisionCompatibilityBlocker];
    const status = confirmedVariables
        ? mapTrendLabelToValidationStatus(precisionTrend)
        : 'nao_compativel';
    const now = new Date().toISOString();
    const link: SprayLabValidationLink = {
        version: 'spray-lab-v1',
        id: randomUUID(),
        labSessionId: row.id,
        baseAnalysisId: row.baseAnalysisSessionId,
        ...(validationSession ? { validationAnalysisId: validationSession.id } : {}),
        contextKey: row.contextKey,
        targetCopy: buildTargetCopy(row.snapshot),
        status,
        confirmedVariables,
        blockers,
        ...(precisionTrend ? { precisionTrend } : {}),
        createdAt: now,
        updatedAt: now,
    };
    const updatedSnapshot = updateSnapshotValidation(row.snapshot, link);

    await db
        .insert(sprayLabValidationLinks)
        .values({
            id: link.id,
            userId,
            labSessionId: row.id,
            baseAnalysisSessionId: row.baseAnalysisSessionId,
            ...(validationSession ? { validationAnalysisSessionId: validationSession.id } : {}),
            contextKey: row.contextKey,
            status,
            confirmedVariables,
            payload: link,
            createdAt: new Date(now),
            updatedAt: new Date(now),
        });

    await persistSessionSnapshot(row, updatedSnapshot);

    revalidatePath('/spray-lab');
    revalidatePath('/dashboard');
    revalidatePath(`/history/${row.baseAnalysisSessionId}`);
    if (validationSession) {
        revalidatePath(`/history/${validationSession.id}`);
    }

    return { success: true, value: link };
}

export async function resolveSprayLabValidationTargetAction(
    input: ResolveSprayLabValidationTargetActionInput,
): Promise<SprayLabActionResult<SprayLabValidationTarget>> {
    const userId = await resolveActionUserId();
    if (!userId) {
        return { success: false, error: 'Nao autenticado.' };
    }

    if (input.validationLinkId) {
        const [linkRow] = await db
            .select({
                payload: sprayLabValidationLinks.payload,
            })
            .from(sprayLabValidationLinks)
            .where(and(
                eq(sprayLabValidationLinks.id, input.validationLinkId),
                eq(sprayLabValidationLinks.userId, userId),
            ))
            .limit(1);
        const link = linkRow?.payload ?? null;

        if (!link) {
            return { success: false, error: 'Alvo de validacao nao encontrado.' };
        }

        const row = await loadOwnedLabSession(userId, link.labSessionId);
        if (!row) {
            return { success: false, error: 'Sessao Lab nao encontrada.' };
        }

        return { success: true, value: buildValidationTarget(row.snapshot, row, link) };
    }

    if (!input.labSessionId) {
        return { success: false, error: 'Informe a sessao Lab ou o link de validacao.' };
    }

    const row = await loadOwnedLabSession(userId, input.labSessionId);
    if (!row) {
        return { success: false, error: 'Alvo de validacao nao encontrado.' };
    }

    return { success: true, value: buildValidationTarget(row.snapshot, row, row.snapshot.validationLink ?? null) };
}
