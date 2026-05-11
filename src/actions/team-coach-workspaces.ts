'use server';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    teamCoachAuditEvents,
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
    TeamCoachMembershipStatus,
    TeamCoachWorkspaceRole,
    TeamCoachWorkspaceStatus,
} from '@/types/team-coach';
import {
    isTeamCoachMembershipStatus,
    isTeamCoachWorkspaceRole,
} from '@/types/team-coach';

type TeamCoachActionErrorResult = {
    readonly success: false;
    readonly error: string;
    readonly denialReason?: TeamCoachDenialReason;
};

type TeamCoachActionResult<TPayload> =
    | ({ readonly success: true } & TPayload)
    | TeamCoachActionErrorResult;

export interface CreateTeamCoachWorkspaceInput {
    readonly name: string;
    readonly description?: string | null;
    readonly seatLimit?: number | null;
}

export type CreateTeamCoachWorkspaceResult = TeamCoachActionResult<{
    readonly workspaceId: string;
    readonly status: TeamCoachWorkspaceStatus;
    readonly seatLimit: number;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface ArchiveTeamCoachWorkspaceInput {
    readonly workspaceId: string;
}

export type ArchiveTeamCoachWorkspaceResult = TeamCoachActionResult<{
    readonly workspaceId: string;
    readonly status: 'archived';
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface ChangeTeamCoachMemberRoleInput {
    readonly workspaceId: string;
    readonly targetUserId: string;
    readonly role: TeamCoachWorkspaceRole;
}

export type ChangeTeamCoachMemberRoleResult = TeamCoachActionResult<{
    readonly workspaceId: string;
    readonly targetUserId: string;
    readonly role: TeamCoachWorkspaceRole;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
}>;

export interface UpdateTeamCoachMemberStatusInput {
    readonly workspaceId: string;
    readonly targetUserId: string;
    readonly status: TeamCoachMembershipStatus;
}

export type UpdateTeamCoachMemberStatusResult = TeamCoachActionResult<{
    readonly workspaceId: string;
    readonly targetUserId: string;
    readonly status: TeamCoachMembershipStatus;
    readonly auditEvents: readonly TeamCoachActionAuditEvent[];
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

export async function createTeamCoachWorkspace(
    input: CreateTeamCoachWorkspaceInput,
): Promise<CreateTeamCoachWorkspaceResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const name = normalizeRequiredText(input.name);

    if (!name) {
        return actionError('Informe um nome valido para a Mesa do Coach.');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role);

    if (!hasTeamCoachCapability(access, 'create_workspace')) {
        return actionError(
            'Acesso Team necessario para criar uma Mesa do Coach.',
            firstDenial(access.capabilityDenials.create_workspace),
        );
    }

    const now = new Date();
    const seatLimit = normalizeSeatLimit(input.seatLimit);
    const [workspace] = await db
        .insert(teamCoachWorkspaces)
        .values({
            ownerUserId: user.userId,
            name,
            description: normalizeOptionalText(input.description),
            status: 'active',
            seatLimit,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: teamCoachWorkspaces.id,
            status: teamCoachWorkspaces.status,
            seatLimit: teamCoachWorkspaces.seatLimit,
        });

    if (!workspace) {
        return actionError('Nao foi possivel criar a Mesa do Coach.');
    }

    await db
        .insert(teamCoachWorkspaceMemberships)
        .values({
            workspaceId: workspace.id,
            userId: user.userId,
            role: 'owner',
            status: 'active',
            seatState: 'occupied',
            joinedAt: now,
            updatedAt: now,
        });

    await recordTeamCoachAuditEvent({
        workspaceId: workspace.id,
        actorUserId: user.userId,
        eventType: 'workspace_created',
    });

    return {
        success: true,
        workspaceId: workspace.id,
        status: workspace.status,
        seatLimit: workspace.seatLimit,
        auditEvents: [toActionAuditEvent('workspace_created')],
    };
}

export async function archiveTeamCoachWorkspace(
    input: ArchiveTeamCoachWorkspaceInput,
): Promise<ArchiveTeamCoachWorkspaceResult> {
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
        return actionError('Mesa do Coach nao encontrada.', 'no_workspace_membership');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        workspaceRole: loaded.membership.role,
        workspaceStatus: loaded.workspace.status,
        membershipStatus: loaded.membership.status,
    });

    if (!hasTeamCoachCapability(access, 'manage_workspace')) {
        return actionError(
            'Apenas o owner pode arquivar a Mesa do Coach.',
            firstDenial(access.capabilityDenials.manage_workspace),
        );
    }

    const now = new Date();
    await db
        .update(teamCoachWorkspaces)
        .set({
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
        })
        .where(eq(teamCoachWorkspaces.id, workspaceId));

    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        eventType: 'workspace_archived',
    });

    return {
        success: true,
        workspaceId,
        status: 'archived',
        auditEvents: [toActionAuditEvent('workspace_archived')],
    };
}

