import {
    redactTeamCoachReportForWorkspace,
    type TeamCoachSafeReportSnapshot,
} from '@/core/team-coach-report-redaction';
import {
    isTeamCoachNextActionKind,
    isTeamCoachReviewStatus,
    type TeamCoachNextActionKind,
    type TeamCoachReviewStatus,
    type TeamCoachShareStatus,
} from '@/types/team-coach';

export type TeamCoachCockpitAttentionReason =
    | 'weak_capture'
    | 'coverage_low'
    | 'validation_pending'
    | 'regression_validated'
    | 'no_clear_change'
    | 'repair_requested'
    | 'stale_context'
    | 'protocol_completed'
    | 'ready_next_block'
    | 'needs_review'
    | 'share_revoked';

export interface TeamCoachCockpitPlayerInput {
    readonly id: string;
    readonly displayName?: string;
    readonly membershipStatus?: string | null;
    readonly role?: string | null;
}

export interface TeamCoachCockpitShareInput {
    readonly id: string;
    readonly playerUserId: string;
    readonly shareStatus?: TeamCoachShareStatus | string | null;
    readonly consentStatus?: string | null;
    readonly reviewStatus?: TeamCoachReviewStatus | string | null;
    readonly requestedNextAction?: TeamCoachNextActionKind | string | null;
    readonly teamSafeSnapshot?: Record<string, unknown> | null;
    readonly createdAt?: Date | string | null;
    readonly updatedAt?: Date | string | null;
    readonly revokedAt?: Date | string | null;
}

export interface TeamCoachCockpitInput {
    readonly workspace?: {
        readonly id?: string | null;
        readonly name?: string | null;
    } | null;
    readonly players?: readonly TeamCoachCockpitPlayerInput[];
    readonly shares?: readonly TeamCoachCockpitShareInput[];
    readonly now?: Date | string | null;
    readonly staleAfterDays?: number;
}

export interface TeamCoachCockpitPlayerReference {
    readonly playerId: string;
    readonly displayName: string;
    readonly shareId: string | null;
    readonly shareStatus: string;
}

export interface TeamCoachCockpitAttentionItem extends TeamCoachCockpitPlayerReference {
    readonly reviewStatus: TeamCoachReviewStatus | string;
    readonly validationState: string;
    readonly confidence: number | null;
    readonly coverage: number | null;
    readonly staleContext: boolean;
    readonly blockerReasons: readonly string[];
    readonly attentionReasonCodes: readonly TeamCoachCockpitAttentionReason[];
    readonly nextAction: {
        readonly kind: TeamCoachNextActionKind;
        readonly label: string;
        readonly href: string;
    };
    readonly contextLabel: string;
    readonly updatedAt: string | null;
}

export interface TeamCoachCockpitLane {
    readonly blocker: string;
    readonly playerCount: number;
    readonly players: readonly TeamCoachCockpitPlayerReference[];
}

export interface TeamCoachCockpitValidationLane {
    readonly state: string;
    readonly playerCount: number;
    readonly players: readonly TeamCoachCockpitPlayerReference[];
}

export interface TeamCoachCockpitViewModel {
    readonly workspace: {
        readonly id: string;
        readonly name: string;
    };
    readonly generatedAt: string;
    readonly rosterSummary: {
        readonly totalPlayers: number;
        readonly activePlayers: number;
        readonly playersNeedingAttention: number;
        readonly sharedReportCount: number;
        readonly revokedShareCount: number;
        readonly staleContextCount: number;
    };
    readonly latestSharedReports: readonly TeamCoachCockpitAttentionItem[];
    readonly attentionQueue: readonly TeamCoachCockpitAttentionItem[];
    readonly nextActionQueue: readonly TeamCoachCockpitAttentionItem[];
    readonly blockerLanes: readonly TeamCoachCockpitLane[];
    readonly validationLanes: readonly TeamCoachCockpitValidationLane[];
    readonly reviewStatusCounts: Readonly<Record<TeamCoachReviewStatus | string, number>>;
    readonly operationalComparison: {
        readonly mode: 'triage_only';
        readonly globalRankingEnabled: false;
        readonly allowedComparison: 'blockers_and_validation_needs_only';
    };
}

const DEFAULT_STALE_AFTER_DAYS = 21;

