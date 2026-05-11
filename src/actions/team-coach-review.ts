'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    teamCoachAuditEvents,
    teamCoachReportShares,
    teamCoachReviewNotes,
    teamCoachReviewStatusEvents,
    teamCoachWorkspaceMemberships,
    teamCoachWorkspaces,
} from '@/db/schema';
import {
    hasTeamCoachCapability,
    resolveTeamCoachAccessForUser,
    type TeamCoachCapability,
} from '@/lib/team-coach-access';
import {
    isTeamCoachConsentStatus,
    isTeamCoachNextActionKind,
    isTeamCoachReviewStatus,
    isTeamCoachShareStatus,
    type TeamCoachAuditEventType,
    type TeamCoachConsentStatus,
    type TeamCoachConsentScope,
    type TeamCoachDenialReason,
    type TeamCoachMembershipStatus,
    type TeamCoachNextActionKind,
    type TeamCoachReviewStatus,
    type TeamCoachShareStatus,
    type TeamCoachWorkspaceRole,
    type TeamCoachWorkspaceStatus,
} from '@/types/team-coach';

export type TeamCoachReviewActionTarget =
    | 'new_compatible_clip'
    | 'spray_lab_session'
    | 'ciclo_pro_mission'
    | 'blocker_repair'
    | 'updated_team_review_packet';

type TeamCoachActionErrorResult = {
    readonly success: false;
    readonly error: string;
    readonly denialReason?: TeamCoachDenialReason;
};

type TeamCoachActionResult<TPayload> =
    | ({ readonly success: true } & TPayload)
    | TeamCoachActionErrorResult;

export interface CreateTeamCoachReviewNoteInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly note: string;
    readonly requestedNextAction?: TeamCoachNextActionKind;
}

export interface UpdateTeamCoachReviewStatusInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly nextStatus: TeamCoachReviewStatus;
    readonly previousStatus?: TeamCoachReviewStatus | null;
    readonly reason?: string;
    readonly requestedNextAction?: TeamCoachNextActionKind;
}

export interface RequestTeamCoachNextActionInput {
    readonly workspaceId: string;
    readonly shareId: string;
    readonly target: TeamCoachReviewActionTarget;
    readonly reason?: string;
}

export interface TeamCoachActionAuditEvent {
    readonly type: `team_coach.${TeamCoachAuditEventType}`;
}