export async function changeTeamCoachMemberRole(
    input: ChangeTeamCoachMemberRoleInput,
): Promise<ChangeTeamCoachMemberRoleResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);
    const targetUserId = normalizeRequiredText(input.targetUserId);

    if (!workspaceId || !targetUserId || !isTeamCoachWorkspaceRole(input.role) || input.role === 'owner') {
        return actionError('Alteracao de role invalida.');
    }

    const loaded = await loadWorkspaceActorAndTarget(workspaceId, user.userId, targetUserId);

    if (!loaded) {
        return actionError('Membro da Mesa do Coach nao encontrado.', 'no_workspace_membership');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        workspaceRole: loaded.actor.role,
        workspaceStatus: loaded.workspace.status,
        membershipStatus: loaded.actor.status,
    });

    if (!hasTeamCoachCapability(access, 'manage_workspace')) {
        return actionError(
            'Apenas o owner pode alterar roles na Mesa do Coach.',
            firstDenial(access.capabilityDenials.manage_workspace),
        );
    }

    await db
        .update(teamCoachWorkspaceMemberships)
        .set({
            role: input.role,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
                eq(teamCoachWorkspaceMemberships.userId, targetUserId),
            ),
        );

    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId,
        membershipId: loaded.target.id,
        eventType: 'role_changed',
        metadata: {
            previousRole: loaded.target.role,
            nextRole: input.role,
        },
    });

    return {
        success: true,
        workspaceId,
        targetUserId,
        role: input.role,
        auditEvents: [toActionAuditEvent('role_changed')],
    };
}