const NEXT_ACTION_LABELS: Record<TeamCoachNextActionKind, string> = {
    review_report: 'Review shared report',
    request_validation: 'Request compatible clip',
    request_repair: 'Request blocker repair',
    invite_player: 'Invite player',
    share_packet: 'Share Team Review Packet',
    revoke_access: 'Revoke access',
    no_action: 'No action',
};

const PRIORITY_WEIGHTS: Record<TeamCoachCockpitAttentionReason, number> = {
    weak_capture: 100,
    coverage_low: 96,
    validation_pending: 90,
    regression_validated: 84,
    no_clear_change: 80,
    repair_requested: 72,
    stale_context: 60,
    protocol_completed: 52,
    ready_next_block: 44,
    needs_review: 36,
    share_revoked: 0,
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

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
}

function parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeReviewStatus(value: unknown): TeamCoachReviewStatus | string {
    return typeof value === 'string' && isTeamCoachReviewStatus(value)
        ? value
        : readString(value, 'needs_review');
}

function normalizeNextAction(value: unknown): TeamCoachNextActionKind | null {
    return typeof value === 'string' && isTeamCoachNextActionKind(value) ? value : null;
}

function readSnapshot(share: TeamCoachCockpitShareInput): TeamCoachSafeReportSnapshot {
    return redactTeamCoachReportForWorkspace(readRecord(share.teamSafeSnapshot));
}

function playerLabel(
    player: TeamCoachCockpitPlayerInput | undefined,
    snapshot: TeamCoachSafeReportSnapshot,
    fallbackId: string,
): string {
    return player?.displayName
        ?? readString(snapshot.sourceSummary.playerDisplayName, readString(snapshot.sourceSummary.playerLabel, fallbackId));
}

function contextLabel(snapshot: TeamCoachSafeReportSnapshot): string {
    return readString(
        snapshot.sourceSummary.contextLabel,
        [
            readOptionalString(snapshot.sourceSummary.weapon),
            readOptionalString(snapshot.sourceSummary.optic),
            typeof snapshot.sourceSummary.distanceMeters === 'number'
                ? `${Math.round(snapshot.sourceSummary.distanceMeters)}m`
                : null,
        ].filter(Boolean).join(' / ') || 'Shared Team context',
    );
}

function reasonsFromShare(input: {
    readonly share: TeamCoachCockpitShareInput;
    readonly snapshot: TeamCoachSafeReportSnapshot;
    readonly reviewStatus: TeamCoachReviewStatus | string;
    readonly staleContext: boolean;
}): readonly TeamCoachCockpitAttentionReason[] {
    const reasons = new Set<TeamCoachCockpitAttentionReason>();
    const blockers = input.snapshot.honesty.blockers;
    const validationState = input.snapshot.honesty.validationState.toLowerCase();
    const coverage = input.snapshot.honesty.coverage;

    if (input.share.shareStatus === 'revoked') {
        reasons.add('share_revoked');
        return Array.from(reasons);
    }

    if (
        input.snapshot.honesty.inconclusiveState
        || blockers.includes('weak_capture')
        || blockers.includes('capture_blocker')
    ) {
        reasons.add('weak_capture');
    }

    if (
        blockers.includes('coverage_low')
        || (typeof coverage === 'number' && coverage < 0.4)
    ) {
        reasons.add('coverage_low');
    }

    if (
        blockers.includes('validation_pending')
        || validationState === 'pending'
        || validationState === 'not_requested'
        || validationState.includes('pendente')
    ) {
        reasons.add('validation_pending');
    }

    if (blockers.includes('regression_validated') || validationState.includes('regressao')) {
        reasons.add('regression_validated');
    }

    if (blockers.includes('no_clear_change') || validationState.includes('sem_mudanca')) {
        reasons.add('no_clear_change');
    }

    if (input.reviewStatus === 'repair_requested' || input.share.requestedNextAction === 'request_repair') {
        reasons.add('repair_requested');
    }

    if (input.staleContext) {
        reasons.add('stale_context');
    }

    const currentState = readString(input.snapshot.sourceSummary.currentState, '');

    if (currentState === 'protocol_completed') {
        reasons.add('protocol_completed');
    }

    if (currentState === 'ready_next_block') {
        reasons.add('ready_next_block');
    }

    if (input.reviewStatus === 'needs_review') {
        reasons.add('needs_review');
    }

    return Array.from(reasons).sort((left, right) => PRIORITY_WEIGHTS[right] - PRIORITY_WEIGHTS[left]);
}

