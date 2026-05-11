'use server';

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    analysisSessions,
    completeTrainingProtocolRevisions,
    sprayLabSessions,
    sprayLabValidationLinks,
    teamCoachAuditEvents,
    teamCoachPacketLinks,
    teamCoachReportShares,
    teamCoachReviewPackets,
    teamCoachReviewStatusEvents,
    teamCoachWorkspaceMemberships,
    teamCoachWorkspaces,
    trainingProgramCycles,
} from '@/db/schema';
import {
    buildTeamCoachPacketViewModel,
    type TeamCoachPacketViewModel,
} from '@/core/team-coach-packet-view-model';
import {
    redactTeamCoachReportForWorkspace,
    type TeamCoachSafeReportSnapshot,
} from '@/core/team-coach-report-redaction';
import {
    createTeamCoachPacketLinkTokenVerifier,
    generateTeamCoachPacketLinkToken,
    verifyTeamCoachPacketLinkToken,
} from '@/lib/team-coach-link-token';
import {
    hasTeamCoachCapability,
    resolveTeamCoachAccessForUser,
    type TeamCoachCapability,
} from '@/lib/team-coach-access';
import {
    isTeamCoachNextActionKind,
    isTeamCoachReviewStatus,
    type TeamCoachAuditEventType,
    type TeamCoachConsentScope,
    type TeamCoachDenialReason,
    type TeamCoachMembershipStatus,
    type TeamCoachNextActionKind,
    type TeamCoachPacketStatus,
    type TeamCoachPrivateLinkStatus,
    type TeamCoachReviewStatus,
    type TeamCoachShareStatus,
    type TeamCoachWorkspaceRole,
    type TeamCoachWorkspaceStatus,
} from '@/types/team-coach';

type TeamCoachActionErrorResult = {
    readonly success: false;
    readonly error: string;
    readonly denialReason?: TeamCoachDenialReason;
};

type TeamCoachActionResult<TPayload> =
    | ({ readonly success: true } & TPayload)
    | TeamCoachActionErrorResult;

export interface ShareTeamCoachReportSourceInput {
    readonly workspaceId: string;
    readonly sourceAnalysisSessionId?: string;
    readonly sourceHistorySessionId?: string;
    readonly sourceProtocolRevisionId?: string;
    readonly sourceSprayLabSessionId?: string;
    readonly sourceTrainingProgramCycleId?: string;
    readonly sourceValidationLinkId?: string;
    readonly consentScopes?: readonly TeamCoachConsentScope[];
    readonly snapshot?: Record<string, unknown>;
    readonly expiresAt?: Date | string | null;
}

export type ShareTeamCoachReportSourceResult = TeamCoachActionResult<{
    readonly share: {
        readonly id: string;
        readonly shareStatus: TeamCoachShareStatus;
        readonly teamSafeSnapshot: Record<string, unknown>;
    };
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface RevokeTeamCoachReportShareInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly reason?: string;
}

export type RevokeTeamCoachReportShareResult = TeamCoachActionResult<{
    readonly share: {
        readonly id: string;
        readonly shareStatus: 'revoked';
    };
    readonly safeSnapshotReadable: true;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface TeamCoachExpandedContextInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly requestedScopes?: readonly TeamCoachConsentScope[];
    readonly reason?: string;
}

export type TeamCoachExpandedContextResult = TeamCoachActionResult<{
    readonly shareId: string;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface CreateTeamCoachReviewPacketInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly title?: string;
    readonly visibility?: 'private' | 'unlisted';
    readonly reviewStatus?: TeamCoachReviewStatus;
    readonly requestedNextAction?: TeamCoachNextActionKind;
}

export interface UpdateTeamCoachReviewPacketControlsInput {
    readonly workspaceId: string;
    readonly packetId: string;
    readonly title?: string;
    readonly status?: TeamCoachPacketStatus;
    readonly reviewStatus?: TeamCoachReviewStatus;
    readonly requestedNextAction?: TeamCoachNextActionKind;
    readonly controls?: Record<string, unknown>;
}

