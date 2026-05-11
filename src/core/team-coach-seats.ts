import type {
    TeamCoachDenialReason,
    TeamCoachInviteStatus,
    TeamCoachMembershipStatus,
    TeamCoachSeatState,
    TeamCoachWorkspaceRole,
} from '@/types/team-coach';

export const TEAM_COACH_SEAT_POLICY = {
    pendingPlayerInvitesReserveSeats: true,
} as const;

export interface TeamCoachSeatPolicy {
    readonly pendingPlayerInvitesReserveSeats: boolean;
}

export interface TeamCoachSeatMembershipSource {
    readonly userId?: string | null;
    readonly role?: TeamCoachWorkspaceRole | null;
    readonly status?: TeamCoachMembershipStatus | 'revoked' | null;
    readonly seatState?: TeamCoachSeatState | null;
}

export interface TeamCoachSeatInviteSource {
    readonly id?: string | null;
    readonly intendedRole?: TeamCoachWorkspaceRole | null;
    readonly status?: TeamCoachInviteStatus | null;
    readonly expiresAt?: Date | string | null;
}

export interface BuildTeamCoachSeatSummaryInput {
    readonly seatLimit: number;
    readonly memberships?: readonly TeamCoachSeatMembershipSource[];
    readonly invites?: readonly TeamCoachSeatInviteSource[];
    readonly now?: Date;
    readonly policy?: Partial<TeamCoachSeatPolicy>;
}

export interface TeamCoachSeatSummary {
    readonly seatLimit: number;
    readonly occupiedSeats: number;
    readonly invitedSeats: number;
    readonly pendingInvites: number;
    readonly activeMembers: number;
    readonly suspendedMembers: number;
    readonly revokedMembers: number;
    readonly availableSeats: number;
    readonly seatPolicy: TeamCoachSeatPolicy;
}

export interface TeamCoachSeatAdmission {
    readonly canAdmit: boolean;
    readonly denialReason: TeamCoachDenialReason | null;
    readonly summary: TeamCoachSeatSummary;
}

export function buildTeamCoachSeatSummary(
    input: BuildTeamCoachSeatSummaryInput,
): TeamCoachSeatSummary {
    const now = cloneDate(input.now ?? new Date());
    const seatLimit = normalizeSeatLimit(input.seatLimit);
    const policy = normalizeSeatPolicy(input.policy);
    const memberships = input.memberships ?? [];
    const invites = input.invites ?? [];

    const activeMembers = memberships.filter((membership) => membership.status === 'active').length;
    const suspendedMembers = memberships.filter((membership) => membership.status === 'suspended').length;
    const revokedMembers = memberships.filter((membership) => (
        membership.status === 'removed' || membership.status === 'revoked'
    )).length;
    const occupiedSeats = memberships.filter((membership) => (
        membership.status === 'active'
        && normalizeSeatState(membership.seatState) === 'occupied'
    )).length;
    const pendingSeatInvites = invites.filter((invite) => isPendingSeatInvite({
        invite,
        now,
        policy,
    }));
    const invitedSeats = pendingSeatInvites.length;
    const pendingInvites = invites.filter((invite) => isPendingInvite(invite, now)).length;

    return {
        seatLimit,
        occupiedSeats,
        invitedSeats,
        pendingInvites,
        activeMembers,
        suspendedMembers,
        revokedMembers,
        availableSeats: Math.max(seatLimit - occupiedSeats - invitedSeats, 0),
        seatPolicy: policy,
    };
}

export function resolveTeamCoachSeatAdmission(
    input: BuildTeamCoachSeatSummaryInput,
): TeamCoachSeatAdmission {
    const summary = buildTeamCoachSeatSummary(input);
    const canAdmit = summary.availableSeats > 0;

    return {
        canAdmit,
        denialReason: canAdmit ? null : 'seat_limit_reached',
        summary,
    };
}

function normalizeSeatLimit(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(Math.trunc(value), 0);
}

function normalizeSeatPolicy(
    policy?: Partial<TeamCoachSeatPolicy>,
): TeamCoachSeatPolicy {
    return {
        pendingPlayerInvitesReserveSeats:
            policy?.pendingPlayerInvitesReserveSeats
            ?? TEAM_COACH_SEAT_POLICY.pendingPlayerInvitesReserveSeats,
    };
}

function normalizeSeatState(value?: TeamCoachSeatState | null): TeamCoachSeatState {
    return value ?? 'occupied';
}

function isPendingSeatInvite(input: {
    readonly invite: TeamCoachSeatInviteSource;
    readonly now: Date;
    readonly policy: TeamCoachSeatPolicy;
}): boolean {
    if (!isPendingInvite(input.invite, input.now)) {
        return false;
    }

    const intendedRole = input.invite.intendedRole ?? 'player';

    return intendedRole === 'player'
        && input.policy.pendingPlayerInvitesReserveSeats;
}

function isPendingInvite(invite: TeamCoachSeatInviteSource, now: Date): boolean {
    if (invite.status !== 'pending') {
        return false;
    }

    const expiresAt = parseOptionalDate(invite.expiresAt);

    return !expiresAt || expiresAt.getTime() > now.getTime();
}

function parseOptionalDate(value?: Date | string | null): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return cloneDate(value);
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}
