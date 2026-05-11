'use server';

import { randomBytes } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import {
    buildTeamCoachSeatSummary,
    resolveTeamCoachSeatAdmission,
    type TeamCoachSeatInviteSource,
    type TeamCoachSeatMembershipSource,
    type TeamCoachSeatSummary,
} from '@/core/team-coach-seats';
import { db } from '@/db';
import {
    teamCoachAuditEvents,
    teamCoachSeatLedger,
    teamCoachWorkspaceInvites,
    teamCoachWorkspaceMemberships,
    teamCoachWorkspaces,
} from '@/db/schema';
import {
    hasTeamCoachCapability,
    resolveTeamCoachAccessForUser,
} from '@/lib/team-coach-access';
import type {
    TeamCoachAuditEventType,
    TeamCoachDenialReason,
    TeamCoachInviteStatus,
    TeamCoachMembershipStatus,
    TeamCoachWorkspaceRole,
    TeamCoachWorkspaceStatus,
} from '@/types/team-coach';
import { isTeamCoachWorkspaceRole } from '@/types/team-coach';

const TEAM_COACH_INVITE_WINDOW_DAYS = 7;

type TeamCoachInviteActionErrorResult = {
    readonly success: false;
    readonly error: string;
    readonly denialReason?: TeamCoachDenialReason;
};

type TeamCoachInviteActionResult<TPayload> =
    | ({ readonly success: true } & TPayload)
    | TeamCoachInviteActionErrorResult;

export interface CreateTeamCoachInviteInput {
    readonly workspaceId: string;
    readonly intendedRole: Exclude<TeamCoachWorkspaceRole, 'owner'>;
    readonly invitedUserId?: string | null;
    readonly invitedEmail?: string | null;
    readonly now?: string | Date;
}

export type CreateTeamCoachInviteResult = TeamCoachInviteActionResult<{
    readonly inviteId: string;
    readonly workspaceId: string;
    readonly inviteCode: string;
    readonly expiresAt: Date;
    readonly auditEvents: readonly TeamCoachInviteActionAuditEvent[];
}>;

export interface AcceptTeamCoachInviteInput {
    readonly inviteCode: string;
    readonly now?: string | Date;
}

export type AcceptTeamCoachInviteResult = TeamCoachInviteActionResult<{
    readonly workspaceId: string;
    readonly role: TeamCoachWorkspaceRole;
    readonly auditEvents: readonly TeamCoachInviteActionAuditEvent[];
}>;

export interface RevokeTeamCoachInviteInput {
    readonly workspaceId: string;
    readonly inviteId: string;
}

export type RevokeTeamCoachInviteResult = TeamCoachInviteActionResult<{
    readonly workspaceId: string;
    readonly inviteId: string;
    readonly status: 'revoked';
    readonly auditEvents: readonly TeamCoachInviteActionAuditEvent[];
}>;

export interface ExpireTeamCoachInviteInput {
    readonly inviteId: string;
    readonly now?: string | Date;
}

export type ExpireTeamCoachInviteResult = TeamCoachInviteActionResult<{
    readonly inviteId: string;
    readonly workspaceId: string;
    readonly status: 'expired';
    readonly auditEvents: readonly TeamCoachInviteActionAuditEvent[];
}>;

