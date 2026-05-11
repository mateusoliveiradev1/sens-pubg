import {
    redactTeamCoachReportForWorkspace,
    teamCoachSafeSectionKeyValues,
    type TeamCoachRequiredHonestyField,
    type TeamCoachSafeReportSnapshot,
    type TeamCoachSafeSectionKey,
} from '@/core/team-coach-report-redaction';
import type {
    TeamCoachAuditEventType,
    TeamCoachNextActionKind,
    TeamCoachReviewStatus,
} from '@/types/team-coach';

export type TeamCoachPacketSourceKind =
    | 'analysis'
    | 'history'
    | 'protocol'
    | 'spray_lab'
    | 'program'
    | 'validation';

export interface TeamCoachPacketHonestyRow {
    readonly key: TeamCoachRequiredHonestyField;
    readonly label: string;
    readonly value: string;
    readonly visible: true;
}

export interface TeamCoachPacketEvidenceLayer {
    readonly kind: TeamCoachSafeSectionKey;
    readonly title: string;
    readonly summary: string;
    readonly sourceId: string | null;
}

export interface TeamCoachPacketSource {
    readonly kind: TeamCoachPacketSourceKind;
    readonly label: string;
    readonly sourceId: string;
}

export interface TeamCoachPacketAuditRow {
    readonly eventType: TeamCoachAuditEventType | string;
    readonly actorUserId: string | null;
    readonly targetUserId: string | null;
    readonly workspaceId: string | null;
    readonly createdAt: string;
    readonly reasonCode: string | null;
}

export interface TeamCoachPacketViewModel {
    readonly packetId: string;
    readonly title: string;
    readonly caseLabel: 'Team Review Packet';
    readonly status: string;
    readonly visibility: string;
    readonly workspace: {
        readonly id: string;
        readonly name: string;
    };
    readonly player: {
        readonly id: string;
        readonly displayName: string;
    };
    readonly reviewStatus: {
        readonly key: TeamCoachReviewStatus | string;
        readonly label: string;
    };
    readonly requestedNextAction: {
        readonly key: TeamCoachNextActionKind | string;
        readonly label: string;
    };
    readonly coachNoteSummary: {
        readonly count: number;
        readonly latest: string | null;
        readonly requestedNextAction: TeamCoachNextActionKind | string | null;
    };
    readonly sourceList: readonly TeamCoachPacketSource[];
    readonly requiredHonesty: readonly TeamCoachPacketHonestyRow[];
    readonly evidenceLayers: readonly TeamCoachPacketEvidenceLayer[];
    readonly workspaceAudit: readonly TeamCoachPacketAuditRow[];
    readonly generatedAt: string | null;
    readonly updatedAt: string | null;
    readonly printLayout: {
        readonly format: 'browser_print';
        readonly pdfRequired: false;
        readonly preserveHonestyFields: true;
        readonly sections: readonly string[];
    };
}

export interface BuildTeamCoachPacketViewModelInput {
    readonly packet: Record<string, unknown>;
    readonly workspace?: Record<string, unknown>;
    readonly player?: Record<string, unknown>;
    readonly coachNoteSummary?: Record<string, unknown>;
    readonly auditEvents?: readonly Record<string, unknown>[];
}

const HONESTY_LABELS: Record<TeamCoachRequiredHonestyField, string> = {
    confidence: 'Confidence',
    coverage: 'Coverage',
    blockers: 'Blockers',
    inconclusive_state: 'Inconclusive state',
    limited_support: 'Limited support',
    validation_state: 'Validation',
    no_overclaim_disclaimer: 'No-overclaim disclaimer',
};

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
    technical_proof: 'Technical evidence is limited to the redacted source snapshot.',
    training_execution: 'Training and Lab execution are audit context, not standalone technical proof.',
    practical_transfer: 'TDM or match transfer is practical evidence and does not replace compatible validation.',
    compatible_validation: 'Compatible validation remains the technical proof path.',
    blockers: 'Blockers and limits remain visible in the packet.',
    repairs: 'Repair states stay separate from progress claims.',
    coach_notes: 'Coach notes are human review context, not deterministic truth.',
    current_state: 'Current state is summarized without exposing full private history.',
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
    request_validation: 'Request compatible validation',
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

function readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatPercent(value: number | null): string {
    return value === null ? 'Not available' : `${Math.round(value * 100)}%`;
}

function safeDisclaimer(value: string): string {
    return value
        .replace(/\bcertification\b/gi, 'authority claim')
        .replace(/\brank proof\b/gi, 'rank claim')
        .replace(/\bguaranteed improvement\b/gi, 'performance promise')
        .replace(/\bofficial PUBG\b/gi, 'official affiliation')
        .replace(/\bcertificacao\b/gi, 'authority claim')
        .replace(/\bmelhora garantida\b/gi, 'performance promise');
}

function buildHonestyRows(snapshot: TeamCoachSafeReportSnapshot): readonly TeamCoachPacketHonestyRow[] {
    const blockers = snapshot.honesty.blockers.length > 0
        ? snapshot.honesty.blockers.join(' | ')
        : 'No blockers listed.';
    const limitedSupport = snapshot.honesty.limitedSupport.length > 0
        ? snapshot.honesty.limitedSupport.join(' | ')
        : 'No extra support limit listed.';

    return [
        {
            key: 'confidence',
            label: HONESTY_LABELS.confidence,
            value: formatPercent(snapshot.honesty.confidence),
            visible: true,
        },
        {
            key: 'coverage',
            label: HONESTY_LABELS.coverage,
            value: formatPercent(snapshot.honesty.coverage),
            visible: true,
        },
        {
            key: 'blockers',
            label: HONESTY_LABELS.blockers,
            value: blockers,
            visible: true,
        },
        {
            key: 'inconclusive_state',
            label: HONESTY_LABELS.inconclusive_state,
            value: snapshot.honesty.inconclusiveState ? 'Inconclusive' : 'Not inconclusive',
            visible: true,
        },
        {
            key: 'limited_support',
            label: HONESTY_LABELS.limited_support,
            value: limitedSupport,
            visible: true,
        },
        {
            key: 'validation_state',
            label: HONESTY_LABELS.validation_state,
            value: snapshot.honesty.validationState,
            visible: true,
        },
        {
            key: 'no_overclaim_disclaimer',
            label: HONESTY_LABELS.no_overclaim_disclaimer,
            value: safeDisclaimer(snapshot.honesty.noOverclaimDisclaimer),
            visible: true,
        },
    ];
}

function sourceIdFromSection(value: unknown): string | null {
    const section = readRecord(value);

    return readOptionalString(section.sourceId);
}

function summaryFromSection(value: unknown, fallback: string): string {
    const section = readRecord(value);

    return readString(section.summary, fallback);
}

function buildEvidenceLayers(snapshot: TeamCoachSafeReportSnapshot): readonly TeamCoachPacketEvidenceLayer[] {
    return teamCoachSafeSectionKeyValues.map((kind) => ({
        kind,
        title: SECTION_TITLES[kind],
        summary: summaryFromSection(snapshot.sections[kind], DEFAULT_SECTION_SUMMARIES[kind]),
        sourceId: sourceIdFromSection(snapshot.sections[kind]),
    }));
}

function sourceListItem(
    kind: TeamCoachPacketSourceKind,
    label: string,
    sourceId: unknown,
): TeamCoachPacketSource | null {
    const normalizedSourceId = readOptionalString(sourceId);

    return normalizedSourceId
        ? {
            kind,
            label,
            sourceId: normalizedSourceId,
        }
        : null;
}