export type TeamCoachReviewPacketMutationResult = TeamCoachActionResult<{
    readonly packet: {
        readonly id: string;
        readonly status: string;
        readonly visibility: string;
        readonly teamSafeSnapshot: Record<string, unknown>;
    };
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface TeamCoachPacketLinkActionInput {
    readonly workspaceId: string;
    readonly packetId: string;
    readonly linkId?: string;
    readonly previousLinkId?: string;
    readonly expiresAt?: Date | string | null;
    readonly reason?: string;
}

export type TeamCoachPacketLinkMutationResult = TeamCoachActionResult<{
    readonly link: {
        readonly id: string;
        readonly token?: string;
        readonly status: TeamCoachPrivateLinkStatus;
        readonly expiresAt?: string | null;
    };
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export type TeamCoachPacketReadResult = TeamCoachActionResult<{
    readonly packet: TeamCoachPacketViewModel;
}>;

interface TeamCoachActionAuditEvent {
    readonly type: `team_coach.${TeamCoachAuditEventType}`;
}

interface AuthenticatedTeamCoachUser {
    readonly userId: string;
    readonly role: 'anonymous' | 'user' | 'admin';
}

interface WorkspaceRow {
    readonly id: string;
    readonly ownerUserId: string;
    readonly status: TeamCoachWorkspaceStatus;
    readonly seatLimit: number;
}

interface MembershipRow {
    readonly id: string;
    readonly workspaceId: string;
    readonly userId: string;
    readonly role: TeamCoachWorkspaceRole;
    readonly status: TeamCoachMembershipStatus;
}

interface TeamCoachSourceIds {
    readonly analysisSessionId?: string;
    readonly historySessionId?: string;
    readonly protocolRevisionId?: string;
    readonly sprayLabSessionId?: string;
    readonly trainingProgramCycleId?: string;
    readonly validationLinkId?: string;
}

interface OwnedSourceEvidence {
    readonly sourceIds: TeamCoachSourceIds;
    readonly analysisResult: Record<string, unknown> | null;
}

interface ShareRow {
    readonly id: string;
    readonly workspaceId: string;
    readonly playerUserId: string;
    readonly sharedByUserId: string;
    readonly consentStatus: string;
    readonly consentScopes: readonly TeamCoachConsentScope[];
    readonly shareStatus: TeamCoachShareStatus;
    readonly teamSafeSnapshot: Record<string, unknown>;
    readonly sourceAnalysisSessionId: string | null;
    readonly sourceHistorySessionId: string | null;
    readonly sourceProtocolRevisionId: string | null;
    readonly sourceSprayLabSessionId: string | null;
    readonly sourceTrainingProgramCycleId: string | null;
    readonly sourceValidationLinkId: string | null;
}

interface PacketRow {
    readonly id: string;
    readonly workspaceId: string;
    readonly shareId: string;
    readonly createdByUserId: string;
    readonly playerUserId: string;
    readonly visibility: string;
    readonly status: TeamCoachPacketStatus | string;
    readonly title: string;
    readonly teamSafeSnapshot: Record<string, unknown>;
    readonly reviewStatus: TeamCoachReviewStatus | null;
    readonly requestedNextAction: TeamCoachNextActionKind | null;
    readonly createdAt?: Date | string | null;
    readonly updatedAt?: Date | string | null;
}

interface PacketLinkRow {
    readonly id: string;
    readonly packetId: string;
    readonly status: TeamCoachPrivateLinkStatus;
    readonly tokenVerifierHash: string;
    readonly expiresAt?: Date | string | null;
}

const DEFAULT_CONSENT_SCOPES: readonly TeamCoachConsentScope[] = [
    'analysis_summary',
    'review_packet',
];

function actionError(
    error: string,
    denialReason?: TeamCoachDenialReason,
): TeamCoachActionErrorResult {
    return {
        success: false,
        error,
        ...(denialReason ? { denialReason } : {}),
    };
}

function firstDenial(
    denials?: readonly TeamCoachDenialReason[],
): TeamCoachDenialReason | undefined {
    return denials?.[0];
}

function toActionAuditEvent(
    type: TeamCoachAuditEventType,
): TeamCoachActionAuditEvent {
    return {
        type: `team_coach.${type}`,
    };
}

function readRole(value: unknown): 'anonymous' | 'user' | 'admin' {
    return value === 'admin' ? 'admin' : 'user';
}

async function requireTeamCoachUser(): Promise<AuthenticatedTeamCoachUser | null> {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return null;
    }

    return {
        userId,
        role: readRole((session.user as { readonly role?: unknown }).role),
    };
}

function normalizeRequiredText(value: string | undefined): string {
    return value?.trim() ?? '';
}

function normalizeOptionalText(value: string | undefined): string | null {
    const normalized = value?.trim();

    return normalized && normalized.length > 0 ? normalized : null;
}

function parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function parseNow(value: Date | string | null | undefined): Date | undefined {
    return parseDate(value) ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
    if (!isRecord(value)) {
        return null;
    }

    const nested = value[key];

    return isRecord(nested) ? nested : null;
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function readAnalysisConfidence(result: Record<string, unknown> | null): number | null {
    const metrics = readNestedRecord(result, 'metrics');
    const mastery = readNestedRecord(result, 'mastery');
    const decision = readNestedRecord(result, 'analysisDecision');

    return readNumber(metrics?.confidence)
        ?? readNumber(mastery?.confidence)
        ?? readNumber(decision?.confidence)
        ?? null;
}

function readAnalysisCoverage(result: Record<string, unknown> | null): number | null {
    const metrics = readNestedRecord(result, 'metrics');
    const videoQuality = readNestedRecord(result, 'videoQualityReport');

    return readNumber(metrics?.coverage)
        ?? readNumber(metrics?.trackingCoverage)
        ?? readNumber(videoQuality?.coverage)
        ?? null;
}

function readAnalysisBlockers(result: Record<string, unknown> | null): readonly string[] {
    const decision = readNestedRecord(result, 'analysisDecision');
    const blockers = readStringArray(decision?.blockers);

    return blockers.length > 0 ? blockers : ['validation_pending'];
}

async function loadWorkspaceAndActorMembership(
    workspaceId: string,
    actorUserId: string,
): Promise<{ readonly workspace: WorkspaceRow; readonly membership: MembershipRow } | null> {
    const [workspace] = await db
        .select({
            id: teamCoachWorkspaces.id,
            ownerUserId: teamCoachWorkspaces.ownerUserId,
            status: teamCoachWorkspaces.status,
            seatLimit: teamCoachWorkspaces.seatLimit,
        })
        .from(teamCoachWorkspaces)
        .where(eq(teamCoachWorkspaces.id, workspaceId))
        .limit(1);

    if (!workspace) {
        return null;
    }

    const [membership] = await db
        .select({
            id: teamCoachWorkspaceMemberships.id,
            workspaceId: teamCoachWorkspaceMemberships.workspaceId,
            userId: teamCoachWorkspaceMemberships.userId,
            role: teamCoachWorkspaceMemberships.role,
            status: teamCoachWorkspaceMemberships.status,
        })
        .from(teamCoachWorkspaceMemberships)
        .where(and(
            eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
            eq(teamCoachWorkspaceMemberships.userId, actorUserId),
        ))
        .limit(1);

    if (!membership) {
        return null;
    }

    return {
        workspace: workspace as WorkspaceRow,
        membership: membership as MembershipRow,
    };
}

async function loadOwnedAnalysisResult(
    userId: string,
    analysisSessionId: string,
): Promise<Record<string, unknown> | null> {
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

    return isRecord(row?.fullResult) ? row.fullResult : null;
}

async function assertOwnedRow(
    userId: string,
    id: string | undefined,
    loader: () => Promise<readonly unknown[]>,
): Promise<boolean> {
    if (!id) {
        return true;
    }

    const rows = await loader();

    return rows.length > 0 && Boolean(userId);
}

function sourceIdsFromInput(input: ShareTeamCoachReportSourceInput): TeamCoachSourceIds {
    return {
        ...(input.sourceAnalysisSessionId ? { analysisSessionId: input.sourceAnalysisSessionId } : {}),
        ...(input.sourceHistorySessionId ? { historySessionId: input.sourceHistorySessionId } : {}),
        ...(input.sourceProtocolRevisionId ? { protocolRevisionId: input.sourceProtocolRevisionId } : {}),
        ...(input.sourceSprayLabSessionId ? { sprayLabSessionId: input.sourceSprayLabSessionId } : {}),
        ...(input.sourceTrainingProgramCycleId ? { trainingProgramCycleId: input.sourceTrainingProgramCycleId } : {}),
        ...(input.sourceValidationLinkId ? { validationLinkId: input.sourceValidationLinkId } : {}),
    };
}

async function loadOwnedSourceEvidence(
    userId: string,
    input: ShareTeamCoachReportSourceInput,
): Promise<
    | { readonly ok: true; readonly value: OwnedSourceEvidence }
    | { readonly ok: false; readonly error: string }
> {
    const sourceIds = sourceIdsFromInput(input);

    if (Object.keys(sourceIds).length === 0) {
        return {
            ok: false,
            error: 'Informe uma fonte salva para compartilhar com a Mesa do Coach.',
        };
    }

    const analysisId = input.sourceAnalysisSessionId ?? input.sourceHistorySessionId;
    const analysisResult = analysisId ? await loadOwnedAnalysisResult(userId, analysisId) : null;

    if (analysisId && !analysisResult) {
        return {
            ok: false,
            error: 'Fonte nao encontrada ou nao pertence ao jogador.',
        };
    }

    const protocolOwned = await assertOwnedRow(userId, input.sourceProtocolRevisionId, async () => db
        .select({ id: completeTrainingProtocolRevisions.id })
        .from(completeTrainingProtocolRevisions)
        .where(and(
            eq(completeTrainingProtocolRevisions.id, input.sourceProtocolRevisionId!),
            eq(completeTrainingProtocolRevisions.userId, userId),
        ))
        .limit(1));

    const labOwned = await assertOwnedRow(userId, input.sourceSprayLabSessionId, async () => db
        .select({ id: sprayLabSessions.id })
        .from(sprayLabSessions)
        .where(and(
            eq(sprayLabSessions.id, input.sourceSprayLabSessionId!),
            eq(sprayLabSessions.userId, userId),
        ))
        .limit(1));

    const cycleOwned = await assertOwnedRow(userId, input.sourceTrainingProgramCycleId, async () => db
        .select({ id: trainingProgramCycles.id })
        .from(trainingProgramCycles)
        .where(and(
            eq(trainingProgramCycles.id, input.sourceTrainingProgramCycleId!),
            eq(trainingProgramCycles.userId, userId),
        ))
        .limit(1));

    const validationOwned = await assertOwnedRow(userId, input.sourceValidationLinkId, async () => db
        .select({ id: sprayLabValidationLinks.id })
        .from(sprayLabValidationLinks)
        .where(and(
            eq(sprayLabValidationLinks.id, input.sourceValidationLinkId!),
            eq(sprayLabValidationLinks.userId, userId),
        ))
        .limit(1));

    if (!protocolOwned || !labOwned || !cycleOwned || !validationOwned) {
        return {
            ok: false,
            error: 'Fonte nao encontrada ou nao pertence ao jogador.',
        };
    }

    return {
        ok: true,
        value: {
            sourceIds,
            analysisResult,
        },
    };
}

function buildTeamSafeSnapshot(input: {
    readonly shareId: string;
    readonly evidence: OwnedSourceEvidence;
    readonly snapshot?: Record<string, unknown>;
}): TeamCoachSafeReportSnapshot {
    const snapshot = input.snapshot ?? {};
    const confidence = readAnalysisConfidence(input.evidence.analysisResult);
    const coverage = readAnalysisCoverage(input.evidence.analysisResult);
    const blockers = readAnalysisBlockers(input.evidence.analysisResult);

    return redactTeamCoachReportForWorkspace({
        ...snapshot,
        id: input.shareId,
        sourceSummary: {
            ...(isRecord(snapshot.sourceSummary) ? snapshot.sourceSummary : {}),
            ...input.evidence.sourceIds,
        },
        honesty: {
            confidence,
            coverage,
            blockers,
            inconclusiveState: confidence === null || coverage === null,
            limitedSupport: ['Team-safe snapshot hides private account, billing, raw payload, and unshared history.'],
            validationState: input.evidence.sourceIds.validationLinkId
                ? 'compatible_validation_linked'
                : 'pending',
            noOverclaimDisclaimer:
                'Team Review Packet is evidence review and next-step coaching context, not certification, rank proof, or guaranteed improvement.',
        },
    });
}

function sourceColumnsFromIds(sourceIds: TeamCoachSourceIds): Record<string, string> {
    return {
        ...(sourceIds.analysisSessionId ? { sourceAnalysisSessionId: sourceIds.analysisSessionId } : {}),
        ...(sourceIds.historySessionId ? { sourceHistorySessionId: sourceIds.historySessionId } : {}),
        ...(sourceIds.protocolRevisionId ? { sourceProtocolRevisionId: sourceIds.protocolRevisionId } : {}),
        ...(sourceIds.sprayLabSessionId ? { sourceSprayLabSessionId: sourceIds.sprayLabSessionId } : {}),
        ...(sourceIds.trainingProgramCycleId ? { sourceTrainingProgramCycleId: sourceIds.trainingProgramCycleId } : {}),
        ...(sourceIds.validationLinkId ? { sourceValidationLinkId: sourceIds.validationLinkId } : {}),
    };
}

function sourceIdsFromShare(share: ShareRow): TeamCoachSourceIds {
    return {
        ...(share.sourceAnalysisSessionId ? { analysisSessionId: share.sourceAnalysisSessionId } : {}),
        ...(share.sourceHistorySessionId ? { historySessionId: share.sourceHistorySessionId } : {}),
        ...(share.sourceProtocolRevisionId ? { protocolRevisionId: share.sourceProtocolRevisionId } : {}),
        ...(share.sourceSprayLabSessionId ? { sprayLabSessionId: share.sourceSprayLabSessionId } : {}),
        ...(share.sourceTrainingProgramCycleId ? { trainingProgramCycleId: share.sourceTrainingProgramCycleId } : {}),
        ...(share.sourceValidationLinkId ? { validationLinkId: share.sourceValidationLinkId } : {}),
    };
}

async function requireCapabilityForLoadedContext(input: {
    readonly user: AuthenticatedTeamCoachUser;
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
    readonly capability: TeamCoachCapability;
    readonly share?: ShareRow;
}): Promise<null | TeamCoachActionErrorResult> {
    const policy = await resolveTeamCoachAccessForUser(input.user.userId, input.user.role, {
        workspaceRole: input.membership.role,
        workspaceStatus: input.workspace.status,
        membershipStatus: input.membership.status,
        ...(input.share?.consentStatus === 'granted' ? { consentStatus: 'granted' as const } : {}),
        ...(input.share?.consentScopes ? { consentScopes: input.share.consentScopes } : {}),
        requiredConsentScopes: ['analysis_summary', 'review_packet'],
        ...(input.share?.shareStatus ? { shareStatus: input.share.shareStatus } : {}),
    });

    if (hasTeamCoachCapability(policy, input.capability)) {
        return null;
    }

    return actionError(
        'Acesso Team necessario para alterar reports da Mesa do Coach.',
        firstDenial(policy.capabilityDenials[input.capability]),
    );
}

async function requireWorkspaceOwnerTeamAccess(input: {
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
}): Promise<null | TeamCoachActionErrorResult> {
    const policy = await resolveTeamCoachAccessForUser(input.workspace.ownerUserId, 'user', {
        workspaceRole: 'owner',
        workspaceStatus: input.workspace.status,
        membershipStatus: 'active',
        consentStatus: 'granted',
        consentScopes: DEFAULT_CONSENT_SCOPES,
        requiredConsentScopes: DEFAULT_CONSENT_SCOPES,
        shareStatus: 'active',
    });

    if (hasTeamCoachCapability(policy, 'create_share')) {
        return null;
    }

    return actionError(
        'Acesso Team do workspace necessario para receber compartilhamento.',
        firstDenial(policy.capabilityDenials.create_share),
    );
}

async function writeAuditEvent(input: {
    readonly workspaceId: string;
    readonly actorUserId?: string | null;
    readonly targetUserId?: string | null;
    readonly shareId?: string | null;
    readonly packetId?: string | null;
    readonly packetLinkId?: string | null;
    readonly eventType: TeamCoachAuditEventType;
    readonly reasonCode?: string | null;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db.insert(teamCoachAuditEvents).values({
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        shareId: input.shareId ?? null,
        packetId: input.packetId ?? null,
        packetLinkId: input.packetLinkId ?? null,
        eventType: input.eventType,
        reasonCode: input.reasonCode ?? null,
        metadata: input.metadata ?? {},
    });
}

async function loadShareWorkspaceMembership(input: {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly actorUserId: string;
}): Promise<{
    readonly share: ShareRow;
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
} | null> {
    const [share] = await db
        .select({
            id: teamCoachReportShares.id,
            workspaceId: teamCoachReportShares.workspaceId,
            playerUserId: teamCoachReportShares.playerUserId,
            sharedByUserId: teamCoachReportShares.sharedByUserId,
            consentStatus: teamCoachReportShares.consentStatus,
            consentScopes: teamCoachReportShares.consentScopes,
            shareStatus: teamCoachReportShares.shareStatus,
            teamSafeSnapshot: teamCoachReportShares.teamSafeSnapshot,
            sourceAnalysisSessionId: teamCoachReportShares.sourceAnalysisSessionId,
            sourceHistorySessionId: teamCoachReportShares.sourceHistorySessionId,
            sourceProtocolRevisionId: teamCoachReportShares.sourceProtocolRevisionId,
            sourceSprayLabSessionId: teamCoachReportShares.sourceSprayLabSessionId,
            sourceTrainingProgramCycleId: teamCoachReportShares.sourceTrainingProgramCycleId,
            sourceValidationLinkId: teamCoachReportShares.sourceValidationLinkId,
        })
        .from(teamCoachReportShares)
        .where(and(
            eq(teamCoachReportShares.id, input.shareId),
            eq(teamCoachReportShares.workspaceId, input.workspaceId),
        ))
        .limit(1);

    if (!share) {
        return null;
    }

    const loaded = await loadWorkspaceAndActorMembership(input.workspaceId, input.actorUserId);

    return loaded
        ? {
            share: share as ShareRow,
            workspace: loaded.workspace,
            membership: loaded.membership,
        }
        : null;
}

async function loadPacketShareWorkspaceMembership(input: {
    readonly workspaceId: string;
    readonly packetId: string;
    readonly actorUserId: string;
}): Promise<{
    readonly packet: PacketRow;
    readonly share: ShareRow;
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
} | null> {
    const [packet] = await db
        .select({
            id: teamCoachReviewPackets.id,
            workspaceId: teamCoachReviewPackets.workspaceId,
            shareId: teamCoachReviewPackets.shareId,
            createdByUserId: teamCoachReviewPackets.createdByUserId,
            playerUserId: teamCoachReviewPackets.playerUserId,
            visibility: teamCoachReviewPackets.visibility,
            status: teamCoachReviewPackets.status,
            title: teamCoachReviewPackets.title,
            teamSafeSnapshot: teamCoachReviewPackets.teamSafeSnapshot,
            reviewStatus: teamCoachReviewPackets.reviewStatus,
            requestedNextAction: teamCoachReviewPackets.requestedNextAction,
            createdAt: teamCoachReviewPackets.createdAt,
            updatedAt: teamCoachReviewPackets.updatedAt,
        })
        .from(teamCoachReviewPackets)
        .where(and(
            eq(teamCoachReviewPackets.id, input.packetId),
            eq(teamCoachReviewPackets.workspaceId, input.workspaceId),
        ))
        .limit(1);

    if (!packet) {
        return null;
    }

    const loadedShare = await loadShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        shareId: (packet as PacketRow).shareId,
        actorUserId: input.actorUserId,
    });

    return loadedShare
        ? {
            packet: packet as PacketRow,
            share: loadedShare.share,
            workspace: loadedShare.workspace,
            membership: loadedShare.membership,
        }
        : null;
}

async function loadOwnedPacketLink(input: {
    readonly packetId: string;
    readonly linkId?: string;
}): Promise<PacketLinkRow | null> {
    if (!input.linkId) {
        return null;
    }

    const [row] = await db
        .select({
            id: teamCoachPacketLinks.id,
            packetId: teamCoachPacketLinks.packetId,
            status: teamCoachPacketLinks.status,
            tokenVerifierHash: teamCoachPacketLinks.tokenVerifierHash,
            expiresAt: teamCoachPacketLinks.expiresAt,
        })
        .from(teamCoachPacketLinks)
        .where(and(
            eq(teamCoachPacketLinks.id, input.linkId),
            eq(teamCoachPacketLinks.packetId, input.packetId),
        ))
        .limit(1);

    return row as PacketLinkRow | null ?? null;
}

function revalidateTeamCoachPaths(workspaceId?: string, packetId?: string): void {
    revalidatePath('/mesa-coach');
    revalidatePath('/dashboard');
    revalidatePath('/history');

    if (workspaceId) {
        revalidatePath(`/mesa-coach?workspaceId=${workspaceId}`);
    }

    if (packetId) {
        revalidatePath(`/mesa-coach/packets/${packetId}`);
    }
}

function shareResult(row: ShareRow | Record<string, unknown>): {
    readonly id: string;
    readonly shareStatus: TeamCoachShareStatus;
    readonly teamSafeSnapshot: Record<string, unknown>;
} {
    return {
        id: String(row.id ?? 'share'),
        shareStatus: (row.shareStatus === 'revoked' ? 'revoked' : 'active') as TeamCoachShareStatus,
        teamSafeSnapshot: isRecord(row.teamSafeSnapshot)
            ? redactTeamCoachReportForWorkspace(row.teamSafeSnapshot)
            : redactTeamCoachReportForWorkspace({ id: String(row.id ?? 'share') }),
    };
}

function packetMutationResult(row: PacketRow | Record<string, unknown>): {
    readonly id: string;
    readonly status: string;
    readonly visibility: string;
    readonly teamSafeSnapshot: Record<string, unknown>;
} {
    return {
        id: String(row.id ?? 'packet'),
        status: String(row.status ?? 'draft'),
        visibility: String(row.visibility ?? 'private'),
        teamSafeSnapshot: isRecord(row.teamSafeSnapshot)
            ? redactTeamCoachReportForWorkspace(row.teamSafeSnapshot)
            : redactTeamCoachReportForWorkspace({ id: String(row.id ?? 'packet') }),
    };
}

export async function shareTeamCoachReportSource(
    input: ShareTeamCoachReportSourceInput,
): Promise<ShareTeamCoachReportSourceResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);

    if (!workspaceId) {
        return actionError('Mesa do Coach invalida.');
    }

    const loaded = await loadWorkspaceAndActorMembership(workspaceId, user.userId);

    if (!loaded) {
        return actionError('Membro da Mesa do Coach nao encontrado.', 'no_workspace_membership');
    }

    if (loaded.membership.status !== 'active') {
        return actionError('Membro da Mesa do Coach inativo.', 'no_workspace_membership');
    }

    const teamAccessError = loaded.membership.role === 'player'
        ? await requireWorkspaceOwnerTeamAccess(loaded)
        : await requireCapabilityForLoadedContext({
            user,
            workspace: loaded.workspace,
            membership: loaded.membership,
            capability: 'create_share',
        });

    if (teamAccessError) {
        return teamAccessError;
    }

    const evidence = await loadOwnedSourceEvidence(user.userId, input);

    if (!evidence.ok) {
        return actionError(evidence.error, 'source_not_shared');
    }

    const shareId = randomUUID();
    const teamSafeSnapshot = buildTeamSafeSnapshot({
        shareId,
        evidence: evidence.value,
        ...(input.snapshot ? { snapshot: input.snapshot } : {}),
    });
    const consentScopes = input.consentScopes && input.consentScopes.length > 0
        ? input.consentScopes
        : DEFAULT_CONSENT_SCOPES;
    const expiresAt = parseDate(input.expiresAt);
    const now = new Date();
    const [createdShare] = await db
        .insert(teamCoachReportShares)
        .values({
            id: shareId,
            workspaceId,
            playerUserId: user.userId,
            sharedByUserId: user.userId,
            consentStatus: 'granted',
            consentScopes,
            shareStatus: 'active',
            teamSafeSnapshot,
            ...sourceColumnsFromIds(evidence.value.sourceIds),
            grantedAt: now,
            ...(expiresAt ? { expiresAt } : {}),
            createdAt: now,
            updatedAt: now,
            payload: {
                sourceIds: evidence.value.sourceIds,
            },
        })
        .returning({
            id: teamCoachReportShares.id,
            shareStatus: teamCoachReportShares.shareStatus,
            teamSafeSnapshot: teamCoachReportShares.teamSafeSnapshot,
        });

    await writeAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId: user.userId,
        shareId,
        eventType: 'share_created',
        metadata: {
            sourceIds: evidence.value.sourceIds,
            consentScopes,
        },
    });
    revalidateTeamCoachPaths(workspaceId);

    return {
        success: true,
        share: shareResult(createdShare ?? {
            id: shareId,
            shareStatus: 'active',
            teamSafeSnapshot,
        }),
        auditEvents: [toActionAuditEvent('share_created')],
    };
}