interface TeamCoachInviteActionAuditEvent {
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

interface MembershipRow extends TeamCoachSeatMembershipSource {
    readonly id?: string | null;
    readonly userId: string;
    readonly role: TeamCoachWorkspaceRole;
    readonly status: TeamCoachMembershipStatus;
}

interface InviteRow extends TeamCoachSeatInviteSource {
    readonly id: string;
    readonly workspaceId: string;
    readonly invitedUserId: string | null;
    readonly intendedRole: TeamCoachWorkspaceRole;
    readonly status: TeamCoachInviteStatus;
    readonly expiresAt: Date;
}

export async function createTeamCoachInvite(
    input: CreateTeamCoachInviteInput,
): Promise<CreateTeamCoachInviteResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);
    const intendedRole = normalizeInviteRole(input.intendedRole);

    if (!workspaceId || !intendedRole) {
        return actionError('Convite Team invalido.');
    }

    const loaded = await loadWorkspaceAndActorMembership(workspaceId, user.userId);

    if (!loaded) {
        return actionError('Mesa do Coach nao encontrada.', 'no_workspace_membership');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        workspaceRole: loaded.membership.role,
        workspaceStatus: loaded.workspace.status,
        membershipStatus: loaded.membership.status,
    });

    if (!hasTeamCoachCapability(access, 'invite_member')) {
        return actionError(
            'Apenas owner da Mesa do Coach pode gerenciar convites e assentos.',
            firstDenial(access.capabilityDenials.invite_member),
        );
    }

    const now = parseDate(input.now) ?? new Date();
    const seatRows = await loadSeatRows(workspaceId);
    const admission = resolveTeamCoachSeatAdmission({
        seatLimit: loaded.workspace.seatLimit,
        memberships: seatRows.memberships,
        invites: seatRows.invites,
        now,
    });

    if (!admission.canAdmit) {
        return actionError(
            'Limite de vagas da Mesa do Coach atingido.',
            admission.denialReason ?? 'seat_limit_reached',
        );
    }

    const inviteCode = generateTeamCoachInviteCode();
    const expiresAt = new Date(now.getTime() + TEAM_COACH_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [invite] = await db
        .insert(teamCoachWorkspaceInvites)
        .values({
            workspaceId,
            createdByUserId: user.userId,
            invitedUserId: normalizeOptionalText(input.invitedUserId),
            invitedEmail: normalizeEmail(input.invitedEmail),
            intendedRole,
            inviteCode,
            status: 'pending',
            expiresAt,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: teamCoachWorkspaceInvites.id,
            workspaceId: teamCoachWorkspaceInvites.workspaceId,
            expiresAt: teamCoachWorkspaceInvites.expiresAt,
        });

    if (!invite) {
        return actionError('Nao foi possivel criar o convite Team.');
    }

    await recordSeatLedger({
        workspaceId,
        actorUserId: user.userId,
        inviteId: invite.id,
        eventType: 'seat_reserved',
        seatState: 'reserved',
        delta: 1,
        summary: {
            ...admission.summary,
            invitedSeats: admission.summary.invitedSeats + (intendedRole === 'player' ? 1 : 0),
            availableSeats: Math.max(admission.summary.availableSeats - 1, 0),
        },
        metadata: { source: 'invite' },
    });
    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId: normalizeOptionalText(input.invitedUserId),
        inviteId: invite.id,
        eventType: 'invite_created',
    });
    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId: normalizeOptionalText(input.invitedUserId),
        inviteId: invite.id,
        eventType: 'seat_changed',
        metadata: { reason: 'invite_reserved' },
    });

    return {
        success: true,
        inviteId: invite.id,
        workspaceId: invite.workspaceId,
        inviteCode,
        expiresAt: invite.expiresAt,
        auditEvents: [
            toActionAuditEvent('invite_created'),
            toActionAuditEvent('seat_changed'),
        ],
    };
}