function priorityWeight(reasons: readonly TeamCoachCockpitAttentionReason[]): number {
    return reasons.reduce((max, reason) => Math.max(max, PRIORITY_WEIGHTS[reason] ?? 0), 0);
}

function resolveNextAction(input: {
    readonly share: TeamCoachCockpitShareInput;
    readonly reasons: readonly TeamCoachCockpitAttentionReason[];
}): TeamCoachNextActionKind {
    const explicit = normalizeNextAction(input.share.requestedNextAction);

    if (explicit && explicit !== 'no_action') {
        return explicit;
    }

    if (input.reasons.includes('share_revoked')) {
        return 'no_action';
    }

    if (
        input.reasons.includes('weak_capture')
        || input.reasons.includes('coverage_low')
        || input.reasons.includes('regression_validated')
        || input.reasons.includes('no_clear_change')
        || input.reasons.includes('repair_requested')
    ) {
        return 'request_repair';
    }

    if (input.reasons.includes('validation_pending')) {
        return 'request_validation';
    }

    return input.reasons.length > 0 ? 'review_report' : 'no_action';
}

function buildHref(action: TeamCoachNextActionKind, playerId: string, shareId: string | null): string {
    const query = new URLSearchParams({
        playerId,
        ...(shareId ? { shareId } : {}),
    });

    switch (action) {
        case 'request_validation':
            return `/analyze?mode=validation&${query.toString()}`;
        case 'request_repair':
            return `/spray-lab?repair=1&${query.toString()}`;
        case 'share_packet':
            return `/mesa-coach/packets/new?${query.toString()}`;
        case 'invite_player':
            return '/mesa-coach/invites';
        case 'revoke_access':
            return `/mesa-coach/access?${query.toString()}`;
        case 'review_report':
            return `/mesa-coach/dossier/${encodeURIComponent(playerId)}${shareId ? `?shareId=${encodeURIComponent(shareId)}` : ''}`;
        case 'no_action':
            return `/mesa-coach/dossier/${encodeURIComponent(playerId)}`;
    }
}

function buildReference(input: {
    readonly playerId: string;
    readonly displayName: string;
    readonly shareId: string | null;
    readonly shareStatus: string;
}): TeamCoachCockpitPlayerReference {
    return {
        playerId: input.playerId,
        displayName: input.displayName,
        shareId: input.shareId,
        shareStatus: input.shareStatus,
    };
}

function groupLanes<TLaneKey extends string>(items: readonly TeamCoachCockpitAttentionItem[], readKeys: (item: TeamCoachCockpitAttentionItem) => readonly TLaneKey[]): Array<{
    readonly key: TLaneKey;
    readonly players: readonly TeamCoachCockpitPlayerReference[];
}> {
    const groups = new Map<TLaneKey, TeamCoachCockpitPlayerReference[]>();

    for (const item of items) {
        for (const key of readKeys(item)) {
            groups.set(key, [
                ...(groups.get(key) ?? []),
                buildReference(item),
            ]);
        }
    }

    return Array.from(groups.entries())
        .map(([key, players]) => ({ key, players }))
        .sort((left, right) => right.players.length - left.players.length || left.key.localeCompare(right.key));
}