export async function revokeTeamCoachReportShare(
    input: RevokeTeamCoachReportShareInput,
): Promise<RevokeTeamCoachReportShareResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);
    const shareId = normalizeRequiredText(input.shareId);

    if (!workspaceId || !shareId) {
        return actionError('Compartilhamento invalido.');
    }

    const loaded = await loadShareWorkspaceMembership({
        workspaceId,
        shareId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Compartilhamento nao encontrado.', 'source_not_shared');
    }

    const actorIsPlayer = loaded.share.playerUserId === user.userId;
    const accessError = actorIsPlayer
        ? null
        : await requireCapabilityForLoadedContext({
            user,
            workspace: loaded.workspace,
            membership: loaded.membership,
            capability: 'revoke_share',
            share: loaded.share,
        });

    if (accessError) {
        return accessError;
    }

    const now = new Date();
    await db
        .update(teamCoachReportShares)
        .set({
            shareStatus: 'revoked',
            revokedByUserId: user.userId,
            revokedAt: now,
            updatedAt: now,
            payload: {
                sourceIds: sourceIdsFromShare(loaded.share),
                safeSnapshotReadableAfterRevocation: true,
            },
        })
        .where(eq(teamCoachReportShares.id, shareId));
    await writeAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.share.playerUserId,
        shareId,
        eventType: 'share_revoked',
        reasonCode: normalizeOptionalText(input.reason),
        metadata: {
            stoppedSourceIds: sourceIdsFromShare(loaded.share),
            safeSnapshotReadable: true,
        },
    });
    revalidateTeamCoachPaths(workspaceId);

    return {
        success: true,
        share: {
            id: shareId,
            shareStatus: 'revoked',
        },
        safeSnapshotReadable: true,
        auditEvents: [toActionAuditEvent('share_revoked')],
    };
}