export async function acceptTeamCoachInvite(
    input: AcceptTeamCoachInviteInput,
): Promise<AcceptTeamCoachInviteResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const inviteCode = normalizeRequiredText(input.inviteCode);

    if (!inviteCode) {
        return actionError('Convite invalido.');
    }

    const now = parseDate(input.now) ?? new Date();
    const invite = await loadInviteByCode(inviteCode);

    if (!invite || invite.status !== 'pending') {
        return actionError('Convite invalido ou revogado.', 'invite_expired');
    }

    if (invite.expiresAt.getTime() <= now.getTime()) {
        return actionError('Convite expirado.', 'invite_expired');
    }

    if (invite.invitedUserId && invite.invitedUserId !== user.userId) {
        return actionError('Este convite pertence a outro jogador.', 'role_blocked');
    }

    const workspace = await loadWorkspace(invite.workspaceId);

    if (!workspace || workspace.status !== 'active') {
        return actionError('Mesa do Coach indisponivel.', 'workspace_inactive');
    }

    const existingMembership = await loadMembership(invite.workspaceId, user.userId);
    const seatRows = await loadSeatRows(invite.workspaceId);
    const invitesExcludingCurrent = seatRows.invites.filter((seatInvite) => seatInvite.id !== invite.id);
    const admission = resolveTeamCoachSeatAdmission({
        seatLimit: workspace.seatLimit,
        memberships: seatRows.memberships,
        invites: invitesExcludingCurrent,
        now,
    });
    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        inviteStatus: invite.status,
        inviteExpiresAt: invite.expiresAt,
        seatState: admission.canAdmit ? 'available' : 'limit_reached',
    });

    if (!hasTeamCoachCapability(access, 'accept_invite')) {
        return actionError(
            'Acesso Team necessario para aceitar este convite.',
            firstDenial(access.capabilityDenials.accept_invite),
        );
    }

    if (!admission.canAdmit) {
        return actionError(
            'Limite de vagas da Mesa do Coach atingido.',
            admission.denialReason ?? 'seat_limit_reached',
        );
    }

    if (existingMembership) {
        await db
            .update(teamCoachWorkspaceMemberships)
            .set({
                role: existingMembership.role === 'owner' ? 'owner' : invite.intendedRole,
                status: 'active',
                seatState: 'occupied',
                joinedAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    eq(teamCoachWorkspaceMemberships.workspaceId, invite.workspaceId),
                    eq(teamCoachWorkspaceMemberships.userId, user.userId),
                ),
            );
    } else {
        await db
            .insert(teamCoachWorkspaceMemberships)
            .values({
                workspaceId: invite.workspaceId,
                userId: user.userId,
                role: invite.intendedRole,
                status: 'active',
                seatState: 'occupied',
                joinedAt: now,
                updatedAt: now,
            })
            .returning({
                id: teamCoachWorkspaceMemberships.id,
            });
    }

    await db
        .update(teamCoachWorkspaceInvites)
        .set({
            status: 'accepted',
            acceptedByUserId: user.userId,
            acceptedAt: now,
            updatedAt: now,
        })
        .where(eq(teamCoachWorkspaceInvites.id, invite.id));

    await recordSeatLedger({
        workspaceId: invite.workspaceId,
        actorUserId: user.userId,
        targetUserId: user.userId,
        inviteId: invite.id,
        membershipId: existingMembership?.id ?? null,
        eventType: 'seat_occupied',
        seatState: 'occupied',
        delta: 1,
        summary: {
            ...admission.summary,
            occupiedSeats: admission.summary.occupiedSeats + 1,
        },
        metadata: { source: 'membership' },
    });
    await recordTeamCoachAuditEvent({
        workspaceId: invite.workspaceId,
        actorUserId: user.userId,
        targetUserId: user.userId,
        inviteId: invite.id,
        eventType: 'invite_accepted',
    });
    await recordTeamCoachAuditEvent({
        workspaceId: invite.workspaceId,
        actorUserId: user.userId,
        targetUserId: user.userId,
        inviteId: invite.id,
        eventType: 'seat_changed',
        metadata: { reason: 'invite_accepted' },
    });

    return {
        success: true,
        workspaceId: invite.workspaceId,
        role: invite.intendedRole,
        auditEvents: [
            toActionAuditEvent('invite_accepted'),
            toActionAuditEvent('seat_changed'),
        ],
    };
}

export async function revokeTeamCoachInvite(
    input: RevokeTeamCoachInviteInput,
): Promise<RevokeTeamCoachInviteResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);
    const inviteId = normalizeRequiredText(input.inviteId);

    if (!workspaceId || !inviteId) {
        return actionError('Convite invalido.');
    }

    const invite = await loadInviteById(inviteId);
    const loaded = await loadWorkspaceAndActorMembership(workspaceId, user.userId);

    if (!invite || !loaded || invite.workspaceId !== workspaceId) {
        return actionError('Convite Team nao encontrado.');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        workspaceRole: loaded.membership.role,
        workspaceStatus: loaded.workspace.status,
        membershipStatus: loaded.membership.status,
    });

    if (!hasTeamCoachCapability(access, 'manage_workspace')) {
        return actionError(
            'Apenas owner pode revogar convites da Mesa do Coach.',
            firstDenial(access.capabilityDenials.manage_workspace),
        );
    }

    const now = new Date();
    await db
        .update(teamCoachWorkspaceInvites)
        .set({
            status: 'revoked',
            revokedByUserId: user.userId,
            revokedAt: now,
            updatedAt: now,
        })
        .where(eq(teamCoachWorkspaceInvites.id, inviteId));

    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId: invite.invitedUserId,
        inviteId,
        eventType: 'invite_revoked',
    });

    return {
        success: true,
        workspaceId,
        inviteId,
        status: 'revoked',
        auditEvents: [toActionAuditEvent('invite_revoked')],
    };
}

