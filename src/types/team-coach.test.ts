import { describe, expect, it } from 'vitest';

import {
    parseTeamCoachDenialReason,
    parseTeamCoachReviewStatus,
    teamCoachAuditEventTypeValues,
    teamCoachConsentScopeValues,
    teamCoachDenialReasonValues,
    teamCoachInviteStatusValues,
    teamCoachMembershipStatusValues,
    teamCoachNextActionKindValues,
    teamCoachPacketStatusValues,
    teamCoachPacketVisibilityValues,
    teamCoachPrivateLinkStatusValues,
    teamCoachReviewStatusValues,
    teamCoachSeatStateValues,
    teamCoachShareStatusValues,
    teamCoachWorkspaceRoleValues,
    teamCoachWorkspaceStatusValues,
} from './team-coach';

describe('Team Coach type contracts', () => {
    it('defines the core Team workspace, membership, invite, consent, share, packet, seat, and action enums', () => {
        expect(teamCoachWorkspaceRoleValues).toEqual(['owner', 'coach', 'analyst', 'player']);
        expect(teamCoachWorkspaceStatusValues).toEqual(expect.arrayContaining(['active', 'suspended', 'archived']));
        expect(teamCoachMembershipStatusValues).toEqual(expect.arrayContaining(['invited', 'active', 'suspended', 'removed']));
        expect(teamCoachInviteStatusValues).toEqual(expect.arrayContaining(['pending', 'accepted', 'revoked', 'expired']));
        expect(teamCoachConsentScopeValues).toEqual(expect.arrayContaining([
            'analysis_summary',
            'history_trends',
            'coach_notes',
            'review_packet',
            'print_export',
        ]));
        expect(teamCoachShareStatusValues).toEqual(expect.arrayContaining(['pending', 'active', 'revoked', 'expired']));
        expect(teamCoachPacketVisibilityValues).toEqual(expect.arrayContaining(['private', 'unlisted']));
        expect(teamCoachPacketStatusValues).toEqual(expect.arrayContaining(['draft', 'ready', 'published', 'revoked', 'disabled']));
        expect(teamCoachPrivateLinkStatusValues).toEqual(expect.arrayContaining(['active', 'revoked', 'expired', 'disabled']));
        expect(teamCoachSeatStateValues).toEqual(expect.arrayContaining(['available', 'reserved', 'occupied', 'limit_reached', 'blocked']));
        expect(teamCoachNextActionKindValues).toEqual(expect.arrayContaining([
            'review_report',
            'request_validation',
            'request_repair',
            'invite_player',
            'share_packet',
        ]));
    });

    it('keeps review statuses and denial reasons explicit for server-owned decisions', () => {
        expect(teamCoachReviewStatusValues).toEqual(expect.arrayContaining([
            'needs_review',
            'reviewed',
            'waiting_player',
            'validation_requested',
            'repair_requested',
            'archived',
        ]));
        expect(teamCoachDenialReasonValues).toEqual(expect.arrayContaining([
            'no_workspace_membership',
            'role_blocked',
            'invite_expired',
            'consent_missing',
            'report_revoked',
            'team_entitlement_missing',
            'source_not_shared',
            'seat_limit_reached',
        ]));
        expect(parseTeamCoachReviewStatus('validation_requested')).toBe('validation_requested');
        expect(parseTeamCoachDenialReason('team_entitlement_missing')).toBe('team_entitlement_missing');
        expect(() => parseTeamCoachReviewStatus('global_rank_certified')).toThrow();
        expect(() => parseTeamCoachDenialReason('client_state_allowed')).toThrow();
    });

    it('covers audit event types for private Team lifecycle changes', () => {
        expect(teamCoachAuditEventTypeValues).toEqual(expect.arrayContaining([
            'workspace_created',
            'invite_accepted',
            'consent_revoked',
            'share_revoked',
            'coach_note_created',
            'review_status_updated',
            'packet_link_revoked',
            'seat_reserved',
            'packet_moderation_disabled',
        ]));
    });
});