export async function requestTeamCoachExpandedContext(
    input: TeamCoachExpandedContextInput,
): Promise<TeamCoachExpandedContextResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Compartilhamento nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'update_review_status',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    await db.insert(teamCoachReviewStatusEvents).values({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: user.userId,
        playerUserId: loaded.share.playerUserId,
        previousStatus: null,
        nextStatus: 'waiting_player',
        reason: normalizeOptionalText(input.reason),
        payload: {
            requestedScopes: input.requestedScopes ?? [],
            requestedNextAction: 'review_report',
        },
    });
    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.share.playerUserId,
        shareId: input.shareId,
        eventType: 'review_status_updated',
        reasonCode: normalizeOptionalText(input.reason),
        metadata: {
            requestedScopes: input.requestedScopes ?? [],
        },
    });

    return {
        success: true,
        shareId: input.shareId,
        auditEvents: [toActionAuditEvent('review_status_updated')],
    };
}

export async function approveTeamCoachExpandedContext(
    input: TeamCoachExpandedContextInput,
): Promise<TeamCoachExpandedContextResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: user.userId,
    });

    if (!loaded || loaded.share.playerUserId !== user.userId) {
        return actionError('Apenas o jogador pode aprovar contexto expandido.', 'role_blocked');
    }

    const consentScopes = input.requestedScopes && input.requestedScopes.length > 0
        ? Array.from(new Set([...loaded.share.consentScopes, ...input.requestedScopes]))
        : loaded.share.consentScopes;

    await db
        .update(teamCoachReportShares)
        .set({
            consentStatus: 'granted',
            consentScopes,
            updatedAt: new Date(),
        })
        .where(eq(teamCoachReportShares.id, input.shareId));
    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: user.userId,
        shareId: input.shareId,
        eventType: 'consent_granted',
        reasonCode: normalizeOptionalText(input.reason),
        metadata: {
            consentScopes,
        },
    });

    return {
        success: true,
        shareId: input.shareId,
        auditEvents: [toActionAuditEvent('consent_granted')],
    };
}