export async function expireTeamCoachInvite(
    input: ExpireTeamCoachInviteInput,
): Promise<ExpireTeamCoachInviteResult> {
    const inviteId = normalizeRequiredText(input.inviteId);

    if (!inviteId) {
        return actionError('Convite invalido.');
    }

    const invite = await loadInviteById(inviteId);

    if (!invite) {
        return actionError('Convite Team nao encontrado.');
    }

    const now = parseDate(input.now) ?? new Date();
    await db
        .update(teamCoachWorkspaceInvites)
        .set({
            status: 'expired',
            updatedAt: now,
        })
        .where(eq(teamCoachWorkspaceInvites.id, inviteId));

    await recordTeamCoachAuditEvent({
        workspaceId: invite.workspaceId,
        targetUserId: invite.invitedUserId,
        inviteId,
        eventType: 'invite_expired',
    });

    return {
        success: true,
        inviteId,
        workspaceId: invite.workspaceId,
        status: 'expired',
        auditEvents: [toActionAuditEvent('invite_expired')],
    };
}

async function requireTeamCoachUser(): Promise<AuthenticatedTeamCoachUser | null> {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return null;
    }

    return {
        userId,
        role: session.user.role === 'admin' ? 'admin' : 'user',
    };
}

async function loadWorkspace(
    workspaceId: string,
): Promise<WorkspaceRow | null> {
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

    return workspace ?? null;
}

async function loadMembership(
    workspaceId: string,
    userId: string,
): Promise<MembershipRow | null> {
    const [membership] = await db
        .select({
            id: teamCoachWorkspaceMemberships.id,
            workspaceId: teamCoachWorkspaceMemberships.workspaceId,
            userId: teamCoachWorkspaceMemberships.userId,
            role: teamCoachWorkspaceMemberships.role,
            status: teamCoachWorkspaceMemberships.status,
            seatState: teamCoachWorkspaceMemberships.seatState,
        })
        .from(teamCoachWorkspaceMemberships)
        .where(
            and(
                eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
                eq(teamCoachWorkspaceMemberships.userId, userId),
            ),
        )
        .limit(1);

    return membership ?? null;
}

async function loadWorkspaceAndActorMembership(
    workspaceId: string,
    actorUserId: string,
): Promise<{ readonly workspace: WorkspaceRow; readonly membership: MembershipRow } | null> {
    const workspace = await loadWorkspace(workspaceId);

    if (!workspace) {
        return null;
    }

    const membership = await loadMembership(workspaceId, actorUserId);

    if (!membership) {
        return null;
    }

    return { workspace, membership };
}

async function loadInviteByCode(inviteCode: string): Promise<InviteRow | null> {
    const [invite] = await db
        .select({
            id: teamCoachWorkspaceInvites.id,
            workspaceId: teamCoachWorkspaceInvites.workspaceId,
            invitedUserId: teamCoachWorkspaceInvites.invitedUserId,
            intendedRole: teamCoachWorkspaceInvites.intendedRole,
            status: teamCoachWorkspaceInvites.status,
            expiresAt: teamCoachWorkspaceInvites.expiresAt,
        })
        .from(teamCoachWorkspaceInvites)
        .where(eq(teamCoachWorkspaceInvites.inviteCode, inviteCode))
        .limit(1);

    return invite ?? null;
}

async function loadInviteById(inviteId: string): Promise<InviteRow | null> {
    const [invite] = await db
        .select({
            id: teamCoachWorkspaceInvites.id,
            workspaceId: teamCoachWorkspaceInvites.workspaceId,
            invitedUserId: teamCoachWorkspaceInvites.invitedUserId,
            intendedRole: teamCoachWorkspaceInvites.intendedRole,
            status: teamCoachWorkspaceInvites.status,
            expiresAt: teamCoachWorkspaceInvites.expiresAt,
        })
        .from(teamCoachWorkspaceInvites)
        .where(eq(teamCoachWorkspaceInvites.id, inviteId))
        .limit(1);

    return invite ?? null;
}

