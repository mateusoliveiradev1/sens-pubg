/**
 * E2E: Flat community comments
 * Confirma leitura publica dos comentarios visiveis em ordem cronologica
 * e a criacao autenticada com `diagnosisContextKey` opcional.
 */

import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

import { cleanupLingeringCommunityE2ESeeds } from './community-seed-cleanup';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run community comments e2e tests.');
}

type SeededUser = {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image: string;
};

function createSeededUser(prefix: string, suffix: string): SeededUser {
    return {
        id: randomUUID(),
        email: `${prefix}-${suffix}-${randomUUID()}@example.com`,
        name: `${prefix}-${suffix}`,
        image: '',
    };
}

function createPersistedCopySensPreset() {
    return {
        profiles: [
            {
                type: 'balanced',
                label: 'Balanced',
                description: 'Balanced control preset',
                general: 50,
                ads: 47,
                scopes: [
                    {
                        scopeName: '1x',
                        current: 48,
                        recommended: 46,
                        changePercent: -4.16,
                    },
                ],
                cmPer360: 41,
            },
        ] as const,
        recommended: 'balanced',
        tier: 'apply_ready',
        evidenceTier: 'strong',
        confidenceScore: 0.84,
        reasoning: 'Snapshot recommendation',
        suggestedVSM: 1.02,
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
            role: 'user',
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

async function seedCommunityCommentsFixture() {
    await cleanupLingeringCommunityE2ESeeds();

    const [{ db }, schema] = await Promise.all([import('../src/db'), import('../src/db/schema')]);
    const {
        analysisSessions,
        communityPostAnalysisSnapshots,
        communityPostComments,
        communityPosts,
        communityProfiles,
        users,
    } = schema;

    const suffix = randomUUID().slice(0, 8);
    const author = createSeededUser('author', suffix);
    const firstCommentAuthor = createSeededUser('coach-a', suffix);
    const secondCommentAuthor = createSeededUser('coach-b', suffix);
    const viewer = createSeededUser('viewer', suffix);
    const analysisSessionId = randomUUID();
    const profileId = randomUUID();
    const postId = randomUUID();
    const profileSlug = `community-author-${suffix}`;
    const slug = `${profileSlug}-${analysisSessionId}`;
    const copySensPreset = createPersistedCopySensPreset();

    await db.insert(users).values([
        author,
        firstCommentAuthor,
        secondCommentAuthor,
        viewer,
    ]);

    await db.insert(communityProfiles).values({
        id: profileId,
        userId: author.id,
        slug: profileSlug,
        displayName: 'Coach Snapshot',
        links: [],
        visibility: 'public',
        creatorProgramStatus: 'none',
    });

    await db.insert(analysisSessions).values({
        id: analysisSessionId,
        userId: author.id,
        weaponId: 'beryl-m762',
        scopeId: '4x',
        patchVersion: '36.1',
        stance: 'standing',
        attachments: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        },
        distance: 42,
        stabilityScore: 84,
        verticalControl: 1.04,
        horizontalNoise: 0.18,
        recoilResponseMs: 148,
        driftBias: {
            direction: 'right',
            magnitude: 0.12,
        },
        consistencyScore: 81,
        diagnoses: ['horizontal_drift', 'overpull'],
        fullResult: {} as never,
        sprayScore: 86,
    });

    await db.insert(communityPosts).values({
        id: postId,
        authorId: author.id,
        communityProfileId: profileId,
        slug,
        type: 'analysis_snapshot',
        status: 'published',
        visibility: 'public',
        title: `Beryl comment thread ${suffix}`,
        excerpt: 'Post tecnico para validar comentarios planos.',
        bodyMarkdown: 'Contexto do post tecnico.',
        sourceAnalysisSessionId: analysisSessionId,
        primaryWeaponId: 'beryl-m762',
        primaryPatchVersion: '36.1',
        primaryDiagnosisKey: 'horizontal_drift',
        copySensPreset: copySensPreset as never,
        publishedAt: new Date('2026-04-19T12:00:00.000Z'),
    });

    await db.insert(communityPostAnalysisSnapshots).values({
        postId,
        analysisSessionId,
        analysisResultId: `analysis-${suffix}`,
        analysisTimestamp: '2026-04-19T11:45:00.000Z',
        analysisResultSchemaVersion: 1,
        patchVersion: '36.1',
        weaponId: 'beryl-m762',
        scopeId: '4x',
        distance: 42,
        stance: 'standing',
        attachmentsSnapshot: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        } as never,
        metricsSnapshot: {
            stabilityScore: 84,
            consistencyScore: 81,
        } as never,
        diagnosesSnapshot: [
            {
                type: 'horizontal_drift',
                severity: 4,
                description: 'Drift lateral acumulando para a direita.',
                cause: 'Entrada corretiva atrasada no sustained spray.',
                remediation: 'Fechar o bloco com micro-ajustes mais curtos.',
            },
            {
                type: 'overpull',
                severity: 3,
                description: 'Compensacao vertical acima da curva.',
                cause: 'Forca inicial acima do patch.',
                remediation: 'Reduzir o pull nos primeiros tiros.',
            },
        ] as never,
        coachingSnapshot: {
            feedback: [],
            plan: null,
        } as never,
        sensSnapshot: copySensPreset as never,
        trackingSnapshot: {
            points: [],
            trackingFrames: [],
            displacements: [],
        } as never,
    });

    await db.insert(communityPostComments).values([
        {
            id: randomUUID(),
            postId,
            authorId: firstCommentAuthor.id,
            status: 'visible',
            bodyMarkdown: 'Primeiro comentario visivel.',
            createdAt: new Date('2026-04-18T13:00:00.000Z'),
            updatedAt: new Date('2026-04-18T13:00:00.000Z'),
        },
        {
            id: randomUUID(),
            postId,
            authorId: author.id,
            status: 'moderator_hidden',
            bodyMarkdown: 'Comentario ocultado pela moderacao.',
            createdAt: new Date('2026-04-18T13:02:00.000Z'),
            updatedAt: new Date('2026-04-18T13:02:00.000Z'),
        },
        {
            id: randomUUID(),
            postId,
            authorId: secondCommentAuthor.id,
            status: 'visible',
            bodyMarkdown: 'Segundo comentario visivel com contexto tecnico.',
            diagnosisContextKey: 'horizontal_drift',
            createdAt: new Date('2026-04-18T13:05:00.000Z'),
            updatedAt: new Date('2026-04-18T13:05:00.000Z'),
        },
    ]);

    return {
        slug,
        viewer,
        async cleanup() {
            await db.delete(communityPosts).where(eq(communityPosts.id, postId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, analysisSessionId));
            await db.delete(users).where(eq(users.id, author.id));
            await db.delete(users).where(eq(users.id, firstCommentAuthor.id));
            await db.delete(users).where(eq(users.id, secondCommentAuthor.id));
            await db.delete(users).where(eq(users.id, viewer.id));
        },
    };
}