export async function createTeamCoachReviewPacket(
    input: CreateTeamCoachReviewPacketInput,
): Promise<TeamCoachReviewPacketMutationResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Compartilhamento nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'create_review_packet',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    const packetId = randomUUID();
    const reviewStatus = isTeamCoachReviewStatus(input.reviewStatus ?? '')
        ? input.reviewStatus
        : 'needs_review';
    const requestedNextAction = isTeamCoachNextActionKind(input.requestedNextAction ?? '')
        ? input.requestedNextAction
        : 'review_report';
    const now = new Date();
    const [createdPacket] = await db
        .insert(teamCoachReviewPackets)
        .values({
            id: packetId,
            workspaceId: input.workspaceId,
            shareId: input.shareId,
            createdByUserId: user.userId,
            playerUserId: loaded.share.playerUserId,
            visibility: input.visibility ?? 'unlisted',
            status: 'ready',
            title: normalizeOptionalText(input.title) ?? 'Team Review Packet',
            teamSafeSnapshot: redactTeamCoachReportForWorkspace(loaded.share.teamSafeSnapshot),
            reviewStatus,
            requestedNextAction,
            payload: {
                printExportEnabled: true,
                sourceList: Object.values(sourceIdsFromShare(loaded.share)),
            },
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: teamCoachReviewPackets.id,
            status: teamCoachReviewPackets.status,
            visibility: teamCoachReviewPackets.visibility,
            teamSafeSnapshot: teamCoachReviewPackets.teamSafeSnapshot,
        });

    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.share.playerUserId,
        shareId: input.shareId,
        packetId,
        eventType: 'packet_created',
        metadata: {
            reviewStatus,
            requestedNextAction,
        },
    });
    revalidateTeamCoachPaths(input.workspaceId, packetId);

    return {
        success: true,
        packet: packetMutationResult(createdPacket ?? {
            id: packetId,
            status: 'ready',
            visibility: input.visibility ?? 'unlisted',
            teamSafeSnapshot: loaded.share.teamSafeSnapshot,
        }),
        auditEvents: [toActionAuditEvent('packet_created')],
    };
}