export async function updateTeamCoachMemberStatus(
    input: UpdateTeamCoachMemberStatusInput,
): Promise<UpdateTeamCoachMemberStatusResult> {
    const user = await requireTeamCoachUser();

    if (!user) {
        return actionError('Nao autenticado.', 'not_authenticated');
    }

    const workspaceId = normalizeRequiredText(input.workspaceId);
    const targetUserId = normalizeRequiredText(input.targetUserId);

    if (!workspaceId || !targetUserId || !isTeamCoachMembershipStatus(input.status)) {
        return actionError('Status de membro invalido.');
    }

    const loaded = await loadWorkspaceActorAndTarget(workspaceId, user.userId, targetUserId);

    if (!loaded) {
        return actionError('Membro da Mesa do Coach nao encontrado.', 'no_workspace_membership');
    }

    const access = await resolveTeamCoachAccessForUser(user.userId, user.role, {
        workspaceRole: loaded.actor.role,
        workspaceStatus: loaded.workspace.status,
        membershipStatus: loaded.actor.status,
    });

    if (!hasTeamCoachCapability(access, 'manage_seats')) {
        return actionError(
            'Apenas owner com assentos Team pode alterar estado de membros.',
            firstDenial(access.capabilityDenials.manage_seats),
        );
    }

    const now = new Date();
    await db
        .update(teamCoachWorkspaceMemberships)
        .set({
            status: input.status,
            seatState: seatStateForMembershipStatus(input.status),
            suspendedAt: input.status === 'suspended' ? now : null,
            revokedAt: input.status === 'removed' ? now : null,
            leftAt: input.status === 'removed' ? now : null,
            updatedAt: now,
        })
        .where(
            and(
                eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
                eq(teamCoachWorkspaceMemberships.userId, targetUserId),
            ),
        );

    await recordTeamCoachAuditEvent({
        workspaceId,
        actorUserId: user.userId,
        targetUserId,
        membershipId: loaded.target.id,
        eventType: 'seat_changed',
        metadata: {
            previousStatus: loaded.target.status,
            nextStatus: input.status,
        },
    });

    return {
        success: true,
        workspaceId,
        targetUserId,
        status: input.status,
        auditEvents: [toActionAuditEvent('seat_changed')],
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
        .where(
            and(
                eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
                eq(teamCoachWorkspaceMemberships.userId, actorUserId),
            ),
        )
        .limit(1);

    if (!membership) {
        return null;
    }

    return { workspace, membership };
}

async function loadWorkspaceActorAndTarget(
    workspaceId: string,
    actorUserId: string,
    targetUserId: string,
): Promise<{
    readonly workspace: WorkspaceRow;
    readonly actor: MembershipRow;
    readonly target: MembershipRow;
} | null> {
    const loaded = await loadWorkspaceAndActorMembership(workspaceId, actorUserId);

    if (!loaded) {
        return null;
    }

    const [target] = await db
        .select({
            id: teamCoachWorkspaceMemberships.id,
            workspaceId: teamCoachWorkspaceMemberships.workspaceId,
            userId: teamCoachWorkspaceMemberships.userId,
            role: teamCoachWorkspaceMemberships.role,
            status: teamCoachWorkspaceMemberships.status,
        })
        .from(teamCoachWorkspaceMemberships)
        .where(
            and(
                eq(teamCoachWorkspaceMemberships.workspaceId, workspaceId),
                eq(teamCoachWorkspaceMemberships.userId, targetUserId),
            ),
        )
        .limit(1);

    if (!target) {
        return null;
    }

    return {
        workspace: loaded.workspace,
        actor: loaded.membership,
        target,
    };
}

async function recordTeamCoachAuditEvent(input: {
    readonly workspaceId: string;
    readonly actorUserId?: string | null;
    readonly targetUserId?: string | null;
    readonly membershipId?: string | null;
    readonly eventType: TeamCoachAuditEventType;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db
        .insert(teamCoachAuditEvents)
        .values({
            workspaceId: input.workspaceId,
            actorUserId: input.actorUserId ?? null,
            targetUserId: input.targetUserId ?? null,
            membershipId: input.membershipId ?? null,
            eventType: input.eventType,
            metadata: input.metadata ?? {},
        });
}

function firstDenial(
    denials?: readonly TeamCoachDenialReason[],
): TeamCoachDenialReason | undefined {
    return denials?.[0];
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

function normalizeRequiredText(value: string): string {
    return value.trim();
}

function normalizeOptionalText(value?: string | null): string | null {
    const normalizedValue = value?.trim();

    return normalizedValue ? normalizedValue : null;
}

function normalizeSeatLimit(value?: number | null): number {
    if (!Number.isFinite(value)) {
        return 8;
    }

    return Math.min(Math.max(Math.trunc(value as number), 1), 100);
}

function seatStateForMembershipStatus(
    status: TeamCoachMembershipStatus,
): 'occupied' | 'reserved' | 'available' | 'blocked' {
    if (status === 'active') {
        return 'occupied';
    }

    if (status === 'invited') {
        return 'reserved';
    }

    if (status === 'suspended') {
        return 'blocked';
    }

    return 'available';
}

function toActionAuditEvent(
    type: TeamCoachAuditEventType,
): TeamCoachActionAuditEvent {
    return {
        type: `team_coach.${type}`,
    };
}
