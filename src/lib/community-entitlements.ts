import {
    communityEntitlementKeyValues,
    type CommunityEntitlementKey,
} from '@/types/community';

export const communityDefaultFreeEntitlementKeys = [
    'community.post.create',
    'community.comment.create',
    'community.feed.following',
] as const satisfies readonly CommunityEntitlementKey[];

const communityDefaultFreeEntitlementKeySet = new Set<CommunityEntitlementKey>(
    communityDefaultFreeEntitlementKeys,
);

export const communityPremiumEntitlementKeys = communityEntitlementKeyValues.filter(
    (key) => !communityDefaultFreeEntitlementKeySet.has(key),
);

export type CommunityResolvedEntitlementTier = 'free' | 'premium_future';

export type CommunityResolvedEntitlementSource =
    | 'default_free'
    | 'manual'
    | 'subscription_future'
    | 'creator_program_future'
    | 'none';

export interface CommunityResolvedEntitlement {
    readonly key: CommunityEntitlementKey;
    readonly tier: CommunityResolvedEntitlementTier;
    readonly granted: boolean;
    readonly source: CommunityResolvedEntitlementSource;
    readonly expiresAt: Date | null;
}

export interface CommunityEntitlementGrantInput {
    readonly entitlementKey: CommunityEntitlementKey;
    readonly source: Exclude<CommunityResolvedEntitlementSource, 'default_free' | 'none'>;
    readonly expiresAt?: Date | null;
}

export interface ResolveCommunityEntitlementsInput {
    readonly userId?: string | null;
    readonly grants?: readonly CommunityEntitlementGrantInput[];
    readonly now?: Date;
}

export interface CommunityEntitlementResolution {
    readonly userId: string | null;
    readonly grantedKeys: readonly CommunityEntitlementKey[];
    readonly entitlements: Record<CommunityEntitlementKey, CommunityResolvedEntitlement>;
}

function getDefaultEntitlementTier(
    key: CommunityEntitlementKey,
): CommunityResolvedEntitlementTier {
    return communityDefaultFreeEntitlementKeySet.has(key) ? 'free' : 'premium_future';
}

function createDefaultEntitlement(
    key: CommunityEntitlementKey,
): CommunityResolvedEntitlement {
    const tier = getDefaultEntitlementTier(key);
    const granted = tier === 'free';

    return {
        key,
        tier,
        granted,
        source: granted ? 'default_free' : 'none',
        expiresAt: null,
    };
}

function createDefaultEntitlements(): Record<CommunityEntitlementKey, CommunityResolvedEntitlement> {
    return communityEntitlementKeyValues.reduce(
        (entitlements, key) => {
            entitlements[key] = createDefaultEntitlement(key);
            return entitlements;
        },
        {} as Record<CommunityEntitlementKey, CommunityResolvedEntitlement>,
    );
}

function isGrantActive(grant: CommunityEntitlementGrantInput, now: Date): boolean {
    if (grant.expiresAt === undefined || grant.expiresAt === null) {
        return true;
    }

    return grant.expiresAt.getTime() > now.getTime();
}

export function resolveCommunityEntitlements(
    input: ResolveCommunityEntitlementsInput = {},
): CommunityEntitlementResolution {
    const now = input.now ?? new Date();
    const entitlements = createDefaultEntitlements();

    for (const grant of input.grants ?? []) {
        if (!isGrantActive(grant, now)) {
            continue;
        }

        entitlements[grant.entitlementKey] = {
            ...entitlements[grant.entitlementKey],
            granted: true,
            source: grant.source,
            expiresAt: grant.expiresAt ?? null,
        };
    }

    return {
        userId: input.userId ?? null,
        grantedKeys: communityEntitlementKeyValues.filter((key) => entitlements[key].granted),
        entitlements,
    };
}

export function hasCommunityEntitlement(
    resolution: CommunityEntitlementResolution,
    key: CommunityEntitlementKey,
): boolean {
    return resolution.entitlements[key].granted;
}
