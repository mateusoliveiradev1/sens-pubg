import {
    hasProductEntitlement,
    type ProductAccessResolution,
} from '@/lib/product-entitlements';
import type { ProductEntitlementKey } from '@/types/monetization';

export type SocialProUserRole = 'anonymous' | 'user' | 'admin';

export type SocialProCapability =
    | 'read_public_community'
    | 'read_public_report'
    | 'read_link_private_report'
    | 'create_report'
    | 'edit_report'
    | 'manage_private_links'
    | 'write_pro_library'
    | 'read_creator_analytics'
    | 'use_advanced_context'
    | 'display_pro_badge'
    | 'control_pro_badge'
    | 'moderate_reports';

export interface SocialProAccessPolicy {
    readonly productAccess: ProductAccessResolution;
    readonly userRole: SocialProUserRole;
    readonly canReadPublicCommunity: boolean;
    readonly canReadPublicReport: boolean;
    readonly canReadLinkPrivateReport: boolean;
    readonly canCreateReport: boolean;
    readonly canEditReport: boolean;
    readonly canManagePrivateLinks: boolean;
    readonly canWriteProLibrary: boolean;
    readonly canReadCreatorAnalytics: boolean;
    readonly canUseAdvancedContext: boolean;
    readonly canDisplayProBadge: boolean;
    readonly canControlProBadge: boolean;
    readonly canUseCreatorAttribution: boolean;
    readonly canModerateReports: boolean;
    readonly capabilities: Readonly<Record<SocialProCapability, boolean>>;
}

const REPORT_SHARE_FEATURE: ProductEntitlementKey = 'community.premium_report_share';
const PRIVATE_REPORT_LINKS_FEATURE: ProductEntitlementKey = 'community.private_report_links';
const PRO_LIBRARY_FEATURE: ProductEntitlementKey = 'community.pro_library';
const CREATOR_ANALYTICS_FEATURE: ProductEntitlementKey = 'community.creator_analytics';
const ADVANCED_CONTEXT_FEATURE: ProductEntitlementKey = 'community.advanced_context';
const PRO_BADGE_FEATURE: ProductEntitlementKey = 'community.pro_badge';
const CREATOR_ATTRIBUTION_FEATURE: ProductEntitlementKey = 'community.creator_attribution';

export function createSocialProAccessPolicy(input: {
    readonly productAccess: ProductAccessResolution;
    readonly userRole?: SocialProUserRole;
}): SocialProAccessPolicy {
    const userRole = input.userRole ?? (input.productAccess.userId ? 'user' : 'anonymous');
    const canCreateReport = hasProductEntitlement(input.productAccess, REPORT_SHARE_FEATURE);
    const canManagePrivateLinks = hasProductEntitlement(input.productAccess, PRIVATE_REPORT_LINKS_FEATURE);
    const canWriteProLibrary = hasProductEntitlement(input.productAccess, PRO_LIBRARY_FEATURE);
    const canReadCreatorAnalytics = hasProductEntitlement(input.productAccess, CREATOR_ANALYTICS_FEATURE);
    const canUseAdvancedContext = hasProductEntitlement(input.productAccess, ADVANCED_CONTEXT_FEATURE);
    const canDisplayProBadge = hasProductEntitlement(input.productAccess, PRO_BADGE_FEATURE);
    const canUseCreatorAttribution = hasProductEntitlement(input.productAccess, CREATOR_ATTRIBUTION_FEATURE);
    const canModerateReports = userRole === 'admin';

    const capabilities: Readonly<Record<SocialProCapability, boolean>> = {
        read_public_community: true,
        read_public_report: true,
        read_link_private_report: true,
        create_report: canCreateReport,
        edit_report: canCreateReport,
        manage_private_links: canManagePrivateLinks,
        write_pro_library: canWriteProLibrary,
        read_creator_analytics: canReadCreatorAnalytics,
        use_advanced_context: canUseAdvancedContext,
        display_pro_badge: canDisplayProBadge,
        control_pro_badge: canDisplayProBadge,
        moderate_reports: canModerateReports,
    };

    return {
        productAccess: input.productAccess,
        userRole,
        canReadPublicCommunity: capabilities.read_public_community,
        canReadPublicReport: capabilities.read_public_report,
        canReadLinkPrivateReport: capabilities.read_link_private_report,
        canCreateReport,
        canEditReport: canCreateReport,
        canManagePrivateLinks,
        canWriteProLibrary,
        canReadCreatorAnalytics,
        canUseAdvancedContext,
        canDisplayProBadge,
        canControlProBadge: canDisplayProBadge,
        canUseCreatorAttribution,
        canModerateReports,
        capabilities,
    };
}

export async function resolveSocialProAccessForUser(
    userId: string | null | undefined,
    userRole?: SocialProUserRole,
): Promise<SocialProAccessPolicy> {
    const { resolveServerProductAccess } = await import('@/lib/product-access-server');
    const productAccess = await resolveServerProductAccess(userId);

    return createSocialProAccessPolicy({
        productAccess,
        userRole: userRole ?? (userId ? 'user' : 'anonymous'),
    });
}

export function hasSocialProCapability(
    policy: SocialProAccessPolicy,
    capability: SocialProCapability,
): boolean {
    return policy.capabilities[capability];
}