export type CreateTeamCoachReviewNoteResult = TeamCoachActionResult<{
    readonly note: {
        readonly id: string;
        readonly requestedNextAction: TeamCoachNextActionKind | null;
    };
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export type UpdateTeamCoachReviewStatusResult = TeamCoachActionResult<{
    readonly reviewStatus: TeamCoachReviewStatus;
    readonly requestedNextAction: TeamCoachNextActionKind | null;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export type RequestTeamCoachNextActionResult = TeamCoachActionResult<{
    readonly reviewStatus: TeamCoachReviewStatus;
    readonly requestedNextAction: {
        readonly target: TeamCoachReviewActionTarget;
        readonly kind: TeamCoachNextActionKind;
        readonly label: string;
        readonly href: string;
    };
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

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

interface ShareRow {
    readonly id: string;
    readonly workspaceId: string;
    readonly playerUserId: string;
    readonly consentStatus: TeamCoachConsentStatus | string;
    readonly consentScopes: readonly TeamCoachConsentScope[];
    readonly shareStatus: TeamCoachShareStatus | string;
}

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

function toActionAuditEvent(type: TeamCoachAuditEventType): TeamCoachActionAuditEvent {
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

function normalizeRequiredText(value: string): string {
    return value.trim();
}

function normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = value?.trim();

    return normalized && normalized.length > 0 ? normalized : null;
}

function firstDenial(denials?: readonly TeamCoachDenialReason[]): TeamCoachDenialReason | undefined {
    return denials?.[0];
}

function normalizeConsentStatus(value: string): TeamCoachConsentStatus | null {
    return isTeamCoachConsentStatus(value) ? value : null;
}

function normalizeShareStatus(value: string): TeamCoachShareStatus | null {
    return isTeamCoachShareStatus(value) ? value : null;
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
            consentStatus: teamCoachReportShares.consentStatus,
            consentScopes: teamCoachReportShares.consentScopes,
            shareStatus: teamCoachReportShares.shareStatus,
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

    const [workspace] = await db
        .select({
            id: teamCoachWorkspaces.id,
            ownerUserId: teamCoachWorkspaces.ownerUserId,
            status: teamCoachWorkspaces.status,
            seatLimit: teamCoachWorkspaces.seatLimit,
        })
        .from(teamCoachWorkspaces)
        .where(eq(teamCoachWorkspaces.id, input.workspaceId))
        .limit(1);

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
            eq(teamCoachWorkspaceMemberships.workspaceId, input.workspaceId),
            eq(teamCoachWorkspaceMemberships.userId, input.actorUserId),
        ))
        .limit(1);

    if (!workspace || !membership) {
        return null;
    }

    return {
        share: share as ShareRow,
        workspace: workspace as WorkspaceRow,
        membership: membership as MembershipRow,
    };
}

async function requireCapabilityForShare(input: {
    readonly user: AuthenticatedTeamCoachUser;
    readonly loaded: {
        readonly share: ShareRow;
        readonly workspace: WorkspaceRow;
        readonly membership: MembershipRow;
    };
    readonly capability: TeamCoachCapability;
    readonly requiredConsentScopes?: readonly TeamCoachConsentScope[];
}): Promise<TeamCoachActionErrorResult | null> {
    const policy = await resolveTeamCoachAccessForUser(input.user.userId, input.user.role, {
        workspaceRole: input.loaded.membership.role,
        workspaceStatus: input.loaded.workspace.status,
        membershipStatus: input.loaded.membership.status,
        consentStatus: normalizeConsentStatus(input.loaded.share.consentStatus),
        consentScopes: input.loaded.share.consentScopes,
        requiredConsentScopes: input.requiredConsentScopes ?? ['analysis_summary', 'review_packet'],
        shareStatus: normalizeShareStatus(input.loaded.share.shareStatus),
    });

    if (hasTeamCoachCapability(policy, input.capability)) {
        return null;
    }

    return actionError(
        'Acesso da Mesa do Coach negado para esta acao.',
        firstDenial(policy.capabilityDenials[input.capability]),
    );
}

async function writeAuditEvent(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly targetUserId: string;
    readonly shareId: string;
    readonly noteId?: string;
    readonly eventType: TeamCoachAuditEventType;
    readonly reasonCode?: string | null;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db.insert(teamCoachAuditEvents).values({
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        shareId: input.shareId,
        ...(input.noteId ? { noteId: input.noteId } : {}),
        eventType: input.eventType,
        reasonCode: input.reasonCode ?? null,
        metadata: input.metadata ?? {},
    });
}

function revalidateTeamCoachPaths(workspaceId: string, playerUserId?: string): void {
    revalidatePath('/mesa-coach');
    revalidatePath(`/mesa-coach?workspaceId=${encodeURIComponent(workspaceId)}`);

    if (playerUserId) {
        revalidatePath(`/mesa-coach/dossier/${encodeURIComponent(playerUserId)}`);
    }
}

function normalizeRequestedNextAction(value: string | null | undefined): TeamCoachNextActionKind | null {
    return value && isTeamCoachNextActionKind(value) ? value : null;
}

function normalizeReviewStatus(value: string): TeamCoachReviewStatus {
    return isTeamCoachReviewStatus(value) ? value : 'needs_review';
}

export async function createTeamCoachReviewNote(
    input: CreateTeamCoachReviewNoteInput,
): Promise<CreateTeamCoachReviewNoteResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const note = normalizeRequiredText(input.note);

    if (!note) {
        return actionError('Informe uma nota privada para a Mesa do Coach.');
    }

    const loaded = await loadShareWorkspaceMembership({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Compartilhamento nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapabilityForShare({
        user,
        loaded,
        capability: 'write_coach_note',
        requiredConsentScopes: ['analysis_summary', 'review_packet', 'coach_notes'],
    });

    if (accessError) {
        return accessError;
    }

    const requestedNextAction = normalizeRequestedNextAction(input.requestedNextAction ?? null);
    const [createdNote] = await db
        .insert(teamCoachReviewNotes)
        .values({
            workspaceId: input.workspaceId,
            shareId: input.shareId,
            authorUserId: user.userId,
            playerUserId: loaded.share.playerUserId,
            note,
            ...(requestedNextAction ? { requestedNextAction } : {}),
            payload: {
                visibility: 'workspace_private',
                immutableAnalysisFacts: true,
            },
        })
        .returning({ id: teamCoachReviewNotes.id });
    const noteId = String(createdNote?.id ?? input.shareId);

    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
        targetUserId: loaded.share.playerUserId,
        shareId: input.shareId,
        noteId,
        eventType: 'review_note_created',
        metadata: {
            requestedNextAction,
        },
    });
    revalidateTeamCoachPaths(input.workspaceId, loaded.share.playerUserId);

    return {
        success: true,
        note: {
            id: noteId,
            requestedNextAction,
        },
        auditEvents: [toActionAuditEvent('review_note_created')],
    };
}