export async function updateTeamCoachReviewPacketControls(
    input: UpdateTeamCoachReviewPacketControlsInput,
): Promise<TeamCoachReviewPacketMutationResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadPacketShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        packetId: input.packetId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Packet nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'edit_review_packet',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    const teamSafeSnapshot = redactTeamCoachReportForWorkspace({
        ...loaded.packet.teamSafeSnapshot,
        ...(input.controls ? { controls: input.controls } : {}),
    });
    const reviewStatus = isTeamCoachReviewStatus(input.reviewStatus ?? '')
        ? input.reviewStatus
        : loaded.packet.reviewStatus;
    const requestedNextAction = isTeamCoachNextActionKind(input.requestedNextAction ?? '')
        ? input.requestedNextAction
        : loaded.packet.requestedNextAction;
    await db
        .update(teamCoachReviewPackets)
        .set({
            ...(input.title ? { title: input.title.trim() } : {}),
            ...(input.status ? { status: input.status } : {}),
            teamSafeSnapshot,
            reviewStatus,
            requestedNextAction,
            updatedAt: new Date(),
        })
        .where(eq(teamCoachReviewPackets.id, input.packetId));
    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.packet.playerUserId,
        shareId: loaded.packet.shareId,
        packetId: input.packetId,
        eventType: 'packet_updated',
        metadata: {
            reviewStatus,
            requestedNextAction,
        },
    });
    revalidateTeamCoachPaths(input.workspaceId, input.packetId);

    return {
        success: true,
        packet: packetMutationResult({
            ...loaded.packet,
            status: input.status ?? loaded.packet.status,
            visibility: loaded.packet.visibility,
            teamSafeSnapshot,
        }),
        auditEvents: [toActionAuditEvent('packet_updated')],
    };
}

