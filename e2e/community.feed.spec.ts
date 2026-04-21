/**
 * E2E: Public community feed page
 * Confirma que /community renderiza apenas posts publicos publicados
 * e aplica filtros basicos usando a query/core do feed publico.
 */

import { randomUUID } from 'node:crypto';

import { test, expect, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { count, eq } from 'drizzle-orm';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run community feed e2e tests.');
}

type SeededAuthor = {
    readonly userId: string;
    readonly profileId: string;
    readonly email: string;
    readonly slug: string;
    readonly displayName: string;
};

type SeededViewer = {
    readonly userId: string;
    readonly email: string;
    readonly name: string;
};

function createSeededAuthor(seed: string, name: string): SeededAuthor {
    return {
        userId: randomUUID(),
        profileId: randomUUID(),
        email: `community-feed-${seed}-${randomUUID()}@example.com`,
        slug: `community-${seed}-${randomUUID().slice(0, 8)}`,
        displayName: name,
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
                    {
                        scopeName: '3x',
                        current: 41,
                        recommended: 39,
                        changePercent: -4.87,
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

async function createSessionToken(user: SeededViewer) {
    const { encode } = await import('next-auth/jwt');

    return encode({
        secret: AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
        token: {
            sub: user.userId,
            id: user.userId,
            role: 'user',
            name: user.name,
            email: user.email,
            picture: null,
        },
    });
}

async function signInAsSeededUser(page: Page, user: SeededViewer) {
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

async function seedCommunityFeedFixture() {
    const [{ db }, { analysisSessions, communityPostAnalysisSnapshots, communityPostLikes, communityPostSaves, communityProfiles, communityPosts, users }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);

    const aceAuthor = createSeededAuthor('ace32', 'Ace Coach');
    const berylAuthor = createSeededAuthor('beryl', 'Beryl Coach');
    const hiddenAuthor = createSeededAuthor('hidden', 'Hidden Coach');
    const viewer: SeededViewer = {
        userId: randomUUID(),
        email: `community-feed-viewer-${randomUUID()}@example.com`,
        name: 'Community Feed Viewer',
    };
    const seedSuffix = randomUUID().slice(0, 8);
    const aceTitle = `Ace32 laser reset ${seedSuffix}`;
    const berylTitle = `Beryl anchor fundamentals ${seedSuffix}`;
    const hiddenTitle = `Draft hidden seed post ${seedSuffix}`;
    const aceAnalysisSessionId = randomUUID();
    const berylAnalysisSessionId = randomUUID();
    const hiddenAnalysisSessionId = randomUUID();
    const acePostId = randomUUID();
    const berylPostId = randomUUID();
    const hiddenPostId = randomUUID();
    const aceSlug = `ace32-laser-reset-${randomUUID().slice(0, 8)}`;
    const copySensPreset = createPersistedCopySensPreset();

    await db.insert(users).values([
        {
            id: aceAuthor.userId,
            name: aceAuthor.displayName,
            email: aceAuthor.email,
            image: '',
        },
        {
            id: berylAuthor.userId,
            name: berylAuthor.displayName,
            email: berylAuthor.email,
            image: '',
        },
        {
            id: hiddenAuthor.userId,
            name: hiddenAuthor.displayName,
            email: hiddenAuthor.email,
            image: '',
        },
        {
            id: viewer.userId,
            name: viewer.name,
            email: viewer.email,
            image: '',
        },
    ]);

    await db.insert(communityProfiles).values([
        {
            id: aceAuthor.profileId,
            userId: aceAuthor.userId,
            slug: aceAuthor.slug,
            displayName: aceAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
        {
            id: berylAuthor.profileId,
            userId: berylAuthor.userId,
            slug: berylAuthor.slug,
            displayName: berylAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
        {
            id: hiddenAuthor.profileId,
            userId: hiddenAuthor.userId,
            slug: hiddenAuthor.slug,
            displayName: hiddenAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
    ]);

    await db.insert(analysisSessions).values([
        {
            id: aceAnalysisSessionId,
            userId: aceAuthor.userId,
            weaponId: 'ace32',
            scopeId: 'red-dot',
            patchVersion: '35.2',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'heavy_stock',
            },
            distance: 35,
            stabilityScore: 84,
            verticalControl: 1.04,
            horizontalNoise: 0.18,
            recoilResponseMs: 148,
            driftBias: {
                direction: 'left',
                magnitude: 0.12,
            },
            consistencyScore: 81,
            diagnoses: ['vertical_control'],
            fullResult: {} as never,
            sprayScore: 86,
        },
        {
            id: berylAnalysisSessionId,
            userId: berylAuthor.userId,
            weaponId: 'beryl-m762',
            scopeId: '3x',
            patchVersion: '35.1',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'heavy_stock',
            },
            distance: 42,
            stabilityScore: 82,
            verticalControl: 1.01,
            horizontalNoise: 0.22,
            recoilResponseMs: 152,
            driftBias: {
                direction: 'right',
                magnitude: 0.09,
            },
            consistencyScore: 79,
            diagnoses: ['horizontal_instability'],
            fullResult: {} as never,
            sprayScore: 84,
        },
        {
            id: hiddenAnalysisSessionId,
            userId: hiddenAuthor.userId,
            weaponId: 'aug',
            scopeId: '2x',
            patchVersion: '35.4',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'heavy_stock',
            },
            distance: 30,
            stabilityScore: 78,
            verticalControl: 1.08,
            horizontalNoise: 0.19,
            recoilResponseMs: 150,
            driftBias: {
                direction: 'neutral',
                magnitude: 0.02,
            },
            consistencyScore: 77,
            diagnoses: ['timing_delay'],
            fullResult: {} as never,
            sprayScore: 80,
        },
    ]);

    await db.insert(communityPosts).values([
        {
            id: acePostId,
            authorId: aceAuthor.userId,
            communityProfileId: aceAuthor.profileId,
            slug: aceSlug,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: aceTitle,
            excerpt: 'Seed publico filtravel por arma, patch e diagnostico.',
            bodyMarkdown: 'Public post body',
            sourceAnalysisSessionId: aceAnalysisSessionId,
            primaryWeaponId: 'ace32',
            primaryPatchVersion: '35.2',
            primaryDiagnosisKey: 'vertical_control',
            copySensPreset: copySensPreset as never,
            featuredUntil: new Date('2026-05-01T00:00:00.000Z'),
            publishedAt: new Date('2026-04-18T15:30:00.000Z'),
        },
        {
            id: berylPostId,
            authorId: berylAuthor.userId,
            communityProfileId: berylAuthor.profileId,
            slug: `beryl-anchor-fundamentals-${randomUUID().slice(0, 8)}`,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: berylTitle,
            excerpt: 'Segundo seed publico que deve permanecer fora do filtro combinado.',
            bodyMarkdown: 'Another public post body',
            sourceAnalysisSessionId: berylAnalysisSessionId,
            primaryWeaponId: 'beryl-m762',
            primaryPatchVersion: '35.1',
            primaryDiagnosisKey: 'horizontal_instability',
            copySensPreset: copySensPreset as never,
            publishedAt: new Date('2026-04-18T14:00:00.000Z'),
        },
        {
            id: hiddenPostId,
            authorId: hiddenAuthor.userId,
            communityProfileId: hiddenAuthor.profileId,
            slug: `hidden-draft-seed-${randomUUID().slice(0, 8)}`,
            type: 'analysis_snapshot',
            status: 'draft',
            visibility: 'public',
            title: hiddenTitle,
            excerpt: 'Esse post nao deve aparecer no feed publico.',
            bodyMarkdown: 'Hidden draft body',
            sourceAnalysisSessionId: hiddenAnalysisSessionId,
            primaryWeaponId: 'aug',
            primaryPatchVersion: '35.4',
            primaryDiagnosisKey: 'timing_delay',
            copySensPreset: copySensPreset as never,
            publishedAt: new Date('2026-04-18T16:30:00.000Z'),
        },
    ]);

    await db.insert(communityPostAnalysisSnapshots).values([
        {
            postId: acePostId,
            analysisSessionId: aceAnalysisSessionId,
            analysisResultId: `analysis-ace-${seedSuffix}`,
            analysisTimestamp: '2026-04-18T15:20:00.000Z',
            analysisResultSchemaVersion: 1,
            patchVersion: '35.2',
            weaponId: 'ace32',
            scopeId: 'red-dot',
            distance: 35,
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
                    type: 'vertical_control',
                    severity: 3,
                    description: 'Controle vertical proximo do ideal para sustained spray.',
                    cause: 'Pull consistente com leve margem para lapidar.',
                    remediation: 'Manter o eixo atual e estabilizar a repeticao entre sprays.',
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
        },
        {
            postId: berylPostId,
            analysisSessionId: berylAnalysisSessionId,
            analysisResultId: `analysis-beryl-${seedSuffix}`,
            analysisTimestamp: '2026-04-18T13:50:00.000Z',
            analysisResultSchemaVersion: 1,
            patchVersion: '35.1',
            weaponId: 'beryl-m762',
            scopeId: '3x',
            distance: 42,
            stance: 'standing',
            attachmentsSnapshot: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'heavy_stock',
            } as never,
            metricsSnapshot: {
                stabilityScore: 82,
                consistencyScore: 79,
            } as never,
            diagnosesSnapshot: [
                {
                    type: 'horizontal_instability',
                    severity: 4,
                    description: 'Oscilacao lateral reduzindo previsibilidade no meio do spray.',
                    cause: 'Entrada horizontal tardia com correcao longa demais.',
                    remediation: 'Encurtar a correcao lateral e validar novo bloco em 42 m.',
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
        },
        {
            postId: hiddenPostId,
            analysisSessionId: hiddenAnalysisSessionId,
            analysisResultId: `analysis-hidden-${seedSuffix}`,
            analysisTimestamp: '2026-04-18T16:20:00.000Z',
            analysisResultSchemaVersion: 1,
            patchVersion: '35.4',
            weaponId: 'aug',
            scopeId: '2x',
            distance: 30,
            stance: 'standing',
            attachmentsSnapshot: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'heavy_stock',
            } as never,
            metricsSnapshot: {
                stabilityScore: 78,
                consistencyScore: 77,
            } as never,
            diagnosesSnapshot: [
                {
                    type: 'timing_delay',
                    severity: 2,
                    description: 'Entrada inicial atrasada no primeiro bloco do spray.',
                    cause: 'Ajuste fino demorando nos primeiros tiros.',
                    remediation: 'Antecipar a primeira correcao no primeiro burst.',
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
        },
    ]);

    await db.insert(communityPostSaves).values({
        postId: acePostId,
        userId: viewer.userId,
    });

    return {
        viewer,
        expectedTitles: {
            ace: aceTitle,
            beryl: berylTitle,
            hidden: hiddenTitle,
        },
        authors: {
            ace: aceAuthor,
            beryl: berylAuthor,
            hidden: hiddenAuthor,
        },
        aceSlug,
        async getAceLikeCount() {
            const [likeCountRow] = await db
                .select({
                    count: count(),
                })
                .from(communityPostLikes)
                .innerJoin(communityPosts, eq(communityPosts.id, communityPostLikes.postId))
                .where(eq(communityPosts.slug, aceSlug))
                .limit(1);

            return Number(likeCountRow?.count ?? 0);
        },
        async cleanup() {
            await db
                .delete(communityPostSaves)
                .where(eq(communityPostSaves.postId, acePostId));
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, acePostId));
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, berylPostId));
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, hiddenPostId));
            await db.delete(communityPosts).where(eq(communityPosts.id, acePostId));
            await db.delete(communityPosts).where(eq(communityPosts.id, berylPostId));
            await db.delete(communityPosts).where(eq(communityPosts.id, hiddenPostId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, aceAnalysisSessionId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, berylAnalysisSessionId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, hiddenAnalysisSessionId));
            await db.delete(users).where(eq(users.id, aceAuthor.userId));
            await db.delete(users).where(eq(users.id, berylAuthor.userId));
            await db.delete(users).where(eq(users.id, hiddenAuthor.userId));
            await db.delete(users).where(eq(users.id, viewer.userId));
        },
    };
}