async function insertReviewStatusEvent(input: {
    readonly user: AuthenticatedTeamCoachUser;
    readonly loaded: {
        readonly share: ShareRow;
        readonly workspace: WorkspaceRow;
        readonly membership: MembershipRow;
    };
    readonly workspaceId: string;
    readonly shareId: string;
    readonly previousStatus?: TeamCoachReviewStatus | null;
    readonly nextStatus: TeamCoachReviewStatus;
    readonly reason?: string | null;
    readonly requestedNextAction?: TeamCoachNextActionKind | null;
    readonly requestedLoop?: TeamCoachReviewActionTarget | null;
}): Promise<void> {
    const payload = {
        ...(input.requestedNextAction ? { requestedNextAction: input.requestedNextAction } : {}),
        ...(input.requestedLoop ? { requestedLoop: input.requestedLoop } : {}),
        immutableAnalysisFacts: true,
    };

    await db.insert(teamCoachReviewStatusEvents).values({
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        actorUserId: input.user.userId,
        playerUserId: input.loaded.share.playerUserId,
        previousStatus: input.previousStatus ?? null,
        nextStatus: input.nextStatus,
        reason: normalizeOptionalText(input.reason),
        payload,
    });
    await writeAuditEvent({
        workspaceId: input.workspaceId,
        actorUserId: input.user.userId,
        targetUserId: input.loaded.share.playerUserId,
        shareId: input.shareId,
        eventType: 'review_status_updated',
        reasonCode: normalizeOptionalText(input.reason),
        metadata: {
            previousStatus: input.previousStatus ?? null,
            nextStatus: input.nextStatus,
            requestedNextAction: input.requestedNextAction ?? null,
            requestedLoop: input.requestedLoop ?? null,
        },
    });
}

export async function updateTeamCoachReviewStatus(
    input: UpdateTeamCoachReviewStatusInput,
): Promise<UpdateTeamCoachReviewStatusResult> {
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

    const accessError = await requireCapabilityForShare({
        user,
        loaded,
        capability: 'update_review_status',
    });

    if (accessError) {
        return accessError;
    }

    const nextStatus = normalizeReviewStatus(input.nextStatus);
    const requestedNextAction = normalizeRequestedNextAction(input.requestedNextAction ?? null);

    await insertReviewStatusEvent({
        user,
        loaded,
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        previousStatus: input.previousStatus ?? null,
        nextStatus,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        ...(requestedNextAction ? { requestedNextAction } : {}),
    });
    revalidateTeamCoachPaths(input.workspaceId, loaded.share.playerUserId);

    return {
        success: true,
        reviewStatus: nextStatus,
        requestedNextAction,
        auditEvents: [toActionAuditEvent('review_status_updated')],
    };
}

function resolveTargetNextAction(target: TeamCoachReviewActionTarget): {
    readonly status: TeamCoachReviewStatus;
    readonly kind: TeamCoachNextActionKind;
    readonly label: string;
    readonly href: string;
} {
    switch (target) {
        case 'new_compatible_clip':
            return {
                status: 'validation_requested',
                kind: 'request_validation',
                label: 'Request a new compatible clip',
                href: '/analyze?mode=validation',
            };
        case 'spray_lab_session':
            return {
                status: 'repair_requested',
                kind: 'request_repair',
                label: 'Request Spray Lab repair session',
                href: '/spray-lab',
            };
        case 'ciclo_pro_mission':
            return {
                status: 'waiting_player',
                kind: 'review_report',
                label: 'Request Ciclo Pro mission update',
                href: '/ciclo-pro',
            };
        case 'blocker_repair':
            return {
                status: 'repair_requested',
                kind: 'request_repair',
                label: 'Request blocker repair',
                href: '/spray-lab?repair=1',
            };
        case 'updated_team_review_packet':
            return {
                status: 'reviewed',
                kind: 'share_packet',
                label: 'Request updated Team Review Packet',
                href: '/mesa-coach/packets',
            };
    }
}

export async function requestTeamCoachNextAction(
    input: RequestTeamCoachNextActionInput,
): Promise<RequestTeamCoachNextActionResult> {
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

    const accessError = await requireCapabilityForShare({
        user,
        loaded,
        capability: 'update_review_status',
    });

    if (accessError) {
        return accessError;
    }

    const nextAction = resolveTargetNextAction(input.target);

    await insertReviewStatusEvent({
        user,
        loaded,
        workspaceId: input.workspaceId,
        shareId: input.shareId,
        nextStatus: nextAction.status,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        requestedNextAction: nextAction.kind,
        requestedLoop: input.target,
    });
    revalidateTeamCoachPaths(input.workspaceId, loaded.share.playerUserId);

    return {
        success: true,
        reviewStatus: nextAction.status,
        requestedNextAction: {
            target: input.target,
            kind: nextAction.kind,
            label: nextAction.label,
            href: nextAction.href,
        },
        auditEvents: [toActionAuditEvent('review_status_updated')],
    };
}
