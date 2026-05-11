import {
    redactTeamCoachReportForWorkspace,
    teamCoachSafeSectionKeyValues,
    type TeamCoachSafeReportSnapshot,
    type TeamCoachSafeSectionKey,
} from '@/core/team-coach-report-redaction';
import {
    isTeamCoachNextActionKind,
    isTeamCoachReviewStatus,
    type TeamCoachNextActionKind,
    type TeamCoachReviewStatus,
} from '@/types/team-coach';

export type TeamCoachDossierSourceKind =
    | 'analysis'
    | 'history'
    | 'protocol'
    | 'spray_lab'
    | 'program'
    | 'validation';

export interface TeamCoachDossierSource {
    readonly kind: TeamCoachDossierSourceKind;
    readonly sourceId: string;
}

export interface TeamCoachDossierSharedReport {
    readonly shareId: string;
    readonly shareStatus: string;
    readonly consentStatus: string;
    readonly safeSnapshotReadable: true;
    readonly privateSourceReloadAllowed: boolean;
    readonly sourceList: readonly TeamCoachDossierSource[];
    readonly contextLabel: string;
    readonly confidence: number | null;
    readonly coverage: number | null;
    readonly validationState: string;
    readonly blockers: readonly string[];
    readonly updatedAt: string | null;
    readonly revokedAt: string | null;
}

export interface TeamCoachDossierEvidenceLayer {
    readonly kind: TeamCoachSafeSectionKey;
    readonly title: string;
    readonly summary: string;
    readonly sourceId: string | null;
    readonly countsAsTechnicalTruth: boolean;
    readonly countsAsDeterministicTruth: boolean;
}

export interface TeamCoachDossierAuditRow {
    readonly eventType: string;
    readonly shareId: string | null;
    readonly actorUserId: string | null;
    readonly targetUserId: string | null;
    readonly workspaceId: string | null;
    readonly createdAt: string;
    readonly reasonCode: string | null;
}

export interface BuildTeamCoachPlayerDossierInput {
    readonly workspace?: Record<string, unknown> | null;
    readonly player?: Record<string, unknown> | null;
    readonly shares?: readonly Record<string, unknown>[];
    readonly reviewNotes?: readonly Record<string, unknown>[];
    readonly reviewStatusEvents?: readonly Record<string, unknown>[];
    readonly auditEvents?: readonly Record<string, unknown>[];
    readonly activeCoachLoop?: Record<string, unknown> | null;
    readonly sprayLab?: Record<string, unknown> | null;
    readonly trainingProgram?: Record<string, unknown> | null;
    readonly now?: Date | string | null;
}

export interface TeamCoachPlayerDossierViewModel {
    readonly workspace: {
        readonly id: string;
        readonly name: string;
    };
    readonly player: {
        readonly id: string;
        readonly displayName: string;
    };
    readonly generatedAt: string;
    readonly sharedReports: readonly TeamCoachDossierSharedReport[];
    readonly activeContext: {
        readonly latestReviewStatus: {
            readonly key: TeamCoachReviewStatus | string;
            readonly label: string;
        };
        readonly requestedNextAction: {
            readonly key: TeamCoachNextActionKind | string;
            readonly label: string;
        };
        readonly sourceAccess: 'active_shared_source' | 'revoked_snapshot_only' | 'no_shared_source';
        readonly compatibleValidation: {
            readonly state: string;
            readonly countsAsTechnicalTruth: boolean;
        };
        readonly activeCoachLoop: Record<string, unknown> | null;
        readonly sprayLabState: Record<string, unknown> | null;
        readonly trainingProgramState: Record<string, unknown> | null;
    };
    readonly evidenceLayers: readonly TeamCoachDossierEvidenceLayer[];
    readonly recentBlockers: readonly string[];
    readonly coachNotesSummary: {
        readonly count: number;
        readonly latest: string | null;
        readonly requestedNextAction: TeamCoachNextActionKind | string | null;
    };
    readonly reviewStatusSummary: Readonly<Record<TeamCoachReviewStatus | string, number>>;
    readonly auditTimeline: readonly TeamCoachDossierAuditRow[];
}

const SECTION_TITLES: Record<TeamCoachSafeSectionKey, string> = {
    technical_proof: 'Technical proof',
    training_execution: 'Training execution',
    practical_transfer: 'Practical transfer',
    compatible_validation: 'Compatible validation',
    blockers: 'Blockers',
    repairs: 'Repairs',
    coach_notes: 'Coach review notes',
    current_state: 'Current state',
};

