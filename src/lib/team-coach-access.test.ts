import { describe, expect, it, vi } from 'vitest';

import {
    resolveProductAccess,
    type ProductAccessResolution,
    type ProductFeatureAccess,
} from './product-entitlements';
import type { ProductEntitlementKey } from '@/types/monetization';

vi.mock('@/lib/product-access-server', () => ({
    resolveServerProductAccess: vi.fn(),
}));

const now = new Date('2026-05-10T12:00:00.000Z');
const yesterday = new Date('2026-05-09T12:00:00.000Z');
const tomorrow = new Date('2026-05-11T12:00:00.000Z');

const teamKeys = ['team.player_review', 'team.seats'] as const satisfies readonly ProductEntitlementKey[];

function proAccess(): ProductAccessResolution {
    return resolveProductAccess({
        now,
        subscription: {
            status: 'active',
            tier: 'pro',
            currentPeriodStart: yesterday,
            currentPeriodEnd: tomorrow,
        },
    });
}

function grantTeamEntitlements(
    access: ProductAccessResolution,
    keys: readonly ProductEntitlementKey[],
): ProductAccessResolution {
    const features = { ...access.features };

    for (const key of keys) {
        const existing = features[key];
        features[key] = {
            key,
            granted: true,
            source: 'manual_grant',
            tier: 'team',
            gatingMode: existing?.gatingMode ?? 'requires_team',
        } satisfies ProductFeatureAccess;
    }

    return {
        ...access,
        features,
        auditRefs: [...access.auditRefs, 'team:manual-beta'],
    };
}

function activeCoachContext() {
    return {
        workspaceRole: 'coach',
        workspaceStatus: 'active',
        membershipStatus: 'active',
        consentStatus: 'granted',
        consentScopes: ['analysis_summary', 'history_trends', 'coach_notes', 'review_packet'],
        requiredConsentScopes: ['analysis_summary', 'review_packet'],
        shareStatus: 'active',
        seatState: 'available',
        now,
    } as const;
}

async function loadTeamAccess() {
    return import('./team-coach-access');
}

describe('Team Coach access policy', () => {
    it('keeps anonymous, Free, solo Pro, and Social Pro states out of Team authority', async () => {
        const { createTeamCoachAccessPolicy, hasTeamCoachCapability } = await loadTeamAccess();
        const states = [
            resolveProductAccess({ now }),
            proAccess(),
            resolveProductAccess({
                now,
                subscription: {
                    status: 'canceled',
                    tier: 'pro',
                },
            }),
        ];

        for (const productAccess of states) {
            const policy = createTeamCoachAccessPolicy({
                productAccess,
                userRole: productAccess.userId ? 'user' : 'anonymous',
                context: activeCoachContext(),
            });

            expect(hasTeamCoachCapability(policy, 'read_locked_preview')).toBe(true);
            expect(hasTeamCoachCapability(policy, 'create_workspace')).toBe(false);
            expect(hasTeamCoachCapability(policy, 'review_roster')).toBe(false);
            expect(hasTeamCoachCapability(policy, 'create_review_packet')).toBe(false);
            expect(policy.denialReasons).toContain('team_entitlement_missing');
        }
    });

    it('grants player review workflow only through server-owned Team entitlement plus membership and consent', async () => {
        const { createTeamCoachAccessPolicy, hasTeamCoachCapability } = await loadTeamAccess();
        const productAccess = grantTeamEntitlements(proAccess(), ['team.player_review']);
        const policy = createTeamCoachAccessPolicy({
            productAccess,
            userRole: 'user',
            context: activeCoachContext(),
        });

        expect(hasTeamCoachCapability(policy, 'create_workspace')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'review_roster')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'open_player_dossier')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'create_share')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'write_coach_note')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'update_review_status')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'create_review_packet')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'manage_packet_links')).toBe(true);
        expect(hasTeamCoachCapability(policy, 'manage_seats')).toBe(false);
        expect(policy.denialReasons).toContain('role_blocked');
        expect(policy.denialReasons).toContain('team_entitlement_missing');
    });

    it('keeps seat accounting separate from player review and owner-bound', async () => {
        const { createTeamCoachAccessPolicy } = await loadTeamAccess();
        const playerReviewOnly = grantTeamEntitlements(proAccess(), ['team.player_review']);
        const fullTeam = grantTeamEntitlements(proAccess(), teamKeys);
        const coachPolicy = createTeamCoachAccessPolicy({
            productAccess: fullTeam,
            userRole: 'user',
            context: activeCoachContext(),
        });
        const ownerPolicy = createTeamCoachAccessPolicy({
            productAccess: fullTeam,
            userRole: 'user',
            context: {
                ...activeCoachContext(),
                workspaceRole: 'owner',
            },
        });
        const reviewOnlyOwnerPolicy = createTeamCoachAccessPolicy({
            productAccess: playerReviewOnly,
            userRole: 'user',
            context: {
                ...activeCoachContext(),
                workspaceRole: 'owner',
            },
        });

        expect(coachPolicy.canManageSeats).toBe(false);
        expect(coachPolicy.capabilityDenials.manage_seats).toContain('role_blocked');
        expect(ownerPolicy.canManageSeats).toBe(true);
        expect(reviewOnlyOwnerPolicy.canManageSeats).toBe(false);
        expect(reviewOnlyOwnerPolicy.capabilityDenials.manage_seats).toContain('team_entitlement_missing');
    });

    it('returns stable denial reasons for missing membership, blocked role, consent, revoked source, expired invite, and seat limits', async () => {
        const { createTeamCoachAccessPolicy } = await loadTeamAccess();
        const productAccess = grantTeamEntitlements(proAccess(), teamKeys);
        const policy = createTeamCoachAccessPolicy({
            productAccess,
            userRole: 'user',
            context: {
                ...activeCoachContext(),
                workspaceRole: 'player',
                workspaceStatus: 'archived',
                membershipStatus: 'removed',
                consentStatus: 'revoked',
                consentScopes: [],
                shareStatus: 'revoked',
                inviteStatus: 'pending',
                inviteExpiresAt: yesterday,
                seatState: 'limit_reached',
            },
        });

        expect(policy.capabilityDenials.review_roster).toEqual(expect.arrayContaining([
            'workspace_inactive',
            'no_workspace_membership',
            'role_blocked',
        ]));
        expect(policy.capabilityDenials.open_player_dossier).toEqual(expect.arrayContaining([
            'consent_missing',
            'report_revoked',
        ]));
        expect(policy.capabilityDenials.accept_invite).toEqual(expect.arrayContaining([
            'invite_expired',
            'seat_limit_reached',
        ]));
    });

    it('resolves through the server product access resolver rather than client or community state', async () => {
        const { resolveServerProductAccess } = await import('@/lib/product-access-server');
        vi.mocked(resolveServerProductAccess).mockResolvedValue(grantTeamEntitlements(proAccess(), teamKeys));
        const { resolveTeamCoachAccessForUser } = await loadTeamAccess();

        const policy = await resolveTeamCoachAccessForUser('user-123', 'user', {
            ...activeCoachContext(),
            workspaceRole: 'owner',
        });

        expect(resolveServerProductAccess).toHaveBeenCalledWith('user-123');
        expect(policy.canCreateWorkspace).toBe(true);
        expect(policy.canManageSeats).toBe(true);
    });
});