test.describe('Community flat comments', () => {
    test.describe.configure({ mode: 'serial' });

    test('renders visible comments in chronological order on the public detail page without breaking copy, like or save', async ({
        page,
    }) => {
        const fixture = await seedCommunityCommentsFixture();

        try {
            await page.goto(`/community/${fixture.slug}`);

            await expect(page.getByRole('button', { name: /copiar sens/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /curtir/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible();
            await expect(page.getByText(/entre na sua conta para comentar neste post/i)).toBeVisible();

            const commentBodies = page.locator('[data-community-comment-body]');

            await expect(commentBodies).toHaveCount(2);
            await expect(commentBodies.nth(0)).toContainText('Primeiro comentario visivel.');
            await expect(commentBodies.nth(1)).toContainText(
                'Segundo comentario visivel com contexto tecnico.',
            );
            await expect(page.getByText('Comentario ocultado pela moderacao.')).toHaveCount(0);
            await expect(
                page.locator('[data-community-comment-context]').filter({
                    hasText: 'horizontal_drift',
                }),
            ).toHaveCount(1);
            await expect(page.getByRole('link', { name: /entrar para reportar/i })).toHaveCount(3);
        } finally {
            await fixture.cleanup();
        }
    });

    test('requires auth for mutation and lets an authenticated viewer create a flat comment with optional diagnosis context', async ({
        page,
    }) => {
        const fixture = await seedCommunityCommentsFixture();

        try {
            await signInAsSeededUser(page, fixture.viewer);
            await page.goto(`/community/${fixture.slug}`);

            await page.getByLabel(/o que voce viu/i).fill(
                'Novo comentario autenticado com contexto tecnico opcional.',
            );
            await page.getByLabel(/falar de qual leitura/i).selectOption('horizontal_drift');
            await page.getByRole('button', { name: /^comentar$/i }).click();

            const commentBodies = page.locator('[data-community-comment-body]');

            await expect(commentBodies).toHaveCount(3);
            await expect(commentBodies.nth(2)).toContainText(
                'Novo comentario autenticado com contexto tecnico opcional.',
            );
            await expect(
                page.locator('[data-community-comment-context]').filter({
                    hasText: 'horizontal_drift',
                }),
            ).toHaveCount(2);
            await expect(page.getByRole('button', { name: /copiar sens/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /curtir/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible();

            const [{ db }, { communityPostComments }] = await Promise.all([
                import('../src/db'),
                import('../src/db/schema'),
            ]);
            const storedComments = await db
                .select({
                    bodyMarkdown: communityPostComments.bodyMarkdown,
                    diagnosisContextKey: communityPostComments.diagnosisContextKey,
                })
                .from(communityPostComments)
                .where(eq(communityPostComments.authorId, fixture.viewer.id));

            expect(storedComments).toEqual([
                {
                    bodyMarkdown: 'Novo comentario autenticado com contexto tecnico opcional.',
                    diagnosisContextKey: 'horizontal_drift',
                },
            ]);

            await page.reload();
            await expect(page.locator('[data-community-comment-body]').nth(2)).toContainText(
                'Novo comentario autenticado com contexto tecnico opcional.',
            );
        } finally {
            await fixture.cleanup();
        }
    });
});