function buildSourceList(snapshot: TeamCoachSafeReportSnapshot): readonly TeamCoachPacketSource[] {
    const sourceSummary = snapshot.sourceSummary;
    const sources = [
        sourceListItem('analysis', 'Analysis report', sourceSummary.analysisSessionId),
        sourceListItem('history', 'History report', sourceSummary.historySessionId),
        sourceListItem('protocol', 'Training protocol', sourceSummary.protocolRevisionId),
        sourceListItem('spray_lab', 'Spray Lab session', sourceSummary.sprayLabSessionId),
        sourceListItem('program', 'Ciclo Pro program', sourceSummary.trainingProgramCycleId),
        sourceListItem('validation', 'Compatible validation', sourceSummary.validationLinkId),
    ];

    return sources.filter((source): source is TeamCoachPacketSource => source !== null);
}

function buildAuditRows(
    auditEvents: readonly Record<string, unknown>[] | undefined,
): readonly TeamCoachPacketAuditRow[] {
    return (auditEvents ?? []).map((event) => ({
        eventType: readString(event.eventType, 'workspace_updated'),
        actorUserId: readOptionalString(event.actorUserId),
        targetUserId: readOptionalString(event.targetUserId),
        workspaceId: readOptionalString(event.workspaceId),
        createdAt: readString(event.createdAt, new Date(0).toISOString()),
        reasonCode: readOptionalString(event.reasonCode),
    }));
}

function readTeamSafeSnapshot(packet: Record<string, unknown>): TeamCoachSafeReportSnapshot {
    return redactTeamCoachReportForWorkspace(readRecord(packet.teamSafeSnapshot));
}

export function buildTeamCoachPacketViewModel(
    input: BuildTeamCoachPacketViewModelInput,
): TeamCoachPacketViewModel {
    const packet = readRecord(input.packet);
    const workspace = readRecord(input.workspace);
    const player = readRecord(input.player);
    const noteSummary = readRecord(input.coachNoteSummary);
    const snapshot = readTeamSafeSnapshot(packet);
    const reviewStatus = readString(packet.reviewStatus, 'needs_review');
    const requestedNextAction = readString(
        noteSummary.requestedNextAction ?? packet.requestedNextAction,
        'review_report',
    );

    return {
        packetId: readString(packet.id, snapshot.id),
        title: readString(packet.title, 'Team Review Packet'),
        caseLabel: 'Team Review Packet',
        status: readString(packet.status, 'draft'),
        visibility: readString(packet.visibility, 'private'),
        workspace: {
            id: readString(workspace.id, readString(packet.workspaceId, 'workspace')),
            name: readString(workspace.name, 'Mesa do Coach'),
        },
        player: {
            id: readString(player.id, readString(packet.playerUserId, 'player')),
            displayName: readString(
                player.displayName,
                readString(snapshot.sourceSummary.playerLabel, 'Player'),
            ),
        },
        reviewStatus: {
            key: reviewStatus,
            label: REVIEW_STATUS_LABELS[reviewStatus as TeamCoachReviewStatus] ?? reviewStatus,
        },
        requestedNextAction: {
            key: requestedNextAction,
            label: NEXT_ACTION_LABELS[requestedNextAction as TeamCoachNextActionKind] ?? requestedNextAction,
        },
        coachNoteSummary: {
            count: readNumber(noteSummary.count, 0),
            latest: readOptionalString(noteSummary.latest),
            requestedNextAction: readOptionalString(noteSummary.requestedNextAction),
        },
        sourceList: buildSourceList(snapshot),
        requiredHonesty: buildHonestyRows(snapshot),
        evidenceLayers: buildEvidenceLayers(snapshot),
        workspaceAudit: buildAuditRows(input.auditEvents),
        generatedAt: readOptionalString(packet.createdAt ?? snapshot.generatedAt),
        updatedAt: readOptionalString(packet.updatedAt),
        printLayout: {
            format: 'browser_print',
            pdfRequired: false,
            preserveHonestyFields: true,
            sections: [
                'player_context',
                'team_safe_source_list',
                'required_honesty',
                'evidence_layers',
                'coach_review',
                'workspace_audit',
            ],
        },
    };
}
