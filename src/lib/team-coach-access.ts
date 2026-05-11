import {
    hasProductEntitlement,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';
import type {
    TeamCoachConsentScope,
    TeamCoachConsentStatus,
    TeamCoachDenialReason,
    TeamCoachInviteStatus,
    TeamCoachMembershipStatus,
    TeamCoachPacketStatus,
    TeamCoachSeatState,
    TeamCoachShareStatus,
    TeamCoachWorkspaceRole,
    TeamCoachWorkspaceStatus,
} from '@/types/team-coach';
import type { ProductEntitlementKey } from '@/types/monetization';

export type TeamCoachUserRole = 'anonymous' | 'user' | 'admin';

export type TeamCoachCapability =
    | 'read_locked_preview'
    | 'create_workspace'
    | 'manage_workspace'
    | 'invite_member'
    | 'accept_invite'
    | 'review_roster'
    | 'open_player_dossier'
    | 'create_share'
    | 'revoke_share'
    | 'write_coach_note'
    | 'update_review_status'
    | 'create_review_packet'
    | 'edit_review_packet'
    | 'manage_packet_links'
    | 'manage_seats'
    | 'moderate_unsafe_packets';

export interface TeamCoachAccessContext {
    readonly workspaceRole?: TeamCoachWorkspaceRole | null;
    readonly workspaceStatus?: TeamCoachWorkspaceStatus | null;
    readonly membershipStatus?: TeamCoachMembershipStatus | null;
    readonly inviteStatus?: TeamCoachInviteStatus | null;
    readonly inviteExpiresAt?: Date | null;
    readonly consentStatus?: TeamCoachConsentStatus | null;
    readonly consentScopes?: readonly TeamCoachConsentScope[];
    readonly requiredConsentScopes?: readonly TeamCoachConsentScope[];
    readonly shareStatus?: TeamCoachShareStatus | null;
    readonly packetStatus?: TeamCoachPacketStatus | null;
    readonly seatState?: TeamCoachSeatState | null;
    readonly now?: Date;
}

export interface TeamCoachAccessPolicy {
    readonly productAccess: ProductAccessResolution;
    readonly userRole: TeamCoachUserRole;
    readonly context: TeamCoachAccessContext;
    readonly canReadLockedPreview: boolean;
    readonly canCreateWorkspace: boolean;
    readonly canManageWorkspace: boolean;
    readonly canInviteMember: boolean;
    readonly canAcceptInvite: boolean;
    readonly canReviewRoster: boolean;
    readonly canOpenPlayerDossier: boolean;
    readonly canCreateShare: boolean;
    readonly canRevokeShare: boolean;
    readonly canWriteCoachNote: boolean;
    readonly canUpdateReviewStatus: boolean;
    readonly canCreateReviewPacket: boolean;
    readonly canEditReviewPacket: boolean;
    readonly canManagePacketLinks: boolean;
    readonly canManageSeats: boolean;
    readonly canModerateUnsafePackets: boolean;
    readonly denialReasons: readonly TeamCoachDenialReason[];
    readonly capabilityDenials: Readonly<Record<TeamCoachCapability, readonly TeamCoachDenialReason[]>>;
    readonly capabilities: Readonly<Record<TeamCoachCapability, boolean>>;
}

const TEAM_PLAYER_REVIEW_FEATURE: ProductEntitlementKey = 'team.player_review';
const TEAM_SEATS_FEATURE: ProductEntitlementKey = 'team.seats';

const workspaceReviewRoles = new Set<TeamCoachWorkspaceRole>(['owner', 'coach', 'analyst']);
const workspaceManageRoles = new Set<TeamCoachWorkspaceRole>(['owner']);
const workspaceCoachWriteRoles = new Set<TeamCoachWorkspaceRole>(['owner', 'coach', 'analyst']);

function uniq(values: readonly TeamCoachDenialReason[]): readonly TeamCoachDenialReason[] {
    return Array.from(new Set(values));
}

function isExpired(expiresAt: Date | null | undefined, now: Date): boolean {
    return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

function hasRequiredConsent(context: TeamCoachAccessContext): boolean {
    const requiredScopes = context.requiredConsentScopes ?? [];
    if (requiredScopes.length === 0) {
        return context.consentStatus === 'granted';
    }

    const grantedScopes = new Set(context.consentScopes ?? []);

    return context.consentStatus === 'granted'
        && requiredScopes.every((scope) => grantedScopes.has(scope));
}

function sharedSourceIsActive(context: TeamCoachAccessContext): boolean {
    return context.shareStatus === undefined
        || context.shareStatus === null
        || context.shareStatus === 'active';
}

function baseTeamDenials(args: {
    readonly productAccess: ProductAccessResolution;
    readonly userRole: TeamCoachUserRole;
    readonly context: TeamCoachAccessContext;
    readonly requiresSeats?: boolean;
    readonly requiresMembership?: boolean;
    readonly allowedRoles?: ReadonlySet<TeamCoachWorkspaceRole>;
    readonly requiresConsent?: boolean;
    readonly requiresSharedSource?: boolean;
    readonly requiresActiveInvite?: boolean;
}): readonly TeamCoachDenialReason[] {
    const denials: TeamCoachDenialReason[] = [];
    const now = args.context.now ?? new Date();
    const hasPlayerReview = hasProductEntitlement(args.productAccess, TEAM_PLAYER_REVIEW_FEATURE);
    const hasSeats = hasProductEntitlement(args.productAccess, TEAM_SEATS_FEATURE);

    if (!hasPlayerReview) {
        denials.push('team_entitlement_missing');
    }

    if (args.requiresSeats === true && !hasSeats) {
        denials.push('team_entitlement_missing');
    }

    if (args.userRole === 'anonymous') {
        denials.push('not_authenticated');
    }

    if (args.requiresMembership === true) {
        if (args.context.workspaceStatus !== 'active') {
            denials.push('workspace_inactive');
        }

        if (args.context.membershipStatus !== 'active') {
            denials.push('no_workspace_membership');
        }
    }

    if (args.allowedRoles && (!args.context.workspaceRole || !args.allowedRoles.has(args.context.workspaceRole))) {
        denials.push('role_blocked');
    }

    if (args.requiresConsent === true && !hasRequiredConsent(args.context)) {
        denials.push('consent_missing');
    }

    if (args.requiresSharedSource === true) {
        if (args.context.shareStatus === 'revoked') {
            denials.push('report_revoked');
        } else if (!sharedSourceIsActive(args.context)) {
            denials.push('source_not_shared');
        }
    }

    if (args.requiresActiveInvite === true) {
        if (args.context.inviteStatus !== 'pending' || isExpired(args.context.inviteExpiresAt, now)) {
            denials.push('invite_expired');
        }

        if (args.context.seatState === 'limit_reached' || args.context.seatState === 'blocked') {
            denials.push('seat_limit_reached');
        }
    }

    return uniq(denials);
}

function granted(denials: readonly TeamCoachDenialReason[]): boolean {
    return denials.length === 0;
}

export function createTeamCoachAccessPolicy(input: {
    readonly productAccess: ProductAccessResolution;
    readonly userRole?: TeamCoachUserRole;
    readonly context?: TeamCoachAccessContext | undefined;
}): TeamCoachAccessPolicy {
    const userRole = input.userRole ?? (input.productAccess.userId ? 'user' : 'anonymous');
    const context = input.context ?? {};
    const capabilityDenials: Record<TeamCoachCapability, readonly TeamCoachDenialReason[]> = {
        read_locked_preview: [],
        create_workspace: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
        }),
        manage_workspace: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceManageRoles,
        }),
        invite_member: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceManageRoles,
        }),
        accept_invite: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresActiveInvite: true,
        }),
        review_roster: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceReviewRoles,
        }),
        open_player_dossier: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceReviewRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        create_share: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
        }),
        revoke_share: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
        }),
        write_coach_note: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        update_review_status: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        create_review_packet: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        edit_review_packet: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        manage_packet_links: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresMembership: true,
            allowedRoles: workspaceCoachWriteRoles,
            requiresConsent: true,
            requiresSharedSource: true,
        }),
        manage_seats: baseTeamDenials({
            productAccess: input.productAccess,
            userRole,
            context,
            requiresSeats: true,
            requiresMembership: true,
            allowedRoles: workspaceManageRoles,
        }),
        moderate_unsafe_packets: userRole === 'admin' ? [] : ['role_blocked'],
    };

    const capabilities: Record<TeamCoachCapability, boolean> = Object.fromEntries(
        Object.entries(capabilityDenials).map(([capability, denials]) => [
            capability,
            granted(denials),
        ]),
    ) as Record<TeamCoachCapability, boolean>;

    return {
        productAccess: input.productAccess,
        userRole,
        context,
        canReadLockedPreview: capabilities.read_locked_preview,
        canCreateWorkspace: capabilities.create_workspace,
        canManageWorkspace: capabilities.manage_workspace,
        canInviteMember: capabilities.invite_member,
        canAcceptInvite: capabilities.accept_invite,
        canReviewRoster: capabilities.review_roster,
        canOpenPlayerDossier: capabilities.open_player_dossier,
        canCreateShare: capabilities.create_share,
        canRevokeShare: capabilities.revoke_share,
        canWriteCoachNote: capabilities.write_coach_note,
        canUpdateReviewStatus: capabilities.update_review_status,
        canCreateReviewPacket: capabilities.create_review_packet,
        canEditReviewPacket: capabilities.edit_review_packet,
        canManagePacketLinks: capabilities.manage_packet_links,
        canManageSeats: capabilities.manage_seats,
        canModerateUnsafePackets: capabilities.moderate_unsafe_packets,
        denialReasons: uniq(Object.values(capabilityDenials).flat()),
        capabilityDenials,
        capabilities,
    };
}

export async function resolveTeamCoachAccessForUser(
    userId: string | null | undefined,
    userRole?: TeamCoachUserRole,
    context?: TeamCoachAccessContext,
): Promise<TeamCoachAccessPolicy> {
    const { resolveServerProductAccess } = await import('@/lib/product-access-server');
    const productAccess = await resolveServerProductAccess(userId);

    return createTeamCoachAccessPolicy({
        productAccess,
        userRole: userRole ?? (userId ? 'user' : 'anonymous'),
        context,
    });
}

export function hasTeamCoachCapability(
    policy: TeamCoachAccessPolicy,
    capability: TeamCoachCapability,
): boolean {
    return policy.capabilities[capability];
}
