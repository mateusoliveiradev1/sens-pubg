import { describe, expect, it } from 'vitest';

import type { CommunityEntitlementKey } from '@/types/community';

async function loadCommunityEntitlementsModule() {
    return import('./community-entitlements');
}

function expectGranted(
    result: {
        entitlements: Record<
            CommunityEntitlementKey,
            {
                key: CommunityEntitlementKey;
                tier: 'free' | 'premium_future';
                granted: boolean;
                source: string;
                expiresAt: Date | null;
            }
        >;
    },
    keys: readonly CommunityEntitlementKey[],
) {
    for (const key of keys) {
        expect(result.entitlements[key]).toMatchObject({
            key,
            granted: true,
            expiresAt: null,
        });
    }
}

function expectNotGranted(
    result: {
        entitlements: Record<
            CommunityEntitlementKey,
            {
                key: CommunityEntitlementKey;
                tier: 'free' | 'premium_future';
                granted: boolean;
                source: string;
                expiresAt: Date | null;
            }
        >;
    },
    keys: readonly CommunityEntitlementKey[],
) {
    for (const key of keys) {
        expect(result.entitlements[key]).toMatchObject({
            key,
            granted: false,
            expiresAt: null,
        });
    }
}

describe('community entitlement resolver', () => {
    it('returns only the default free entitlements when no user grants exist', async () => {
        const {
            resolveCommunityEntitlements,
            hasCommunityEntitlement,
            communityDefaultFreeEntitlementKeys,
            communityPremiumEntitlementKeys,
        } = await loadCommunityEntitlementsModule();

        const result = resolveCommunityEntitlements();

        expect(result.userId).toBeNull();
        expect(result.grantedKeys).toEqual(communityDefaultFreeEntitlementKeys);
        expectGranted(result, communityDefaultFreeEntitlementKeys);
        expectNotGranted(result, communityPremiumEntitlementKeys);

        for (const key of communityDefaultFreeEntitlementKeys) {
            expect(hasCommunityEntitlement(result, key)).toBe(true);
            expect(result.entitlements[key]).toMatchObject({
                tier: 'free',
                source: 'default_free',
            });
        }

        for (const key of communityPremiumEntitlementKeys) {
            expect(hasCommunityEntitlement(result, key)).toBe(false);
            expect(result.entitlements[key]).toMatchObject({
                tier: 'premium_future',
                source: 'none',
            });
        }
    });

    it('does not grant premium entitlements by default to authenticated users', async () => {
        const {
            resolveCommunityEntitlements,
            hasCommunityEntitlement,
            communityPremiumEntitlementKeys,
        } = await loadCommunityEntitlementsModule();

        const result = resolveCommunityEntitlements({
            userId: 'user-1',
        });

        expect(result.userId).toBe('user-1');
        expectNotGranted(result, communityPremiumEntitlementKeys);

        for (const key of communityPremiumEntitlementKeys) {
            expect(hasCommunityEntitlement(result, key)).toBe(false);
        }
    });

    it('accepts future grants through the resolver input without changing the policy contract', async () => {
        const {
            resolveCommunityEntitlements,
            hasCommunityEntitlement,
            communityDefaultFreeEntitlementKeys,
        } = await loadCommunityEntitlementsModule();

        const result = resolveCommunityEntitlements({
            userId: 'user-1',
            grants: [
                {
                    entitlementKey: 'community.creator.analytics',
                    source: 'subscription_future',
                },
            ],
        });

        expect(result.grantedKeys).toEqual([
            ...communityDefaultFreeEntitlementKeys,
            'community.creator.analytics',
        ]);
        expect(hasCommunityEntitlement(result, 'community.creator.analytics')).toBe(true);
        expect(result.entitlements['community.creator.analytics']).toMatchObject({
            key: 'community.creator.analytics',
            tier: 'premium_future',
            granted: true,
            source: 'subscription_future',
            expiresAt: null,
        });
    });
});