function buildAttentionItem(input: {
    readonly player: TeamCoachCockpitPlayerInput | undefined;
    readonly share: TeamCoachCockpitShareInput;
    readonly snapshot: TeamCoachSafeReportSnapshot;
    readonly now: Date;
    readonly staleAfterMs: number;
}): TeamCoachCockpitAttentionItem {
    const updatedAt = parseDate(input.share.updatedAt ?? input.share.createdAt);
    const staleContext = Boolean(updatedAt && input.now.getTime() - updatedAt.getTime() > input.staleAfterMs);
    const reviewStatus = normalizeReviewStatus(input.share.reviewStatus);
    const reasons = reasonsFromShare({
        share: input.share,
        snapshot: input.snapshot,
        reviewStatus,
        staleContext,
    });
    const action = resolveNextAction({ share: input.share, reasons });
    const playerId = input.share.playerUserId;
    const shareStatus = readString(input.share.shareStatus, 'active');

    return {
        ...buildReference({
            playerId,
            displayName: playerLabel(input.player, input.snapshot, playerId),
            shareId: input.share.id,
            shareStatus,
        }),
        reviewStatus,
        validationState: input.snapshot.honesty.validationState,
        confidence: input.snapshot.honesty.confidence,
        coverage: input.snapshot.honesty.coverage,
        staleContext,
        blockerReasons: input.snapshot.honesty.blockers,
        attentionReasonCodes: reasons,
        nextAction: {
            kind: action,
            label: NEXT_ACTION_LABELS[action],
            href: buildHref(action, playerId, input.share.id),
        },
        contextLabel: contextLabel(input.snapshot),
        updatedAt: updatedAt?.toISOString() ?? null,
    };
}

export function createTeamCoachCockpitViewModel(input: TeamCoachCockpitInput): TeamCoachCockpitViewModel {
    const now = parseDate(input.now) ?? new Date();
    const staleAfterMs = Math.max(1, input.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS) * 24 * 60 * 60 * 1000;
    const players = input.players ?? [];
    const shares = input.shares ?? [];
    const playersById = new Map(players.map((player) => [player.id, player]));
    const latestSharedReports = shares.map((share) => buildAttentionItem({
        player: playersById.get(share.playerUserId),
        share,
        snapshot: readSnapshot(share),
        now,
        staleAfterMs,
    }));
    const attentionQueue = latestSharedReports
        .filter((item) => (
            item.shareStatus !== 'revoked'
            && item.attentionReasonCodes.length > 0
            && item.nextAction.kind !== 'no_action'
        ))
        .sort((left, right) => (
            priorityWeight(right.attentionReasonCodes) - priorityWeight(left.attentionReasonCodes)
            || Date.parse(right.updatedAt ?? '1970-01-01T00:00:00.000Z') - Date.parse(left.updatedAt ?? '1970-01-01T00:00:00.000Z')
            || left.playerId.localeCompare(right.playerId)
        ));
    const blockerGroups = groupLanes(latestSharedReports, (item) => {
        if (item.shareStatus === 'revoked') {
            return ['share_revoked'];
        }

        return Array.from(new Set([
            ...item.blockerReasons,
            ...item.attentionReasonCodes.filter((reason) => (
                reason !== 'validation_pending'
                && reason !== 'stale_context'
                && reason !== 'needs_review'
                && reason !== 'protocol_completed'
                && reason !== 'ready_next_block'
            )),
        ]));
    });
    const validationGroups = groupLanes(latestSharedReports, (item) => [item.validationState]);
    const reviewStatusCounts: Record<string, number> = {};

    for (const item of latestSharedReports) {
        reviewStatusCounts[item.reviewStatus] = (reviewStatusCounts[item.reviewStatus] ?? 0) + 1;
    }

    return {
        workspace: {
            id: input.workspace?.id ?? 'workspace',
            name: input.workspace?.name ?? 'Mesa do Coach',
        },
        generatedAt: now.toISOString(),
        rosterSummary: {
            totalPlayers: players.length,
            activePlayers: players.filter((player) => player.membershipStatus !== 'removed' && player.membershipStatus !== 'suspended').length,
            playersNeedingAttention: attentionQueue.length,
            sharedReportCount: latestSharedReports.length,
            revokedShareCount: latestSharedReports.filter((item) => item.shareStatus === 'revoked').length,
            staleContextCount: latestSharedReports.filter((item) => item.staleContext).length,
        },
        latestSharedReports,
        attentionQueue,
        nextActionQueue: attentionQueue.filter((item) => item.nextAction.kind !== 'no_action'),
        blockerLanes: blockerGroups.map((group) => ({
            blocker: group.key,
            playerCount: group.players.length,
            players: group.players,
        })),
        validationLanes: validationGroups.map((group) => ({
            state: group.key,
            playerCount: group.players.length,
            players: group.players,
        })),
        reviewStatusCounts,
        operationalComparison: {
            mode: 'triage_only',
            globalRankingEnabled: false,
            allowedComparison: 'blockers_and_validation_needs_only',
        },
    };
}
