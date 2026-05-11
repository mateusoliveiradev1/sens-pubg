'use server';

import { and, desc, eq } from 'drizzle-orm';

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
    createTeamCoachCockpitViewModel,
    type TeamCoachCockpitShareInput,
} from '@/core/team-coach-cockpit';
import { buildTeamCoachPlayerDossierViewModel } from '@/core/team-coach-player-dossier';
import {
    hasTeamCoachCapability,
    resolveTeamCoachAccessForUser,
    type TeamCoachCapability,
} from '@/lib/team-coach-access';
import {
    isTeamCoachConsentStatus,
    isTeamCoachShareStatus,
    type TeamCoachConsentStatus,
    type TeamCoachConsentScope,
    type TeamCoachDenialReason,
    type TeamCoachMembershipStatus,
    type TeamCoachShareStatus,
    type TeamCoachWorkspaceRole,
    type TeamCoachWorkspaceStatus,
} from '@/types/team-coach';

type TeamCoachLoaderErrorResult = {
    readonly success: false;
    readonly error: string;
    readonly denialReason?: TeamCoachDenialReason;
};

type TeamCoachLoaderResult<TPayload> =
    | ({ readonly success: true } & TPayload)
    | TeamCoachLoaderErrorResult;

export interface GetTeamCoachCockpitInput {
    readonly workspaceId: string;
}

export interface GetTeamCoachPlayerDossierInput {
    readonly workspaceId: string;
    readonly playerUserId?: string;
    readonly shareId?: string;
}

export type GetTeamCoachCockpitResult = TeamCoachLoaderResult<{
    readonly cockpit: ReturnType<typeof createTeamCoachCockpitViewModel>;
}>;

export type GetTeamCoachPlayerDossierResult = TeamCoachLoaderResult<{
    readonly dossier: ReturnType<typeof buildTeamCoachPlayerDossierViewModel>;
}>;

interface AuthenticatedTeamCoachUser {
    readonly userId: string;
    readonly role: 'anonymous' | 'user' | 'admin';
}