const DEFAULT_SECTION_SUMMARIES: Record<TeamCoachSafeSectionKey, string> = {
    technical_proof: 'Technical evidence is limited to the shared safe snapshot.',
    training_execution: 'Training execution is audit context and does not override analysis.',
    practical_transfer: 'Practical transfer does not replace compatible validation.',
    compatible_validation: 'Compatible validation remains the technical proof path.',
    blockers: 'Current blockers remain visible for triage.',
    repairs: 'Repair guidance stays separate from progress claims.',
    coach_notes: 'Coach notes are private human review context.',
    current_state: 'Current state is summarized without full private history.',
};

const REVIEW_STATUS_LABELS: Record<TeamCoachReviewStatus, string> = {
    needs_review: 'Needs review',
    reviewed: 'Reviewed',
    waiting_player: 'Waiting on player',
    validation_requested: 'Validation requested',
    repair_requested: 'Repair requested',
    archived: 'Archived',
};

const NEXT_ACTION_LABELS: Record<TeamCoachNextActionKind, string> = {
    review_report: 'Review report',
    request_validation: 'Request compatible clip',
    request_repair: 'Request blocker repair',
    invite_player: 'Invite player',
    share_packet: 'Share Team Review Packet',
    revoke_access: 'Revoke access',
    no_action: 'No action',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
}

function parseDate(value: unknown): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));

    return Number.isFinite(date.getTime()) ? date : null;
}

function isoOrNull(value: unknown): string | null {
    return parseDate(value)?.toISOString() ?? null;
}

function readSnapshot(share: Record<string, unknown>): TeamCoachSafeReportSnapshot {
    return redactTeamCoachReportForWorkspace(readRecord(share.teamSafeSnapshot));
}

function sourceItem(kind: TeamCoachDossierSourceKind, value: unknown): TeamCoachDossierSource | null {
    const sourceId = readOptionalString(value);

    return sourceId ? { kind, sourceId } : null;
}

function buildSourceList(snapshot: TeamCoachSafeReportSnapshot): readonly TeamCoachDossierSource[] {
    const sourceSummary = snapshot.sourceSummary;
    const sources = [
        sourceItem('analysis', sourceSummary.analysisSessionId),
        sourceItem('history', sourceSummary.historySessionId),
        sourceItem('protocol', sourceSummary.protocolRevisionId),
        sourceItem('spray_lab', sourceSummary.sprayLabSessionId),
        sourceItem('program', sourceSummary.trainingProgramCycleId),
        sourceItem('validation', sourceSummary.validationLinkId),
    ];

    return sources.filter((source): source is TeamCoachDossierSource => source !== null);
}

function contextLabel(snapshot: TeamCoachSafeReportSnapshot): string {
    return readString(snapshot.sourceSummary.contextLabel, 'Shared Team context');
}

function normalizeReviewStatus(value: unknown): TeamCoachReviewStatus | string {
    return typeof value === 'string' && isTeamCoachReviewStatus(value)
        ? value
        : readString(value, 'needs_review');
}

function normalizeNextAction(value: unknown): TeamCoachNextActionKind | string {
    return typeof value === 'string' && isTeamCoachNextActionKind(value)
        ? value
        : readString(value, 'review_report');
}

function buildSharedReport(share: Record<string, unknown>): TeamCoachDossierSharedReport {
    const snapshot = readSnapshot(share);
    const shareStatus = readString(share.shareStatus, 'active');

    return {
        shareId: readString(share.id, snapshot.id),
        shareStatus,
        consentStatus: readString(share.consentStatus, 'not_requested'),
        safeSnapshotReadable: true,
        privateSourceReloadAllowed: shareStatus === 'active',
        sourceList: buildSourceList(snapshot),
        contextLabel: contextLabel(snapshot),
        confidence: snapshot.honesty.confidence,
        coverage: snapshot.honesty.coverage,
        validationState: snapshot.honesty.validationState,
        blockers: snapshot.honesty.blockers,
        updatedAt: isoOrNull(share.updatedAt),
        revokedAt: isoOrNull(share.revokedAt),
    };
}

function sectionRecord(snapshot: TeamCoachSafeReportSnapshot, kind: TeamCoachSafeSectionKey): Record<string, unknown> {
    return readRecord(snapshot.sections[kind]);
}