test.describe('Public community feed page', () => {
    test.describe.configure({ mode: 'serial' });

    test('renders the squad board hub with discovery sections and profile continuity links', async ({ page }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await expect(page.locator('[data-community-section="squad-board"]')).toBeVisible();
            await expect(page.locator('[data-community-signal="recoil-signal"]')).toContainText(
                'posts na tela',
            );
            await expect(page.locator('[data-community-section="community-pulse-band"]')).toBeVisible();
            await expect(page.locator('[data-community-section="community-explore-band"]')).toBeVisible();
            await expect(page.getByRole('link', { name: /(entrar|ver posts)/i }).first()).toBeVisible();
            await expect(page.locator('[data-community-section="featured-posts"]')).toBeVisible();
            await expect(page.getByRole('heading', { name: /posts que puxaram a comunidade/i })).toBeVisible();
            await expect(page.locator('#community-feed')).toBeVisible();

            await page
                .locator(`a[href="/community/users/${fixture.authors.ace.slug}"]`)
                .first()
                .click();

            await expect(page).toHaveURL(`/community/users/${fixture.authors.ace.slug}`);
            await expect(
                page.getByRole('heading', { level: 1, name: fixture.authors.ace.displayName }),
            ).toBeVisible();
        } finally {
            await fixture.cleanup();
        }
    });

    test('loads the public feed with the current app header and hides non-public entries', async ({ page }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await expect(page).toHaveTitle(/Comunidade/);
            await expect(page.getByRole('navigation', { name: /navega/i })).toBeVisible();
            await expect(page.getByRole('heading', { level: 1, name: /comunidade/i })).toBeVisible();
            await expect(page.getByRole('link', { name: fixture.expectedTitles.ace }).first()).toBeVisible();
            await expect(page.getByRole('link', { name: fixture.expectedTitles.beryl })).toBeVisible();
            await expect(page.getByText(fixture.expectedTitles.hidden)).toHaveCount(0);
        } finally {
            await fixture.cleanup();
        }
    });

    test('applies the basic public feed filters via the /community form', async ({ page }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await page.getByLabel(/arma/i).selectOption('ace32');
            await page.getByLabel(/patch/i).selectOption('35.2');
            await page.getByLabel(/diagnostico/i).selectOption('vertical_control');
            await page.getByRole('button', { name: /aplicar filtros/i }).click();

            await expect(page).toHaveURL(/weaponId=ace32/);
            await expect(page).toHaveURL(/patchVersion=35\.2/);
            await expect(page).toHaveURL(/diagnosisKey=vertical_control/);
            await expect(page.getByLabel(/filtros aplicados/i)).toContainText(/ACE32/i);
            await expect(page.getByRole('link', { name: /limpar filtros/i })).toBeVisible();
            await expect(page.locator('#community-feed').getByRole('link', { name: fixture.expectedTitles.ace })).toBeVisible();
            await expect(page.locator('#community-feed').getByRole('link', { name: fixture.expectedTitles.beryl })).toHaveCount(0);
        } finally {
            await fixture.cleanup();
        }
    });

    test('shows filter recovery empty state when no public posts match the active discovery path', async ({
        page,
    }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await page.getByLabel(/arma/i).selectOption('ace32');
            await page.getByLabel(/patch/i).selectOption('35.1');
            await page.getByLabel(/diagnostico/i).selectOption('vertical_control');
            await page.getByRole('button', { name: /aplicar filtros/i }).click();

            await expect(page).toHaveURL(/weaponId=ace32/);
            await expect(page).toHaveURL(/patchVersion=35\.1/);
            await expect(page.getByRole('heading', { name: /nada nesse recorte/i })).toBeVisible();
            await expect(page.getByText(/limpe os filtros ou publique um post com essa arma, patch ou leitura/i)).toBeVisible();
            await expect(page.getByRole('link', { name: /explorar todos/i })).toBeVisible();
            await expect(page.locator('#community-feed').getByRole('link', { name: fixture.expectedTitles.ace })).toHaveCount(0);

            await page.getByRole('link', { name: /limpar filtros/i }).first().click();

            await expect(page).toHaveURL('/community');
            await expect(page.locator('#community-feed').getByRole('link', { name: fixture.expectedTitles.ace })).toBeVisible();
        } finally {
            await fixture.cleanup();
        }
    });

    test('opens public profiles, toggles follow state, exposes profile report and handles no-post recovery', async ({
        page,
    }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await signInAsSeededUser(page, fixture.viewer);

            await page.goto(`/community/users/${fixture.authors.ace.slug}`);

            await expect(
                page.getByRole('heading', { level: 1, name: fixture.authors.ace.displayName }),
            ).toBeVisible();
            await expect(page.getByText(`@${fixture.authors.ace.slug}`)).toBeVisible();
            await expect(page.getByRole('heading', { name: /como esse perfil se move na comunidade/i })).toBeVisible();
            await expect(page.getByRole('heading', { level: 3, name: fixture.expectedTitles.ace })).toBeVisible();

            const followButton = page.getByRole('button', { name: /seguir/i });
            await expect(followButton).toContainText(/0/);
            await followButton.click();
            await expect(page.getByRole('button', { name: /seguindo/i })).toContainText(/1/);

            await page.getByRole('button', { name: /reportar/i }).click();
            await expect(page.getByLabel(/motivo/i)).toBeVisible();
            await expect(page.getByRole('button', { name: /enviar report/i })).toBeVisible();

            await page.goto(`/community/users/${fixture.authors.hidden.slug}`);

            await expect(
                page.getByRole('heading', { level: 1, name: fixture.authors.hidden.displayName }),
            ).toBeVisible();
            await expect(page.getByText(/sem posts ainda/i)).toBeVisible();
            await expect(page.getByText(fixture.expectedTitles.hidden)).toHaveCount(0);
            await expect(
                page.getByRole('link', { name: /(explorar comunidade|voltar para comunidade)/i }).first(),
            ).toBeVisible();
        } finally {
            await fixture.cleanup();
        }
    });

    test('opens the post from the feed and allows authenticated copy sens plus like on the detail page', async ({
        page,
        context,
    }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await signInAsSeededUser(page, fixture.viewer);
            await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });

            await page.goto('/community');

            await expect(page.getByRole('link', { name: fixture.expectedTitles.ace }).first()).toBeVisible();
            await page.getByRole('link', { name: fixture.expectedTitles.ace }).first().click();

            await expect(page).toHaveURL(`/community/${fixture.aceSlug}`);
            await expect(page.getByRole('heading', { level: 1, name: fixture.expectedTitles.ace })).toBeVisible();
            await expect(page.getByRole('button', { name: /reportar/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /^ver perfil$/i }).first()).toBeVisible();
            await expect(page.getByRole('link', { name: /ver posts parecidos/i }).first()).toBeVisible();

            await page.getByRole('button', { name: /copiar sens/i }).click();
            await expect(page.getByText(/^sens copiada\.$/i)).toBeVisible();

            const copiedText = await page.evaluate(async () => navigator.clipboard.readText());
            expect(copiedText).toContain('Sensitivity Profile: Balanced');
            expect(copiedText).toContain('General: 50');
            expect(copiedText).toContain('ADS: 47');

            await page.getByRole('button', { name: /curtir/i }).click();

            await expect(page.getByRole('button', { name: /curtido/i })).toContainText(/Curtido.*1/i);
            await expect.poll(async () => fixture.getAceLikeCount()).toBe(1);
        } finally {
            await fixture.cleanup();
        }
    });
});
