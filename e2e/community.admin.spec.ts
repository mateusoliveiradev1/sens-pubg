/**
 * E2E: Admin queue de moderacao da comunidade
 * Confirma que admin autenticado lista reports abertos e aplica
 * uma acao de moderacao com trilha em moderation actions e audit logs.
 */

import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { and, desc, eq } from 'drizzle-orm';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run community admin e2e tests.');
}

type SeededUser = {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image: string;
    readonly role: 'admin' | 'user';
};

function createSeededUser(prefix: string, suffix: string, role: SeededUser['role']): SeededUser {
    return {
        id: randomUUID(),
        email: `${prefix}-${suffix}-${randomUUID()}@example.com`,
        name: `${prefix}-${suffix}`,
        image: '',
        role,
    };
}

async function createSessionToken(user: SeededUser) {
    const { encode } = await import('next-auth/jwt');

    return encode({
        secret: AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
        token: {
            sub: user.id,
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            picture: user.image,
        },
    });
}

async function signInAsSeededUser(page: Page, user: SeededUser) {
    const sessionToken = await createSessionToken(user);

    await page.context().addCookies([
        {
            name: SESSION_COOKIE_NAME,
            value: sessionToken,
            url: BASE_URL,
            httpOnly: true,
            sameSite: 'Lax',
            secure: false,
        },
    ]);
}

async function seedCommunityAdminFixture() {
    const [{ db }, schema] = await Promise.all([import('../src/db'), import('../src/db/schema')]);
    const {
        auditLogs,
        communityModerationActions,
        communityPosts,
        communityProfiles,
        communityReports,
        users,
    } = schema;

    const suffix = randomUUID().slice(0, 8);
    const admin = createSeededUser('admin', suffix, 'admin');
    const reporter = createSeededUser('reporter', suffix, 'user');
    const author = createSeededUser('author', suffix, 'user');
    const profileId = randomUUID();
    const postId = randomUUID();
    const reportId = randomUUID();
    const profileSlug = `community-admin-${suffix}`;
    const title = `Admin queue validation ${suffix}`;

    await db.insert(users).values([admin, reporter, author]);

    await db.insert(communityProfiles).values({
        id: profileId,
        userId: author.id,
        slug: profileSlug,
        displayName: 'Queue Coach',
        links: [],
        visibility: 'public',
        creatorProgramStatus: 'none',
    });

    await db.insert(communityPosts).values({
        id: postId,
        authorId: author.id,
        communityProfileId: profileId,
        slug: `${profileSlug}-${suffix}`,
        type: 'analysis_snapshot',
        status: 'published',
        visibility: 'public',
        title,
        excerpt: 'Post seedado para validar a fila admin.',
        bodyMarkdown: 'Conteudo seedado para moderacao.',
        primaryWeaponId: 'ace32',
        primaryPatchVersion: '36.1',
        primaryDiagnosisKey: 'horizontal_drift',
        copySensPreset: {
            profiles: [],
            recommended: 'balanced',
        } as never,
        publishedAt: new Date('2026-04-19T12:00:00.000Z'),
    });

    await db.insert(communityReports).values({
        id: reportId,
        entityType: 'post',
        entityId: postId,
        reportedByUserId: reporter.id,
        reasonKey: 'spam',
        details: 'Repetindo o mesmo setup em cascata.',
        status: 'open',
        createdAt: new Date('2026-04-19T12:05:00.000Z'),
    });

    return {
        admin,
        reportId,
        postId,
        title,
        async cleanup() {
            await db
                .delete(communityModerationActions)
                .where(eq(communityModerationActions.entityId, postId));
            await db.delete(communityReports).where(eq(communityReports.id, reportId));
            await db.delete(communityPosts).where(eq(communityPosts.id, postId));
            await db.delete(users).where(eq(users.id, reporter.id));
            await db.delete(users).where(eq(users.id, author.id));
            await db.delete(users).where(eq(users.id, admin.id));
        },
        async readBack() {
            const [storedPost] = await db
                .select({
                    status: communityPosts.status,
                })
                .from(communityPosts)
                .where(eq(communityPosts.id, postId))
                .limit(1);

            const [storedReport] = await db
                .select({
                    status: communityReports.status,
                    reviewedByUserId: communityReports.reviewedByUserId,
                })
                .from(communityReports)
                .where(eq(communityReports.id, reportId))
                .limit(1);

            const [storedModerationAction] = await db
                .select({
                    actionKey: communityModerationActions.actionKey,
                    actorUserId: communityModerationActions.actorUserId,
                })
                .from(communityModerationActions)
                .where(
                    and(
                        eq(communityModerationActions.entityId, postId),
                        eq(communityModerationActions.entityType, 'post'),
                    ),
                )
                .orderBy(desc(communityModerationActions.createdAt))
                .limit(1);

            const [storedAuditLog] = await db
                .select({
                    action: auditLogs.action,
                    adminId: auditLogs.adminId,
                    target: auditLogs.target,
                })
                .from(auditLogs)
                .where(
                    and(
                        eq(auditLogs.adminId, admin.id),
                        eq(auditLogs.target, postId),
                    ),
                )
                .orderBy(desc(auditLogs.createdAt))
                .limit(1);

            return {
                storedPost,
                storedReport,
                storedModerationAction,
                storedAuditLog,
            };
        },
    };
}

test.describe('Community admin moderation queue', () => {
    test.describe.configure({ mode: 'serial' });

    test('admin lists the open report queue and can hide a reported post with audit trail', async ({
        page,
    }) => {
        const fixture = await seedCommunityAdminFixture();

        try {
            await signInAsSeededUser(page, fixture.admin);
            await page.goto('/admin/community');

            await expect(
                page.getByRole('heading', {
                    level: 1,
                    name: /fila de moderacao da comunidade/i,
                }),
            ).toBeVisible();
            await expect(page.locator(`[data-community-admin-report="${fixture.reportId}"]`)).toBeVisible();
            await expect(page.getByText('spam')).toBeVisible();
            await expect(page.getByText('Repetindo o mesmo setup em cascata.')).toBeVisible();

            await page.locator(`[data-community-admin-hide="${fixture.reportId}"]`).click();

            await page.waitForURL('**/admin/community?updated=1');
            await expect(page.getByText(/fila atualizada/i)).toBeVisible();
            await expect(page.locator(`[data-community-admin-report="${fixture.reportId}"]`)).toHaveCount(0);
            await expect(
                page.getByText(/nenhum report aberto na fila de moderacao da comunidade/i),
            ).toBeVisible();

            const state = await fixture.readBack();

            expect(state.storedPost?.status).toBe('hidden');
            expect(state.storedReport).toEqual({
                status: 'actioned',
                reviewedByUserId: fixture.admin.id,
            });
            expect(state.storedModerationAction).toEqual({
                actionKey: 'hide',
                actorUserId: fixture.admin.id,
            });
            expect(state.storedAuditLog).toEqual({
                action: 'COMMUNITY_MODERATION_HIDE',
                adminId: fixture.admin.id,
                target: fixture.postId,
            });
        } finally {
            await fixture.cleanup();
        }
    });
});
