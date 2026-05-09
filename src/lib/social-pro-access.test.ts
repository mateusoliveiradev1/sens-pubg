import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { resolveProductAccess } from './product-entitlements';

vi.mock('@/lib/product-access-server', () => ({
    resolveServerProductAccess: vi.fn(),
}));

type SocialProCapability =
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

type SocialProAccessPolicy = unknown;

interface SocialProAccessModule {
    readonly resolveSocialProAccessForUser?: (
        userId: string | null | undefined,
        userRole?: 'anonymous' | 'user' | 'admin',
    ) => Promise<SocialProAccessPolicy>;
    readonly createSocialProAccessPolicy?: (input: {
        readonly productAccess: ReturnType<typeof resolveProductAccess>;
        readonly userRole?: 'anonymous' | 'user' | 'admin';
    }) => SocialProAccessPolicy;
    readonly hasSocialProCapability?: (
        policy: SocialProAccessPolicy,
        capability: SocialProCapability,
    ) => boolean;
}

const now = new Date('2026-05-09T12:00:00.000Z');
const yesterday = new Date('2026-05-08T12:00:00.000Z');
const tomorrow = new Date('2026-05-10T12:00:00.000Z');

async function loadSocialProAccess(): Promise<Required<SocialProAccessModule>> {
    const modulePath = './social-pro-access';

    let socialProModule: SocialProAccessModule;
    try {
        socialProModule = await import(modulePath) as SocialProAccessModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro access module at src/lib/social-pro-access.ts.',
                'Expected server-owned Free/Pro/canceled/admin access helpers for Phase 11.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    expect(typeof socialProModule.createSocialProAccessPolicy).toBe('function');
    expect(typeof socialProModule.hasSocialProCapability).toBe('function');
    expect(typeof socialProModule.resolveSocialProAccessForUser).toBe('function');

    return socialProModule as Required<SocialProAccessModule>;
}

function activeProAccess() {
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

function founderAccess() {
    return resolveProductAccess({
        now,
        subscription: {
            status: 'active',
            tier: 'founder',
            currentPeriodStart: yesterday,
            currentPeriodEnd: tomorrow,
        },
    });
}

function canceledAccess() {
    return resolveProductAccess({
        now,
        subscription: {
            status: 'canceled',
            tier: 'pro',
        },
    });
}

function expectCapabilities(
    policy: SocialProAccessPolicy,
    hasCapability: Required<SocialProAccessModule>['hasSocialProCapability'],
    capabilities: readonly SocialProCapability[],
    expected: boolean,
): void {
    for (const capability of capabilities) {
        expect(hasCapability(policy, capability), `${capability} expected ${expected}`).toBe(expected);
    }
}

describe('Social Pro access matrix', () => {
    it('keeps anonymous and Free users able to read public community basics while blocking Pro mutations', async () => {
        const { createSocialProAccessPolicy, hasSocialProCapability } = await loadSocialProAccess();
        const anonymous = createSocialProAccessPolicy({
            productAccess: resolveProductAccess({ now }),
            userRole: 'anonymous',
        });
        const free = createSocialProAccessPolicy({
            productAccess: resolveProductAccess({ now }),
            userRole: 'user',
        });

        expectCapabilities(anonymous, hasSocialProCapability, [
            'read_public_community',
            'read_public_report',
            'read_link_private_report',
        ], true);
        expectCapabilities(free, hasSocialProCapability, [
            'read_public_community',
            'read_public_report',
            'read_link_private_report',
        ], true);
        expectCapabilities(free, hasSocialProCapability, [
            'create_report',
            'edit_report',
            'manage_private_links',
            'write_pro_library',
            'read_creator_analytics',
            'use_advanced_context',
            'display_pro_badge',
            'control_pro_badge',
        ], false);
    });

    it('grants active Pro and founder users the Social Pro capabilities through product access truth', async () => {
        const { createSocialProAccessPolicy, hasSocialProCapability } = await loadSocialProAccess();
        const pro = createSocialProAccessPolicy({
            productAccess: activeProAccess(),
            userRole: 'user',
        });
        const founder = createSocialProAccessPolicy({
            productAccess: founderAccess(),
            userRole: 'user',
        });

        expectCapabilities(pro, hasSocialProCapability, [
            'create_report',
            'edit_report',
            'manage_private_links',
            'write_pro_library',
            'read_creator_analytics',
            'use_advanced_context',
            'display_pro_badge',
            'control_pro_badge',
        ], true);
        expectCapabilities(founder, hasSocialProCapability, [
            'create_report',
            'edit_report',
            'manage_private_links',
            'write_pro_library',
            'read_creator_analytics',
            'use_advanced_context',
            'display_pro_badge',
            'control_pro_badge',
        ], true);
        expect(hasSocialProCapability(pro, 'moderate_reports')).toBe(false);
    });

    it('keeps canceled or lost Pro users readable but blocks new premium report, link, library, analytics, and badge controls', async () => {
        const { createSocialProAccessPolicy, hasSocialProCapability } = await loadSocialProAccess();
        const canceled = createSocialProAccessPolicy({
            productAccess: canceledAccess(),
            userRole: 'user',
        });

        expectCapabilities(canceled, hasSocialProCapability, [
            'read_public_community',
            'read_public_report',
            'read_link_private_report',
        ], true);
        expectCapabilities(canceled, hasSocialProCapability, [
            'create_report',
            'edit_report',
            'manage_private_links',
            'write_pro_library',
            'read_creator_analytics',
            'use_advanced_context',
            'display_pro_badge',
            'control_pro_badge',
        ], false);
    });

    it('keeps report moderation admin-only even when a normal user has active Pro access', async () => {
        const { createSocialProAccessPolicy, hasSocialProCapability } = await loadSocialProAccess();
        const proUser = createSocialProAccessPolicy({
            productAccess: activeProAccess(),
            userRole: 'user',
        });
        const admin = createSocialProAccessPolicy({
            productAccess: resolveProductAccess({ now }),
            userRole: 'admin',
        });

        expect(hasSocialProCapability(proUser, 'moderate_reports')).toBe(false);
        expect(hasSocialProCapability(admin, 'moderate_reports')).toBe(true);
        expect(hasSocialProCapability(admin, 'create_report')).toBe(false);
    });

    it('resolves user access through the server product resolver instead of UI or community entitlement state', async () => {
        const { resolveServerProductAccess } = await import('@/lib/product-access-server');
        vi.mocked(resolveServerProductAccess).mockResolvedValue(activeProAccess());
        const { resolveSocialProAccessForUser, hasSocialProCapability } = await loadSocialProAccess();

        const policy = await resolveSocialProAccessForUser('user-123', 'user');

        expect(resolveServerProductAccess).toHaveBeenCalledWith('user-123');
        expect(hasSocialProCapability(policy, 'create_report')).toBe(true);
        expect(hasSocialProCapability(policy, 'write_pro_library')).toBe(true);
    });

    it('does not import the inactive community entitlement scaffold for Phase 11 Pro access', async () => {
        await loadSocialProAccess();

        const source = readFileSync(join(process.cwd(), 'src/lib/social-pro-access.ts'), 'utf8');

        expect(source).toContain('resolveServerProductAccess');
        expect(source).toContain('hasProductEntitlement');
        expect(source).not.toContain('community-entitlements');
    });
});