function buildEvidenceLayers(snapshot: TeamCoachSafeReportSnapshot | null): readonly TeamCoachDossierEvidenceLayer[] {
    return teamCoachSafeSectionKeyValues.map((kind) => {
        const section = snapshot ? sectionRecord(snapshot, kind) : {};
        const summary = readString(section.summary, DEFAULT_SECTION_SUMMARIES[kind]);
        const sourceId = readOptionalString(section.sourceId);
        const validationState = snapshot?.honesty.validationState ?? 'not_requested';
        const compatibleValidationConfirmed = /confirmada|promissor|validated/i.test(validationState);

        return {
            kind,
            title: SECTION_TITLES[kind],
            summary,
            sourceId,
            countsAsTechnicalTruth: kind === 'technical_proof' || (kind === 'compatible_validation' && compatibleValidationConfirmed),
            countsAsDeterministicTruth: kind !== 'coach_notes',
        };
    });
}

function latestByCreatedAt(rows: readonly Record<string, unknown>[]): Record<string, unknown> | null {
    return [...rows]
        .sort((left, right) => (
            Date.parse(readString(right.createdAt, '1970-01-01T00:00:00.000Z'))
            - Date.parse(readString(left.createdAt, '1970-01-01T00:00:00.000Z'))
        ))[0]
        ?? null;
}

function buildCoachNotesSummary(notes: readonly Record<string, unknown>[]): TeamCoachPlayerDossierViewModel['coachNotesSummary'] {
    const latest = latestByCreatedAt(notes);

    return {
        count: notes.length,
        latest: latest ? readOptionalString(latest.note) : null,
        requestedNextAction: latest ? readOptionalString(latest.requestedNextAction) : null,
    };
}

function latestReviewStatus(input: {
    readonly shares: readonly Record<string, unknown>[];
    readonly reviewStatusEvents: readonly Record<string, unknown>[];
}): TeamCoachReviewStatus | string {
    const latestStatusEvent = latestByCreatedAt(input.reviewStatusEvents);

    if (latestStatusEvent) {
        return normalizeReviewStatus(latestStatusEvent.nextStatus);
    }

    const latestShare = latestByCreatedAt(input.shares);

    return latestShare ? normalizeReviewStatus(latestShare.reviewStatus) : 'needs_review';
}

function buildReviewStatusSummary(rows: readonly Record<string, unknown>[]): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const row of rows) {
        const status = normalizeReviewStatus(row.nextStatus ?? row.reviewStatus);
        counts[status] = (counts[status] ?? 0) + 1;
    }

    return counts;
}

function latestRequestedNextAction(input: {
    readonly shares: readonly Record<string, unknown>[];
    readonly notes: readonly Record<string, unknown>[];
    readonly reviewStatusEvents: readonly Record<string, unknown>[];
}): TeamCoachNextActionKind | string {
    const latestNote = latestByCreatedAt(input.notes);
    const noteAction = latestNote ? readOptionalString(latestNote.requestedNextAction) : null;

    if (noteAction) {
        return normalizeNextAction(noteAction);
    }

    const latestStatusEvent = latestByCreatedAt(input.reviewStatusEvents);
    const statusPayload = readRecord(latestStatusEvent?.payload);
    const statusAction = readOptionalString(statusPayload.requestedNextAction);

    if (statusAction) {
        return normalizeNextAction(statusAction);
    }

    const latestShare = latestByCreatedAt(input.shares);

    return latestShare ? normalizeNextAction(latestShare.requestedNextAction) : 'review_report';
}

function auditRow(row: Record<string, unknown>): TeamCoachDossierAuditRow {
    return {
        eventType: readString(row.eventType, 'workspace_updated'),
        shareId: readOptionalString(row.shareId),
        actorUserId: readOptionalString(row.actorUserId),
        targetUserId: readOptionalString(row.targetUserId),
        workspaceId: readOptionalString(row.workspaceId),
        createdAt: readString(row.createdAt, new Date(0).toISOString()),
        reasonCode: readOptionalString(row.reasonCode ?? row.reason),
    };
}

function buildAuditTimeline(input: {
    readonly auditEvents: readonly Record<string, unknown>[];
    readonly reviewStatusEvents: readonly Record<string, unknown>[];
    readonly notes: readonly Record<string, unknown>[];
}): readonly TeamCoachDossierAuditRow[] {
    const statusRows = input.reviewStatusEvents.map((event) => ({
        eventType: 'review_status_updated',
        shareId: event.shareId,
        actorUserId: event.actorUserId,
        targetUserId: event.playerUserId,
        createdAt: event.createdAt,
        reasonCode: event.reason,
    }));
    const noteRows = input.notes.map((note) => ({
        eventType: 'review_note_created',
        shareId: note.shareId,
        actorUserId: note.authorUserId,
        targetUserId: note.playerUserId,
        createdAt: note.createdAt,
    }));

    return [
        ...input.auditEvents,
        ...statusRows,
        ...noteRows,
    ]
        .map((row) => auditRow(row))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function readHandoffBlockers(value: Record<string, unknown> | null | undefined): readonly string[] {
    return value ? readStringArray(value.blockerReasons) : [];
}

function technicalValidationCounts(validationState: string): boolean {
    return /confirmada|promissor|validated/i.test(validationState);
}

function compactSprayLabState(value: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!value) {
        return null;
    }

    return {
        labSessionId: readOptionalString(value.labSessionId),
        technicalProofState: readOptionalString(value.technicalProofState),
        nextAction: readRecord(value.nextAction),
        executionEvidence: readRecord(value.executionEvidence),
        compatibleClipProof: readRecord(value.compatibleClipProof),
        practicalTransfer: readRecord(value.practicalTransfer),
        blockerReasons: readHandoffBlockers(value),
    };
}