export async function createTeamCoachPacketLink(
    input: TeamCoachPacketLinkActionInput,
): Promise<TeamCoachPacketLinkMutationResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadPacketShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        packetId: input.packetId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Packet nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'manage_packet_links',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    const token = generateTeamCoachPacketLinkToken();
    const verifier = createTeamCoachPacketLinkTokenVerifier(token);
    const expiresAt = parseDate(input.expiresAt);
    const now = new Date();
    const [createdLink] = await db
        .insert(teamCoachPacketLinks)
        .values({
            packetId: input.packetId,
            workspaceId: input.workspaceId,
            ownerUserId: user.userId,
            tokenVerifierHash: verifier.tokenVerifierHash,
            tokenVerifierPrefix: verifier.tokenVerifierPrefix,
            status: 'active',
            ...(expiresAt ? { expiresAt } : {}),
            payload: {
                ...(normalizeOptionalText(input.reason) ? { createdReason: normalizeOptionalText(input.reason)! } : {}),
            },
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: teamCoachPacketLinks.id,
            status: teamCoachPacketLinks.status,
            expiresAt: teamCoachPacketLinks.expiresAt,
        });
    const linkId = String(createdLink?.id ?? randomUUID());

    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.packet.playerUserId,
        shareId: loaded.packet.shareId,
        packetId: input.packetId,
        packetLinkId: linkId,
        eventType: 'packet_link_created',
        reasonCode: normalizeOptionalText(input.reason),
        metadata: {
            expiresAt: expiresAt?.toISOString() ?? null,
        },
    });
    revalidateTeamCoachPaths(input.workspaceId, input.packetId);

    return {
        success: true,
        link: {
            id: linkId,
            token,
            status: createdLink?.status ?? 'active',
            expiresAt: (createdLink?.expiresAt instanceof Date
                ? createdLink.expiresAt
                : expiresAt)?.toISOString() ?? null,
        },
        auditEvents: [toActionAuditEvent('packet_link_created')],
    };
}

