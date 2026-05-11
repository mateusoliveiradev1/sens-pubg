import { z } from 'zod';

function createTeamCoachEnumContract<const TValues extends readonly [string, ...string[]]>(
    values: TValues,
) {
    const schema = z.enum(values);
    const valueSet = new Set<string>(values);

    return {
        values,
        schema,
        isValue(value: string): value is TValues[number] {
            return valueSet.has(value);
        },
        parse(value: string): TValues[number] {
            return schema.parse(value);
        },
    };
}

const workspaceRoleContract = createTeamCoachEnumContract([
    'owner',
    'coach',
    'analyst',
    'player',
]);

export const teamCoachWorkspaceRoleValues = workspaceRoleContract.values;
export const teamCoachWorkspaceRoleSchema = workspaceRoleContract.schema;
export type TeamCoachWorkspaceRole = z.infer<typeof teamCoachWorkspaceRoleSchema>;
export const isTeamCoachWorkspaceRole = workspaceRoleContract.isValue;
export const parseTeamCoachWorkspaceRole = workspaceRoleContract.parse;

const workspaceStatusContract = createTeamCoachEnumContract([
    'active',
    'suspended',
    'archived',
]);

export const teamCoachWorkspaceStatusValues = workspaceStatusContract.values;
export const teamCoachWorkspaceStatusSchema = workspaceStatusContract.schema;
export type TeamCoachWorkspaceStatus = z.infer<typeof teamCoachWorkspaceStatusSchema>;
export const isTeamCoachWorkspaceStatus = workspaceStatusContract.isValue;
export const parseTeamCoachWorkspaceStatus = workspaceStatusContract.parse;

const membershipStatusContract = createTeamCoachEnumContract([
    'invited',
    'active',
    'suspended',
    'removed',
]);

export const teamCoachMembershipStatusValues = membershipStatusContract.values;
export const teamCoachMembershipStatusSchema = membershipStatusContract.schema;
export type TeamCoachMembershipStatus = z.infer<typeof teamCoachMembershipStatusSchema>;
export const isTeamCoachMembershipStatus = membershipStatusContract.isValue;
export const parseTeamCoachMembershipStatus = membershipStatusContract.parse;

const inviteStatusContract = createTeamCoachEnumContract([
    'pending',
    'accepted',
    'revoked',
    'expired',
]);

export const teamCoachInviteStatusValues = inviteStatusContract.values;
export const teamCoachInviteStatusSchema = inviteStatusContract.schema;
export type TeamCoachInviteStatus = z.infer<typeof teamCoachInviteStatusSchema>;
export const isTeamCoachInviteStatus = inviteStatusContract.isValue;
export const parseTeamCoachInviteStatus = inviteStatusContract.parse;

const consentScopeContract = createTeamCoachEnumContract([
    'analysis_summary',
    'history_trends',
    'coach_notes',
    'review_packet',
    'print_export',
]);

export const teamCoachConsentScopeValues = consentScopeContract.values;
export const teamCoachConsentScopeSchema = consentScopeContract.schema;
export type TeamCoachConsentScope = z.infer<typeof teamCoachConsentScopeSchema>;
export const isTeamCoachConsentScope = consentScopeContract.isValue;
export const parseTeamCoachConsentScope = consentScopeContract.parse;

const consentStatusContract = createTeamCoachEnumContract([
    'not_requested',
    'pending',
    'granted',
    'revoked',
    'expired',
]);

export const teamCoachConsentStatusValues = consentStatusContract.values;
export const teamCoachConsentStatusSchema = consentStatusContract.schema;
export type TeamCoachConsentStatus = z.infer<typeof teamCoachConsentStatusSchema>;
export const isTeamCoachConsentStatus = consentStatusContract.isValue;
export const parseTeamCoachConsentStatus = consentStatusContract.parse;

const shareStatusContract = createTeamCoachEnumContract([
    'pending',
    'active',
    'revoked',
    'expired',
]);

export const teamCoachShareStatusValues = shareStatusContract.values;
export const teamCoachShareStatusSchema = shareStatusContract.schema;
export type TeamCoachShareStatus = z.infer<typeof teamCoachShareStatusSchema>;
export const isTeamCoachShareStatus = shareStatusContract.isValue;
export const parseTeamCoachShareStatus = shareStatusContract.parse;

const reviewStatusContract = createTeamCoachEnumContract([
    'needs_review',
    'reviewed',
    'waiting_player',
    'validation_requested',
    'repair_requested',
    'archived',
]);

export const teamCoachReviewStatusValues = reviewStatusContract.values;
export const teamCoachReviewStatusSchema = reviewStatusContract.schema;
export type TeamCoachReviewStatus = z.infer<typeof teamCoachReviewStatusSchema>;
export const isTeamCoachReviewStatus = reviewStatusContract.isValue;
export const parseTeamCoachReviewStatus = reviewStatusContract.parse;

const packetVisibilityContract = createTeamCoachEnumContract([
    'private',
    'unlisted',
]);