function compactTrainingProgramState(value: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!value) {
        return null;
    }

    return {
        cycleId: readOptionalString(value.cycleId),
        technicalProofState: readOptionalString(value.technicalProofState),
        nextAction: readRecord(value.nextAction),
        executionEvidence: readRecord(value.executionEvidence),
        compatibleValidation: readRecord(value.compatibleValidation),
        practicalTransfer: readRecord(value.practicalTransfer),
        blockerReasons: readHandoffBlockers(value),
    };
}

export function buildTeamCoachPlayerDossierViewModel(
    input: BuildTeamCoachPlayerDossierInput,
): TeamCoachPlayerDossierViewModel {
    const shares = input.shares ?? [];
    const notes = input.reviewNotes ?? [];
    const reviewStatusEvents = input.reviewStatusEvents ?? [];
    const sharedReports = shares.map((share) => buildSharedReport(share));
    const latestShare = latestByCreatedAt(shares);
    const latestSnapshot = latestShare ? readSnapshot(latestShare) : null;
    const reviewStatus = latestReviewStatus({ shares, reviewStatusEvents });
    const requestedNextAction = latestRequestedNextAction({
        shares,
        notes,
        reviewStatusEvents,
    });
    const validationState = latestSnapshot?.honesty.validationState ?? 'not_requested';
    const sprayLabState = compactSprayLabState(input.sprayLab ? readRecord(input.sprayLab) : null);
    const trainingProgramState = compactTrainingProgramState(input.trainingProgram ? readRecord(input.trainingProgram) : null);
    const recentBlockers = Array.from(new Set([
        ...(latestSnapshot?.honesty.blockers ?? []),
        ...readHandoffBlockers(input.sprayLab ? readRecord(input.sprayLab) : null),
        ...readHandoffBlockers(input.trainingProgram ? readRecord(input.trainingProgram) : null),
    ]));
    const latestReport = sharedReports[0] ?? null;
    const sourceAccess = latestReport?.shareStatus === 'revoked'
        ? 'revoked_snapshot_only'
        : latestReport
            ? 'active_shared_source'
            : 'no_shared_source';
    const player = readRecord(input.player);
    const workspace = readRecord(input.workspace);
    const playerId = readString(player.id, readString(latestShare?.playerUserId, 'player'));
    const displayName = readString(
        player.displayName,
        readString(latestSnapshot?.sourceSummary.playerLabel, playerId),
    );
    const coachNotesSummary = buildCoachNotesSummary(notes);

    return {
        workspace: {
            id: readString(workspace.id, 'workspace'),
            name: readString(workspace.name, 'Mesa do Coach'),
        },
        player: {
            id: playerId,
            displayName,
        },
        generatedAt: (parseDate(input.now) ?? new Date()).toISOString(),
        sharedReports,
        activeContext: {
            latestReviewStatus: {
                key: reviewStatus,
                label: REVIEW_STATUS_LABELS[reviewStatus as TeamCoachReviewStatus] ?? reviewStatus,
            },
            requestedNextAction: {
                key: requestedNextAction,
                label: NEXT_ACTION_LABELS[requestedNextAction as TeamCoachNextActionKind] ?? requestedNextAction,
            },
            sourceAccess,
            compatibleValidation: {
                state: validationState,
                countsAsTechnicalTruth: technicalValidationCounts(validationState),
            },
            activeCoachLoop: input.activeCoachLoop ? readRecord(input.activeCoachLoop) : null,
            sprayLabState,
            trainingProgramState,
        },
        evidenceLayers: buildEvidenceLayers(latestSnapshot),
        recentBlockers,
        coachNotesSummary,
        reviewStatusSummary: buildReviewStatusSummary([...shares, ...reviewStatusEvents]),
        auditTimeline: buildAuditTimeline({
            auditEvents: input.auditEvents ?? [],
            reviewStatusEvents,
            notes,
        }),
    };
}