interface WorkspaceRow {
    readonly id: string;
    readonly ownerUserId: string;
    readonly name: string;
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

interface ShareRow extends TeamCoachCockpitShareInput {
    readonly workspaceId: string;
    readonly playerUserId: string;
    readonly consentStatus: TeamCoachConsentStatus | string;
    readonly consentScopes: readonly TeamCoachConsentScope[];
    readonly shareStatus: TeamCoachShareStatus | string;
}

function actionError(
    error: string,
    denialReason?: TeamCoachDenialReason,
): TeamCoachLoaderErrorResult {
    return {
        success: false,
        error,
        ...(denialReason ? { denialReason } : {}),
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

function firstDenial(denials?: readonly TeamCoachDenialReason[]): TeamCoachDenialReason | undefined {
    return denials?.[0];
}

function normalizeConsentStatus(value: string): TeamCoachConsentStatus | null {
    return isTeamCoachConsentStatus(value) ? value : null;
}

function normalizeShareStatus(value: string): TeamCoachShareStatus | null {
    return isTeamCoachShareStatus(value) ? value : null;
}

async function loadWorkspaceAndMembership(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
}): Promise<{
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
} | null> {
    const [workspace] = await db
        .select({
            id: teamCoachWorkspaces.id,
            ownerUserId: teamCoachWorkspaces.ownerUserId,
            name: teamCoachWorkspaces.name,
            status: teamCoachWorkspaces.status,
            seatLimit: teamCoachWorkspaces.seatLimit,
        })
        .from(teamCoachWorkspaces)
        .where(eq(teamCoachWorkspaces.id, input.workspaceId))
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
            eq(teamCoachWorkspaceMemberships.workspaceId, input.workspaceId),
            eq(teamCoachWorkspaceMemberships.userId, input.actorUserId),
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

async function requireCapability(input: {
    readonly user: AuthenticatedTeamCoachUser;
    readonly workspace: WorkspaceRow;
    readonly membership: MembershipRow;
    readonly capability: TeamCoachCapability;
    readonly share?: ShareRow | null;
}): Promise<TeamCoachLoaderErrorResult | null> {
    const policy = await resolveTeamCoachAccessForUser(input.user.userId, input.user.role, {
        workspaceRole: input.membership.role,
        workspaceStatus: input.workspace.status,
        membershipStatus: input.membership.status,
        ...(input.share ? {
            consentStatus: normalizeConsentStatus(input.share.consentStatus),
            consentScopes: input.share.consentScopes,
            requiredConsentScopes: ['analysis_summary', 'review_packet'],
            shareStatus: normalizeShareStatus(input.share.shareStatus),
        } : {}),
    });

    if (hasTeamCoachCapability(policy, input.capability)) {
        return null;
    }

    return actionError(
        'Acesso da Mesa do Coach negado para esta consulta.',
        firstDenial(policy.capabilityDenials[input.capability]),
    );
}

async function loadWorkspaceShares(workspaceId: string): Promise<readonly ShareRow[]> {
    const rows = await db
        .select({
            id: teamCoachReportShares.id,
            workspaceId: teamCoachReportShares.workspaceId,
            playerUserId: teamCoachReportShares.playerUserId,
            consentStatus: teamCoachReportShares.consentStatus,
            consentScopes: teamCoachReportShares.consentScopes,
            shareStatus: teamCoachReportShares.shareStatus,
            teamSafeSnapshot: teamCoachReportShares.teamSafeSnapshot,
            createdAt: teamCoachReportShares.createdAt,
            updatedAt: teamCoachReportShares.updatedAt,
            revokedAt: teamCoachReportShares.revokedAt,
        })
        .from(teamCoachReportShares)
        .where(eq(teamCoachReportShares.workspaceId, workspaceId))
        .orderBy(desc(teamCoachReportShares.updatedAt));

    return rows as ShareRow[];
}

async function loadPlayerShares(input: {
    readonly workspaceId: string;
    readonly playerUserId?: string;
    readonly shareId?: string;
}): Promise<readonly ShareRow[]> {
    const where = input.shareId
        ? and(
            eq(teamCoachReportShares.workspaceId, input.workspaceId),
            eq(teamCoachReportShares.id, input.shareId),
        )
        : and(
            eq(teamCoachReportShares.workspaceId, input.workspaceId),
            eq(teamCoachReportShares.playerUserId, input.playerUserId ?? ''),
        );
    const rows = await db
        .select({
            id: teamCoachReportShares.id,
            workspaceId: teamCoachReportShares.workspaceId,
            playerUserId: teamCoachReportShares.playerUserId,
            consentStatus: teamCoachReportShares.consentStatus,
            consentScopes: teamCoachReportShares.consentScopes,
            shareStatus: teamCoachReportShares.shareStatus,
            teamSafeSnapshot: teamCoachReportShares.teamSafeSnapshot,
            createdAt: teamCoachReportShares.createdAt,
            updatedAt: teamCoachReportShares.updatedAt,
            revokedAt: teamCoachReportShares.revokedAt,
        })
        .from(teamCoachReportShares)
        .where(where)
        .orderBy(desc(teamCoachReportShares.updatedAt));

    return rows as ShareRow[];
}

async function loadStatusEvents(workspaceId: string): Promise<readonly Record<string, unknown>[]> {
    return db
        .select({
            id: teamCoachReviewStatusEvents.id,
            shareId: teamCoachReviewStatusEvents.shareId,
            actorUserId: teamCoachReviewStatusEvents.actorUserId,
            playerUserId: teamCoachReviewStatusEvents.playerUserId,
            previousStatus: teamCoachReviewStatusEvents.previousStatus,
            nextStatus: teamCoachReviewStatusEvents.nextStatus,
            reason: teamCoachReviewStatusEvents.reason,
            payload: teamCoachReviewStatusEvents.payload,
            createdAt: teamCoachReviewStatusEvents.createdAt,
        })
        .from(teamCoachReviewStatusEvents)
        .where(eq(teamCoachReviewStatusEvents.workspaceId, workspaceId))
        .orderBy(desc(teamCoachReviewStatusEvents.createdAt));
}

async function loadNotesForPlayer(input: {
    readonly workspaceId: string;
    readonly playerUserId: string;
}): Promise<readonly Record<string, unknown>[]> {
    return db
        .select({
            id: teamCoachReviewNotes.id,
            shareId: teamCoachReviewNotes.shareId,
            authorUserId: teamCoachReviewNotes.authorUserId,
            playerUserId: teamCoachReviewNotes.playerUserId,
            note: teamCoachReviewNotes.note,
            requestedNextAction: teamCoachReviewNotes.requestedNextAction,
            createdAt: teamCoachReviewNotes.createdAt,
        })
        .from(teamCoachReviewNotes)
        .where(and(
            eq(teamCoachReviewNotes.workspaceId, input.workspaceId),
            eq(teamCoachReviewNotes.playerUserId, input.playerUserId),
        ))
        .orderBy(desc(teamCoachReviewNotes.createdAt));
}

async function loadAuditForPlayer(input: {
    readonly workspaceId: string;
    readonly playerUserId: string;
}): Promise<readonly Record<string, unknown>[]> {
    return db
        .select({
            eventType: teamCoachAuditEvents.eventType,
            actorUserId: teamCoachAuditEvents.actorUserId,
            targetUserId: teamCoachAuditEvents.targetUserId,
            workspaceId: teamCoachAuditEvents.workspaceId,
            shareId: teamCoachAuditEvents.shareId,
            reasonCode: teamCoachAuditEvents.reasonCode,
            createdAt: teamCoachAuditEvents.createdAt,
        })
        .from(teamCoachAuditEvents)
        .where(and(
            eq(teamCoachAuditEvents.workspaceId, input.workspaceId),
            eq(teamCoachAuditEvents.targetUserId, input.playerUserId),
        ))
        .orderBy(desc(teamCoachAuditEvents.createdAt));
}

function latestStatusByShare(rows: readonly Record<string, unknown>[]): Map<string, Record<string, unknown>> {
    const map = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
        const shareId = typeof row.shareId === 'string' ? row.shareId : null;

        if (shareId && !map.has(shareId)) {
            map.set(shareId, row);
        }
    }

    return map;
}

function decorateSharesWithStatus(
    shares: readonly ShareRow[],
    statusEvents: readonly Record<string, unknown>[],
): readonly TeamCoachCockpitShareInput[] {
    const latest = latestStatusByShare(statusEvents);

    return shares.map((share) => {
        const status = latest.get(share.id);
        const payload = typeof status?.payload === 'object' && status.payload !== null
            ? status.payload as Record<string, unknown>
            : {};

        return {
            ...share,
            ...(typeof status?.nextStatus === 'string'
                ? { reviewStatus: status.nextStatus }
                : share.reviewStatus
                    ? { reviewStatus: share.reviewStatus }
                    : {}),
            ...(typeof payload.requestedNextAction === 'string'
                ? { requestedNextAction: payload.requestedNextAction }
                : share.requestedNextAction
                    ? { requestedNextAction: share.requestedNextAction }
                    : {}),
        };
    });
}

function playersFromShares(shares: readonly ShareRow[]): Array<{ readonly id: string; readonly displayName: string; readonly membershipStatus: 'active' }> {
    const seen = new Set<string>();
    const players: Array<{ readonly id: string; readonly displayName: string; readonly membershipStatus: 'active' }> = [];

    for (const share of shares) {
        if (seen.has(share.playerUserId)) {
            continue;
        }

        seen.add(share.playerUserId);
        const snapshot = typeof share.teamSafeSnapshot === 'object' && share.teamSafeSnapshot !== null
            ? share.teamSafeSnapshot as Record<string, unknown>
            : {};
        const sourceSummary = typeof snapshot.sourceSummary === 'object' && snapshot.sourceSummary !== null
            ? snapshot.sourceSummary as Record<string, unknown>
            : {};
        const displayName = typeof sourceSummary.playerLabel === 'string'
            ? sourceSummary.playerLabel
            : share.playerUserId;

        players.push({
            id: share.playerUserId,
            displayName,
            membershipStatus: 'active',
        });
    }

    return players;
}

export async function getTeamCoachCockpit(
    input: GetTeamCoachCockpitInput,
): Promise<GetTeamCoachCockpitResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadWorkspaceAndMembership({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Workspace da Mesa do Coach nao encontrado.', 'no_workspace_membership');
    }

    const accessError = await requireCapability({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'review_roster',
    });

    if (accessError) {
        return accessError;
    }

    const shares = await loadWorkspaceShares(input.workspaceId);
    const statusEvents = await loadStatusEvents(input.workspaceId);
    const decoratedShares = decorateSharesWithStatus(shares, statusEvents);

    return {
        success: true,
        cockpit: createTeamCoachCockpitViewModel({
            workspace: {
                id: loaded.workspace.id,
                name: loaded.workspace.name,
            },
            players: playersFromShares(shares),
            shares: decoratedShares,
        }),
    };
}

export async function getTeamCoachPlayerDossier(
    input: GetTeamCoachPlayerDossierInput,
): Promise<GetTeamCoachPlayerDossierResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const loaded = await loadWorkspaceAndMembership({
        workspaceId: input.workspaceId,
        actorUserId: user.userId,
    });

    if (!loaded) {
        return actionError('Workspace da Mesa do Coach nao encontrado.', 'no_workspace_membership');
    }

    const shares = await loadPlayerShares({
        workspaceId: input.workspaceId,
        ...(input.playerUserId ? { playerUserId: input.playerUserId } : {}),
        ...(input.shareId ? { shareId: input.shareId } : {}),
    });
    const firstShare = shares[0];

    if (!firstShare) {
        return actionError('Compartilhamento nao encontrado.', 'source_not_shared');
    }

    const accessError = await requireCapability({
        user,
        workspace: loaded.workspace,
        membership: loaded.membership,
        capability: 'open_player_dossier',
        share: firstShare,
    });

    if (accessError) {
        return accessError;
    }

    const playerUserId = input.playerUserId ?? firstShare.playerUserId;
    const notes = await loadNotesForPlayer({
        workspaceId: input.workspaceId,
        playerUserId,
    });
    const statusEvents = await loadStatusEvents(input.workspaceId);
    const auditEvents = await loadAuditForPlayer({
        workspaceId: input.workspaceId,
        playerUserId,
    });
    const dossierShares: Record<string, unknown>[] = decorateSharesWithStatus(shares, statusEvents)
        .map((share) => ({ ...share }));

    return {
        success: true,
        dossier: buildTeamCoachPlayerDossierViewModel({
            workspace: {
                id: loaded.workspace.id,
                name: loaded.workspace.name,
            },
            player: {
                id: playerUserId,
                displayName: playerUserId,
            },
            shares: dossierShares,
            reviewNotes: notes,
            reviewStatusEvents: statusEvents,
            auditEvents,
        }),
    };
}