export const teamCoachPacketVisibilityValues = packetVisibilityContract.values;
export const teamCoachPacketVisibilitySchema = packetVisibilityContract.schema;
export type TeamCoachPacketVisibility = z.infer<typeof teamCoachPacketVisibilitySchema>;
export const isTeamCoachPacketVisibility = packetVisibilityContract.isValue;
export const parseTeamCoachPacketVisibility = packetVisibilityContract.parse;

const packetStatusContract = createTeamCoachEnumContract([
    'draft',
    'ready',
    'published',
    'revoked',
    'disabled',
    'archived',
]);

export const teamCoachPacketStatusValues = packetStatusContract.values;
export const teamCoachPacketStatusSchema = packetStatusContract.schema;
export type TeamCoachPacketStatus = z.infer<typeof teamCoachPacketStatusSchema>;
export const isTeamCoachPacketStatus = packetStatusContract.isValue;
export const parseTeamCoachPacketStatus = packetStatusContract.parse;

const privateLinkStatusContract = createTeamCoachEnumContract([
    'active',
    'revoked',
    'expired',
    'disabled',
]);

export const teamCoachPrivateLinkStatusValues = privateLinkStatusContract.values;
export const teamCoachPrivateLinkStatusSchema = privateLinkStatusContract.schema;
export type TeamCoachPrivateLinkStatus = z.infer<typeof teamCoachPrivateLinkStatusSchema>;
export const isTeamCoachPrivateLinkStatus = privateLinkStatusContract.isValue;
export const parseTeamCoachPrivateLinkStatus = privateLinkStatusContract.parse;

const seatStateContract = createTeamCoachEnumContract([
    'available',
    'reserved',
    'occupied',
    'limit_reached',
    'blocked',
]);

export const teamCoachSeatStateValues = seatStateContract.values;
export const teamCoachSeatStateSchema = seatStateContract.schema;
export type TeamCoachSeatState = z.infer<typeof teamCoachSeatStateSchema>;
export const isTeamCoachSeatState = seatStateContract.isValue;
export const parseTeamCoachSeatState = seatStateContract.parse;

const denialReasonContract = createTeamCoachEnumContract([
    'team_entitlement_missing',
    'no_workspace_membership',
    'role_blocked',
    'invite_expired',
    'consent_missing',
    'report_revoked',
    'source_not_shared',
    'seat_limit_reached',
    'workspace_inactive',
    'not_authenticated',
]);

export const teamCoachDenialReasonValues = denialReasonContract.values;
export const teamCoachDenialReasonSchema = denialReasonContract.schema;
export type TeamCoachDenialReason = z.infer<typeof teamCoachDenialReasonSchema>;
export const isTeamCoachDenialReason = denialReasonContract.isValue;
export const parseTeamCoachDenialReason = denialReasonContract.parse;

const auditEventTypeContract = createTeamCoachEnumContract([
    'workspace_created',
    'workspace_archived',
    'workspace_updated',
    'invite_created',
    'invite_accepted',
    'invite_revoked',
    'invite_expired',
    'role_changed',
    'consent_granted',
    'consent_revoked',
    'share_created',
    'report_shared',
    'share_revoked',
    'report_revoked',
    'coach_note_created',
    'review_note_created',
    'review_status_updated',
    'review_status_changed',
    'packet_created',
    'packet_updated',
    'packet_link_created',
    'packet_link_revoked',
    'seat_reserved',
    'seat_occupied',
    'seat_released',
    'seat_changed',
    'packet_moderation_disabled',
]);

export const teamCoachAuditEventTypeValues = auditEventTypeContract.values;
export const teamCoachAuditEventTypeSchema = auditEventTypeContract.schema;
export type TeamCoachAuditEventType = z.infer<typeof teamCoachAuditEventTypeSchema>;
export const isTeamCoachAuditEventType = auditEventTypeContract.isValue;
export const parseTeamCoachAuditEventType = auditEventTypeContract.parse;

const nextActionKindContract = createTeamCoachEnumContract([
    'review_report',
    'request_validation',
    'request_repair',
    'invite_player',
    'share_packet',
    'revoke_access',
    'no_action',
]);

export const teamCoachNextActionKindValues = nextActionKindContract.values;
export const teamCoachNextActionKindSchema = nextActionKindContract.schema;
export type TeamCoachNextActionKind = z.infer<typeof teamCoachNextActionKindSchema>;
export const isTeamCoachNextActionKind = nextActionKindContract.isValue;
export const parseTeamCoachNextActionKind = nextActionKindContract.parse;

export interface TeamCoachHonestyFields {
    readonly confidence: number | null;
    readonly coverage: number | null;
    readonly blockers: readonly string[];
    readonly inconclusiveState: boolean;
    readonly limitedSupport: readonly string[];
    readonly validationState: string;
    readonly noOverclaimDisclaimer: string;
}

export interface TeamCoachAuditFact {
    readonly eventType: TeamCoachAuditEventType;
    readonly actorUserId: string;
    readonly targetUserId?: string | null;
    readonly workspaceId?: string | null;
    readonly createdAt: string;
    readonly reasonCode?: string | null;
}