export async function regenerateTeamCoachPacketLink(
    input: TeamCoachPacketLinkActionInput,
): Promise<TeamCoachPacketLinkMutationResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadPacketShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        packetId: input.packetId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Packet nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'manage_packet_links',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    const previousLink = await loadOwnedPacketLink({
        packetId: input.packetId,
        ...((input.previousLinkId ?? input.linkId)
            ? { linkId: (input.previousLinkId ?? input.linkId)! }
            : {}),
    });

    if (!previousLink) {
        return actionError('Link do packet nao encontrado.');
    }

    await db
        .update(teamCoachPacketLinks)
        .set({
            status: 'revoked',
            revokedByUserId: user.userId,
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(teamCoachPacketLinks.id, previousLink.id));

    const created = await createTeamCoachPacketLink({
        workspaceId: input.workspaceId,
        packetId: input.packetId,
        ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
        reason: input.reason ?? 'regenerated',
    });

    if (created.success) {
        return {
            ...created,
            auditEvents: [toActionAuditEvent('packet_link_revoked'), ...created.auditEvents],
        };
    }

    return created;
}

export async function revokeTeamCoachPacketLink(
    input: TeamCoachPacketLinkActionInput,
): Promise<TeamCoachPacketLinkMutationResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadPacketShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        packetId: input.packetId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Packet nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForLoadedContext({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'manage_packet_links',
        share: loaded.share,
    });

    if (accessError) {
        return accessError;
    }

    const link = await loadOwnedPacketLink({
        packetId: input.packetId,
        ...(input.linkId ? { linkId: input.linkId } : {}),
    });

    if (!link) {
        return actionError('Link do packet nao encontrado.');
    }

    await db
        .update(teamCoachPacketLinks)
        .set({
            status: 'revoked',
            revokedByUserId: user.userId,
            revokedAt: new Date(),
            updatedAt: new Date(),
            payload: {
                ...(normalizeOptionalText(input.reason) ? { revokedReason: normalizeOptionalText(input.reason)! } : {}),
            },
        })
        .where(eq(teamCoachPacketLinks.id, link.id));
    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.packet.playerUserId,
        shareId: loaded.packet.shareId,
        packetId: input.packetId,
        packetLinkId: link.id,
        eventType: 'packet_link_revoked',
        reasonCode: normalizeOptionalText(input.reason),
    });
    revalidateTeamCoachPaths(input.workspaceId, input.packetId);

    return {
        success: true,
        link: {
            id: link.id,
            status: 'revoked',
        },
        auditEvents: [toActionAuditEvent('packet_link_revoked')],
    };
}

function packetIsReadable(status: string): boolean {
    return status === 'ready' || status === 'published';
}

export async function readTeamCoachPacketByToken(
    token: string,
    input: { readonly now?: Date | string | null } = {},
): Promise<TeamCoachPacketReadResult> {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
        return actionError('Link privado invalido.');
    }

    const verifier = createTeamCoachPacketLinkTokenVerifier(normalizedToken);
    const [link] = await db
        .select({
            id: teamCoachPacketLinks.id,
            packetId: teamCoachPacketLinks.packetId,
            status: teamCoachPacketLinks.status,
            tokenVerifierHash: teamCoachPacketLinks.tokenVerifierHash,
            expiresAt: teamCoachPacketLinks.expiresAt,
        })
        .from(teamCoachPacketLinks)
        .where(eq(teamCoachPacketLinks.tokenVerifierPrefix, verifier.tokenVerifierPrefix))
        .limit(1) as PacketLinkRow[];

    if (!link) {
        return actionError('Link privado invalido.');
    }

    const verification = verifyTeamCoachPacketLinkToken({
        token: normalizedToken,
        tokenVerifierHash: link.tokenVerifierHash,
        status: link.status,
        ...(link.expiresAt === undefined ? {} : { expiresAt: link.expiresAt }),
        ...(parseNow(input.now) ? { now: parseNow(input.now)! } : {}),
    });

    if (!verification.active) {
        return actionError(verification.reason === 'expired'
            ? 'Packet link expired.'
            : 'Packet link disabled, revoked, or invalid.');
    }

    const [packet] = await db
        .select({
            id: teamCoachReviewPackets.id,
            workspaceId: teamCoachReviewPackets.workspaceId,
            shareId: teamCoachReviewPackets.shareId,
            createdByUserId: teamCoachReviewPackets.createdByUserId,
            playerUserId: teamCoachReviewPackets.playerUserId,
            visibility: teamCoachReviewPackets.visibility,
            status: teamCoachReviewPackets.status,
            title: teamCoachReviewPackets.title,
            teamSafeSnapshot: teamCoachReviewPackets.teamSafeSnapshot,
            reviewStatus: teamCoachReviewPackets.reviewStatus,
            requestedNextAction: teamCoachReviewPackets.requestedNextAction,
            createdAt: teamCoachReviewPackets.createdAt,
            updatedAt: teamCoachReviewPackets.updatedAt,
        })
        .from(teamCoachReviewPackets)
        .where(eq(teamCoachReviewPackets.id, link.packetId))
        .limit(1) as PacketRow[];

    if (!packet || !packetIsReadable(String(packet.status))) {
        return actionError('Packet nao esta disponivel.');
    }

    return {
        success: true,
        packet: buildTeamCoachPacketViewModel({
            packet: {
                ...packet,
                teamSafeSnapshot: packet.teamSafeSnapshot,
            },
            workspace: {
                id: packet.workspaceId,
                name: 'Mesa do Coach',
            },
            player: {
                id: packet.playerUserId,
                displayName: 'Player',
            },
        }),
    };
}