async function loadSeatRows(workspaceId: string): Promise<{
    readonly memberships: readonly MembershipRow[];
    readonly invites: readonly InviteRow[];
}> {
    const memberships = await db
        .select({
            id: teamCoachWorkspaceMemberships.id,
            userId: teamCoachWorkspaceMemberships.userId,
            role: teamCoachWorkspaceMemberships.role,
            status: teamCoachWorkspaceMemberships.status,
            seatState: teamCoachWorkspaceMemberships.seatState,
        })
        .from(teamCoachWorkspaceMemberships)
        .where(eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId))
        .limit(1000) as MembershipRow[];
    const invites = await db
        .select({
            id: teamCoachWorkspaceInvites.id,
            workspaceId: teamCoachWorkspaceInvites.workspaceId,
            invitedUserId: teamCoachWorkspaceInvites.invitedUserId,
            intendedRole: teamCoachWorkspaceInvites.intendedRole,
            status: teamCoachWorkspaceInvites.status,
            expiresAt: teamCoachWorkspaceInvites.expiresAt,
        })
        .from(teamCoachWorkspaceInvites)
        .where(eq(teamCoachWorkspaceInvites.workspaceId, workspaceId))
        .limit(1000) as InviteRow[];

    return {
        memberships,
        invites,
    };
}

async function recordSeatLedger(input: {
    readonly workspaceId: string;
    readonly actorUserId?: string | null;
    readonly targetUserId?: string | null;
    readonly inviteId?: string | null;
    readonly membershipId?: string | null;
    readonly eventType: 'seat_reserved' | 'seat_occupied' | 'seat_released';
    readonly seatState: 'reserved' | 'occupied' | 'available';
    readonly delta: number;
    readonly summary: TeamCoachSeatSummary;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db
        .insert(teamCoachSeatLedger)
        .values({
            workspaceId: input.workspaceId,
            actorUserId: input.actorUserId ?? null,
            targetUserId: input.targetUserId ?? null,
            inviteId: input.inviteId ?? null,
            membershipId: input.membershipId ?? null,
            eventType: input.eventType,
            seatState: input.seatState,
            delta: input.delta,
            seatLimit: input.summary.seatLimit,
            occupiedSeats: input.summary.occupiedSeats,
            invitedSeats: input.summary.invitedSeats,
            metadata: input.metadata ?? {},
        });
}

async function recordTeamCoachAuditEvent(input: {
    readonly workspaceId: string;
    readonly actorUserId?: string | null;
    readonly targetUserId?: string | null;
    readonly inviteId?: string | null;
    readonly eventType: TeamCoachAuditEventType;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db
        .insert(teamCoachAuditEvents)
        .values({
            workspaceId: input.workspaceId,
            actorUserId: input.actorUserId ?? null,
            targetUserId: input.targetUserId ?? null,
            inviteId: input.inviteId ?? null,
            eventType: input.eventType,
            metadata: input.metadata ?? {},
        });
}

function generateTeamCoachInviteCode(): string {
    return randomBytes(32).toString('base64url');
}

function normalizeInviteRole(
    value: TeamCoachWorkspaceRole,
): Exclude<TeamCoachWorkspaceRole, 'owner'> | null {
    if (!isTeamCoachWorkspaceRole(value) || value === 'owner') {
        return null;
    }

    return value;
}

function firstDenial(
    denials?: readonly TeamCoachDenialReason[],
): TeamCoachDenialReason | undefined {
    return denials?.[0];
}

function actionError(
    error: string,
    denialReason?: TeamCoachDenialReason,
): TeamCoachInviteActionErrorResult {
    return {
        success: false,
        error,
        ...(denialReason ? { denialReason } : {}),
    };
}

function normalizeRequiredText(value: string): string {
    return value.trim();
}

function normalizeOptionalText(value?: string | null): string | null {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
}

function normalizeEmail(value?: string | null): string | null {
    const normalizedValue = value?.trim().toLowerCase();

    return normalizedValue ? normalizedValue : null;
}

function parseDate(value?: string | Date): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function toActionAuditEvent(
    type: TeamCoachAuditEventType,
): TeamCoachInviteActionAuditEvent {
    return {
        type: `team_coach.${type}`,
    };
}
