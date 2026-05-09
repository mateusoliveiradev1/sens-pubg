import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq, inArray, like } from 'drizzle-orm';

import {
    createSocialProLinkTokenVerifier,
    generateSocialProLinkToken,
} from '../src/lib/social-pro-link-token';
import type { SocialProPublicReport } from '../src/types/social-pro';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run Phase 11 Social Pro e2e tests.');
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

interface SeededUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: 'user' | 'admin';
}

interface Phase11SocialProFixture {
    readonly proUser: SeededUser;
    readonly freeUser: SeededUser;
    readonly canceledUser: SeededUser;
    readonly profileSlug: string;
    readonly publicPostSlug: string;
    readonly publicPostTitle: string;
    readonly publicReportSlug: string;
    readonly publicReportTitle: string;
    readonly linkPrivateToken: string;
    readonly revokedToken: string;
    readonly expiredToken: string;
    readonly hiddenReportSlug: string;
    readonly linkPrivateReportTitle: string;
    readonly hiddenReportTitle: string;
    readonly archivedReportTitle: string;
    readonly cleanup: () => Promise<void>;
}

let fixture: Phase11SocialProFixture;

function createSeededUser(kind: 'pro' | 'free' | 'canceled'): SeededUser {
    const id = randomUUID();
    const role = kind === 'pro' ? 'admin' : 'user';

    return {
        id,
        email: `phase11-social-pro-${kind}-${id}@example.com`,
        name: `Phase 11 ${kind} ${id.slice(0, 8)}`,
        role,
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

function createPublicReport(input: {
    readonly id: string;
    readonly title: string;
    readonly visibility: SocialProPublicReport['visibility'];
    readonly status: SocialProPublicReport['status'];
    readonly blocker?: string;
}): SocialProPublicReport {
    return {
        id: input.id,
        visibility: input.visibility,
        status: input.status,
        publicSummary: {
            title: input.title,
            whatChanged: 'Case de evolucao com controle vertical mais estavel e suporte limitado pelo contexto publico.',
            nextAction: 'Continuar Ciclo Pro, abrir Spray Lab e validar no mesmo contexto antes de qualquer claim forte.',
        },
        honesty: {
            confidence: 0.82,
            coverage: 0.74,
            blockers: [input.blocker ?? 'validacao compativel pendente'],
            inconclusiveState: false,
            limitedSupport: ['um recorte publico e um contexto de treino'],
            validationState: 'compatible_validation_pending',
            noOverclaimDisclaimer: 'Sem promessa de rank, melhora ou sensibilidade perfeita.',
        },
        controls: {
            showConfidence: true,
            showCoverage: true,
            showBlockers: true,
            showInconclusiveState: true,
            showLimitedSupport: true,
            showValidationState: true,
            showDisclaimer: true,
            showTimeline: true,
            visibleOptionalSections: ['evidence_timeline', 'validation', 'next_actions'],
        },
        sections: {
            evidence_timeline: [
                {
                    layer: 'technical_evidence',
                    title: 'Analise tecnica',
                    summary: 'Confianca e cobertura sao exibidas sem nota global.',
                    sourceId: 'phase11-analysis',
                },
                {
                    layer: 'training_execution',
                    title: 'Execucao de treino',
                    summary: 'Spray Lab e Ciclo Pro aparecem como execucao auditavel.',
                    sourceId: 'phase11-lab',
                },
                {
                    layer: 'compatible_validation',
                    title: 'Validacao compativel',
                    summary: 'Validacao compativel continua pendente.',
                    sourceId: 'phase11-validation',
                },
            ],
        },
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
            picture: null,
        },
    });
}

async function signInAsSeededUser(page: Page, user: SeededUser) {
    const sessionToken = await createSessionToken(user);

    await page.context().addCookies([{
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        url: BASE_URL,
        httpOnly: true,
        sameSite: 'Lax',
        secure: false,
    }]);
}

async function cleanupLingeringPhase11SocialProSeeds() {
    const [{ db }, schema] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const matchedUsers = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(like(schema.users.email, 'phase11-social-pro-%@example.com'));
    const userIds = matchedUsers.map((user) => user.id);

    if (userIds.length === 0) {
        return;
    }

    const matchedPosts = await db
        .select({ id: schema.communityPosts.id })
        .from(schema.communityPosts)
        .where(inArray(schema.communityPosts.authorId, userIds));
    const postIds = matchedPosts.map((post) => post.id);

    if (postIds.length > 0) {
        await db.delete(schema.communityPostSaves).where(inArray(schema.communityPostSaves.postId, postIds));
        await db.delete(schema.communityPostLikes).where(inArray(schema.communityPostLikes.postId, postIds));
        await db.delete(schema.communityPostAnalysisSnapshots).where(inArray(schema.communityPostAnalysisSnapshots.postId, postIds));
    }

    await db.delete(schema.socialProReportLinks).where(inArray(schema.socialProReportLinks.ownerUserId, userIds));
    await db.delete(schema.socialProCollectionItems).where(inArray(schema.socialProCollectionItems.ownerUserId, userIds));
    await db.delete(schema.socialProCollections).where(inArray(schema.socialProCollections.ownerUserId, userIds));
    await db.delete(schema.socialProReports).where(inArray(schema.socialProReports.ownerUserId, userIds));
    await db.delete(schema.communityPosts).where(inArray(schema.communityPosts.authorId, userIds));
    await db.delete(schema.analysisSessions).where(inArray(schema.analysisSessions.userId, userIds));
    await db.delete(schema.productSubscriptions).where(inArray(schema.productSubscriptions.userId, userIds));
    await db.delete(schema.communityProfiles).where(inArray(schema.communityProfiles.userId, userIds));
    await db.delete(schema.users).where(inArray(schema.users.id, userIds));
}

async function seedPhase11SocialProFixture(): Promise<Phase11SocialProFixture> {
    await cleanupLingeringPhase11SocialProSeeds();

    const [{ db }, schema] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const proUser = createSeededUser('pro');
    const freeUser = createSeededUser('free');
    const canceledUser = createSeededUser('canceled');
    const suffix = randomUUID().slice(0, 8);
    const profileId = randomUUID();
    const analysisSessionId = randomUUID();
    const postId = randomUUID();
    const collectionId = randomUUID();
    const publicReportId = randomUUID();
    const linkPrivateReportId = randomUUID();
    const hiddenReportId = randomUUID();
    const archivedReportId = randomUUID();
    const publicPostSlug = `phase11-public-post-${suffix}`;
    const profileSlug = `phase11-public-profile-${suffix}`;
    const publicReportSlug = `phase11-public-report-${suffix}`;
    const hiddenReportSlug = `phase11-hidden-report-${suffix}`;
    const publicPostTitle = `Post publico Social Pro ${suffix}`;
    const publicReportTitle = `Relatorio Pro Compartilhavel ${suffix}`;
    const linkPrivateReportTitle = `Relatorio link privado ${suffix}`;
    const hiddenReportTitle = `Relatorio oculto ${suffix}`;
    const archivedReportTitle = `Relatorio arquivado ${suffix}`;
    const linkPrivateToken = generateSocialProLinkToken();
    const revokedToken = generateSocialProLinkToken();
    const expiredToken = generateSocialProLinkToken();
    const activeVerifier = createSocialProLinkTokenVerifier(linkPrivateToken);
    const revokedVerifier = createSocialProLinkTokenVerifier(revokedToken);
    const expiredVerifier = createSocialProLinkTokenVerifier(expiredToken);
    const copySensPreset = createPersistedCopySensPreset();

    await db.insert(schema.users).values([
        {
            id: proUser.id,
            name: proUser.name,
            email: proUser.email,
            image: '',
            role: proUser.role,
        },
        {
            id: freeUser.id,
            name: freeUser.name,
            email: freeUser.email,
            image: '',
            role: freeUser.role,
        },
        {
            id: canceledUser.id,
            name: canceledUser.name,
            email: canceledUser.email,
            image: '',
            role: canceledUser.role,
        },
    ]);

    await db.insert(schema.productSubscriptions).values({
        userId: canceledUser.id,
        stripeCustomerId: `cus_phase11_${suffix}`,
        stripeSubscriptionId: `sub_phase11_${suffix}`,
        internalPriceKey: 'pro_public_brl_monthly',
        tier: 'pro',
        billingStatus: 'canceled',
        accessState: 'canceled',
        currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-04-30T00:00:00.000Z'),
        canceledAt: new Date('2026-04-30T00:00:00.000Z'),
    });

    await db.insert(schema.communityProfiles).values({
        id: profileId,
        userId: proUser.id,
        slug: profileSlug,
        displayName: 'Creator Social Pro',
        headline: 'Perfil publico com reportagens Social Pro public-safe.',
        bio: 'Compartilha recortes com confianca, cobertura e limites visiveis.',
        links: [],
        visibility: 'public',
        creatorProgramStatus: 'none',
    });

    await db.insert(schema.analysisSessions).values({
        id: analysisSessionId,
        userId: proUser.id,
        weaponId: 'beryl-m762',
        scopeId: '3x',
        patchVersion: '41.1',
        stance: 'standing',
        attachments: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        },
        distance: 50,
        stabilityScore: 82,
        verticalControl: 0.78,
        horizontalNoise: 0.22,
        recoilResponseMs: 142,
        driftBias: {
            direction: 'neutral',
            magnitude: 0.08,
        },
        consistencyScore: 80,
        diagnoses: ['vertical_control'],
        fullResult: {} as never,
        sprayScore: 81,
    });

    await db.insert(schema.communityPosts).values({
        id: postId,
        authorId: proUser.id,
        communityProfileId: profileId,
        slug: publicPostSlug,
        type: 'analysis_snapshot',
        status: 'published',
        visibility: 'public',
        title: publicPostTitle,
        excerpt: 'Post publico com curtir, comentar, salvar e seguir sem depender do Pro.',
        bodyMarkdown: 'Post publico Social Pro preserva leitura aberta, sem transformar engajamento normal em recurso pago.',
        sourceAnalysisSessionId: analysisSessionId,
        primaryWeaponId: 'beryl-m762',
        primaryPatchVersion: '41.1',
        primaryDiagnosisKey: 'vertical_control',
        copySensPreset: copySensPreset as never,
        featuredUntil: new Date('2099-05-01T00:00:00.000Z'),
        publishedAt: new Date('2026-05-09T12:00:00.000Z'),
    });

    await db.insert(schema.communityPostAnalysisSnapshots).values({
        postId,
        analysisSessionId,
        analysisResultId: `phase11-analysis-${suffix}`,
        analysisTimestamp: '2026-05-09T12:00:00.000Z',
        analysisResultSchemaVersion: 1,
        patchVersion: '41.1',
        weaponId: 'beryl-m762',
        scopeId: '3x',
        distance: 50,
        stance: 'standing',
        attachmentsSnapshot: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        } as never,
        metricsSnapshot: {
            stabilityScore: 82,
            consistencyScore: 80,
        } as never,
        diagnosesSnapshot: [
            {
                type: 'vertical_control',
                severity: 3,
                description: 'Controle vertical com melhora de estabilidade dentro do recorte.',
                cause: 'Pull menos atrasado, ainda com validacao compativel pendente.',
                remediation: 'Repetir o bloco no mesmo contexto antes de subir dificuldade.',
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

    await db.insert(schema.socialProReports).values([
        {
            id: publicReportId,
            ownerUserId: proUser.id,
            communityProfileId: profileId,
            publicSlug: publicReportSlug,
            visibility: 'public',
            status: 'published',
            title: publicReportTitle,
            publicSafeSnapshot: createPublicReport({
                id: publicReportId,
                title: publicReportTitle,
                visibility: 'public',
                status: 'published',
            }) as never,
            sourceAnalysisSessionId: analysisSessionId,
            sourceHistorySessionId: analysisSessionId,
            sourceTrainingProgramCycleId: null,
            publishedAt: new Date('2026-05-09T12:15:00.000Z'),
        },
        {
            id: linkPrivateReportId,
            ownerUserId: proUser.id,
            communityProfileId: profileId,
            publicSlug: null,
            visibility: 'link_private',
            status: 'published',
            title: linkPrivateReportTitle,
            publicSafeSnapshot: createPublicReport({
                id: linkPrivateReportId,
                title: linkPrivateReportTitle,
                visibility: 'link_private',
                status: 'published',
                blocker: 'link privado nao listado',
            }) as never,
            sourceAnalysisSessionId: analysisSessionId,
            sourceHistorySessionId: analysisSessionId,
            sourceTrainingProgramCycleId: null,
            publishedAt: new Date('2026-05-09T12:20:00.000Z'),
        },
        {
            id: hiddenReportId,
            ownerUserId: proUser.id,
            communityProfileId: profileId,
            publicSlug: hiddenReportSlug,
            visibility: 'public',
            status: 'hidden',
            title: hiddenReportTitle,
            publicSafeSnapshot: createPublicReport({
                id: hiddenReportId,
                title: hiddenReportTitle,
                visibility: 'public',
                status: 'hidden',
            }) as never,
            sourceAnalysisSessionId: analysisSessionId,
            publishedAt: new Date('2026-05-09T12:25:00.000Z'),
        },
        {
            id: archivedReportId,
            ownerUserId: proUser.id,
            communityProfileId: profileId,
            publicSlug: `phase11-archived-report-${suffix}`,
            visibility: 'public',
            status: 'archived',
            title: archivedReportTitle,
            publicSafeSnapshot: createPublicReport({
                id: archivedReportId,
                title: archivedReportTitle,
                visibility: 'public',
                status: 'archived',
            }) as never,
            sourceAnalysisSessionId: analysisSessionId,
            publishedAt: new Date('2026-05-09T12:30:00.000Z'),
            archivedAt: new Date('2026-05-09T12:35:00.000Z'),
        },
    ]);

    await db.insert(schema.socialProReportLinks).values([
        {
            reportId: linkPrivateReportId,
            ownerUserId: proUser.id,
            tokenVerifierHash: activeVerifier.tokenVerifierHash,
            tokenVerifierPrefix: activeVerifier.tokenVerifierPrefix,
            status: 'active',
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        },
        {
            reportId: linkPrivateReportId,
            ownerUserId: proUser.id,
            tokenVerifierHash: revokedVerifier.tokenVerifierHash,
            tokenVerifierPrefix: revokedVerifier.tokenVerifierPrefix,
            status: 'revoked',
            revokedByUserId: proUser.id,
            revokedAt: new Date('2026-05-09T12:40:00.000Z'),
        },
        {
            reportId: linkPrivateReportId,
            ownerUserId: proUser.id,
            tokenVerifierHash: expiredVerifier.tokenVerifierHash,
            tokenVerifierPrefix: expiredVerifier.tokenVerifierPrefix,
            status: 'expired',
            expiresAt: new Date('2026-05-01T00:00:00.000Z'),
        },
    ]);

    await db.insert(schema.socialProCollections).values({
        id: collectionId,
        ownerUserId: proUser.id,
        mode: 'manual',
        visibility: 'private',
        shareable: false,
        label: 'Beryl validacao pendente',
        description: 'Colecao privada de contexto Social Pro.',
        contextKey: 'beryl-m762:3x:50m:vertical_control',
        weaponId: 'beryl-m762',
        opticId: '3x',
        distanceMeters: 50,
        diagnosisKey: 'vertical_control',
        validationState: 'compatible_validation_pending',
        payload: {} as never,
    });
    await db.insert(schema.socialProCollectionItems).values({
        collectionId,
        ownerUserId: proUser.id,
        kind: 'report',
        itemId: publicReportId,
        socialProReportId: publicReportId,
        contextKey: 'beryl-m762:3x:50m:vertical_control',
        contextFacets: {
            weaponId: 'beryl-m762',
            diagnosisKey: 'vertical_control',
        } as never,
    });

    return {
        proUser,
        freeUser,
        canceledUser,
        profileSlug,
        publicPostSlug,
        publicPostTitle,
        publicReportSlug,
        publicReportTitle,
        linkPrivateToken,
        revokedToken,
        expiredToken,
        hiddenReportSlug,
        linkPrivateReportTitle,
        hiddenReportTitle,
        archivedReportTitle,
        async cleanup() {
            await db.delete(schema.socialProReportLinks).where(eq(schema.socialProReportLinks.reportId, linkPrivateReportId));
            await db.delete(schema.socialProCollectionItems).where(eq(schema.socialProCollectionItems.collectionId, collectionId));
            await db.delete(schema.socialProCollections).where(eq(schema.socialProCollections.id, collectionId));
            await db.delete(schema.socialProReports).where(inArray(schema.socialProReports.id, [
                publicReportId,
                linkPrivateReportId,
                hiddenReportId,
                archivedReportId,
            ]));
            await db.delete(schema.communityPostSaves).where(eq(schema.communityPostSaves.postId, postId));
            await db.delete(schema.communityPostLikes).where(eq(schema.communityPostLikes.postId, postId));
            await db.delete(schema.communityPostAnalysisSnapshots).where(eq(schema.communityPostAnalysisSnapshots.postId, postId));
            await db.delete(schema.communityPosts).where(eq(schema.communityPosts.id, postId));
            await db.delete(schema.analysisSessions).where(eq(schema.analysisSessions.id, analysisSessionId));
            await db.delete(schema.productSubscriptions).where(eq(schema.productSubscriptions.userId, canceledUser.id));
            await db.delete(schema.communityProfiles).where(eq(schema.communityProfiles.id, profileId));
            await db.delete(schema.users).where(inArray(schema.users.id, [
                proUser.id,
                freeUser.id,
                canceledUser.id,
            ]));
        },
    };
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .map((element) => {
                const rect = element.getBoundingClientRect();

                return {
                    tag: element.tagName.toLowerCase(),
                    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
                    className: typeof element.className === 'string' ? element.className : '',
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                };
            })
            .filter((item) => item.right > document.documentElement.clientWidth + 2 || item.left < -2)
            .slice(0, 8),
    }));

    expect(
        dimensions.scrollWidth,
        JSON.stringify(dimensions.offenders, null, 2),
    ).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function expectNoAggressiveOrFalsePremiumCopy(page: Page): Promise<void> {
    const visibleCopy = await page.locator('body').innerText();
    const normalizedCopy = visibleCopy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    expect(normalizedCopy).not.toMatch(/(garante|garantimos|promete|prometemos).{0,50}(rank|melhora|sensibilidade perfeita|nota global)/);
    expect(normalizedCopy).not.toMatch(/(pubg|krafton).{0,20}(oficial|partner|parceiro)/);
    expect(normalizedCopy).not.toMatch(/(pagante|pro).{0,40}(autoridade tecnica|jogador melhor|creator certificado)/);
    expect(normalizedCopy).not.toMatch(/api pubg.{0,30}exclusiv|exclusiv.{0,30}api pubg/);
}

async function expectRequiredHonestyText(page: Page): Promise<void> {
    await expect(page.getByText(/confianca|confidence/i).first()).toBeVisible();
    await expect(page.getByText(/cobertura|coverage/i).first()).toBeVisible();
    await expect(page.getByText(/bloqueio|bloqueador|blocker|limitado|inconclusivo/i).first()).toBeVisible();
    await expect(page.getByText(/validacao compativel|nao garante|sem overclaim/i).first()).toBeVisible();
}

async function expectMainContent(page: Page): Promise<void> {
    await expect(page.locator('#main-content').first()).toBeVisible();
}

async function capturePhase11Screenshot(page: Page, slug: string, viewportLabel: string): Promise<void> {
    await page.screenshot({
        fullPage: true,
        path: `test-results/phase11-${slug}-${viewportLabel}.png`,
    });
}

async function expectProBadgeMeaning(locator: ReturnType<Page['locator']>): Promise<void> {
    await expect(locator.first()).toBeVisible();
    const label = await locator.first().getAttribute('aria-label')
        ?? await locator.first().getAttribute('title')
        ?? await locator.first().getAttribute('data-badge-copy')
        ?? '';
    const authorityCopy = await locator.first().getAttribute('data-authority-copy')
        ?? await locator.first().textContent()
        ?? '';

    expect(`${label} ${authorityCopy}`).toMatch(/Pro: acesso aos recursos premium do Sens PUBG|nao indica autoridade/i);
}

test.beforeAll(async () => {
    fixture = await seedPhase11SocialProFixture();
});

test.afterAll(async () => {
    await fixture?.cleanup();
});

for (const [viewportLabel, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 11 Social Pro browser proof ${viewportLabel}`, () => {
        test.use({ viewport });

        test('keeps public feed, public post, profile, and normal engagement open', async ({ page }) => {
            await page.goto('/community');
            await expectMainContent(page);
            await expect(page.locator('#community-feed, [data-community-section="feed"]').first()).toBeVisible();
            await expect(page.getByRole('link', { name: fixture.publicPostTitle }).first()).toBeVisible();
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-feed', viewportLabel);

            await page.goto(`/community/${fixture.publicPostSlug}`);
            await expectMainContent(page);
            await expect(page.getByRole('heading', { name: fixture.publicPostTitle })).toBeVisible();
            await expect(page.getByRole('button', { name: /curtir/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible();
            await expect(page.getByText(/Comentarios|comentar|Conversa deste post/i).first()).toBeVisible();
            await expect(page.getByRole('link', { name: /Ver perfil/i }).first()).toBeVisible();
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-post', viewportLabel);

            await page.goto(`/community/users/${fixture.profileSlug}`);
            await expectMainContent(page);
            await expect(page.getByRole('heading', { level: 1, name: /Creator Social Pro/i })).toBeVisible();
            await expect(page.getByText(/Perfil publico|Posts publicos|Seguir/i).first()).toBeVisible();
            await expect(page.getByRole('link', { name: fixture.publicReportTitle })).toBeVisible();
            await expect(page.getByText(fixture.linkPrivateReportTitle)).toHaveCount(0);
            await expect(page.getByText(fixture.hiddenReportTitle)).toHaveCount(0);
            await expect(page.getByText(fixture.archivedReportTitle)).toHaveCount(0);
            await expectRequiredHonestyText(page);
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-profile', viewportLabel);
        });

        test('covers public-safe report visibility and private-link lifecycle states', async ({ page }) => {
            const scenarios = [
                {
                    slug: 'public-report',
                    href: `/community/reports/${fixture.publicReportSlug}`,
                    expectedText: /Relatorio Pro Compartilhavel|case de evolucao/i,
                    honestyRequired: true,
                },
                {
                    slug: 'link-private-report',
                    href: `/community/reports/${fixture.linkPrivateToken}`,
                    expectedText: /link privado|nao listado|Relatorio link privado/i,
                    honestyRequired: true,
                },
                {
                    slug: 'revoked-link',
                    href: `/community/reports/${fixture.revokedToken}`,
                    expectedText: /link privado revogado|revogado|invalido|indisponivel/i,
                    honestyRequired: false,
                },
                {
                    slug: 'expired-link',
                    href: `/community/reports/${fixture.expiredToken}`,
                    expectedText: /link privado expirado|expirado|indisponivel/i,
                    honestyRequired: false,
                },
                {
                    slug: 'hidden-disabled-report',
                    href: `/community/reports/${fixture.hiddenReportSlug}`,
                    expectedText: /relatorio indisponivel|ocultado|desativado|arquivado/i,
                    honestyRequired: false,
                },
            ] as const;

            for (const scenario of scenarios) {
                await page.goto(scenario.href);
                await expectMainContent(page);
                await expect(page.getByText(scenario.expectedText).first()).toBeVisible();
                await expectNoAggressiveOrFalsePremiumCopy(page);
                if (scenario.honestyRequired) {
                    await expectRequiredHonestyText(page);
                }
                await expectNoHorizontalOverflow(page);
                await capturePhase11Screenshot(page, scenario.slug, viewportLabel);
            }
        });

        test('covers Free, Pro, canceled, badge, analytics, library, controls, and handoff states', async ({ page }) => {
            await signInAsSeededUser(page, fixture.freeUser);
            await page.goto('/community');
            await expectMainContent(page);
            await expect(page.getByText(/Free mantem|Pro organiza|biblioteca/i).first()).toBeVisible();
            await expect(page.locator('[data-social-pro-actions]').first()).toHaveAttribute(
                'data-social-pro-actions',
                /generate_report.*pro_library_save.*creator_analytics_open.*continue_ciclo_pro.*open_spray_lab/,
            );
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'free-lock', viewportLabel);

            await page.context().clearCookies();
            await signInAsSeededUser(page, fixture.proUser);
            await page.goto('/community');
            await expectMainContent(page);
            await expect(page.getByText(/Cockpit Social Pro|Relatorios recentes|Biblioteca de contexto/i).first()).toBeVisible();
            await expect(page.getByText(/Analytics agregados|sem leitores privados|links privados|funil financeiro/i).first()).toBeVisible();
            await expect(page.getByText(/Gerar Relatorio Pro|Abrir biblioteca Pro|Ver analytics seguros/i).first()).toBeVisible();
            await expect(page.locator('[data-community-section="social-pro-cockpit"]').getByText(/Ciclo Pro|Spray Lab|validacao compativel|historico/i).first()).toBeVisible();
            await expectProBadgeMeaning(page.locator('[data-badge-copy="Pro: acesso aos recursos premium do Sens PUBG"]'));
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'pro-hub', viewportLabel);

            await page.goto(`/community/reports/${fixture.publicReportSlug}`);
            await expectProBadgeMeaning(page.locator('[data-social-pro-badge="active_pro_access"]'));
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'badge-report-detail', viewportLabel);

            await page.goto(`/community/users/${fixture.profileSlug}`);
            await expectProBadgeMeaning(page.locator('[data-social-pro-badge="profile"]'));
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'badge-profile', viewportLabel);

            await page.goto(`/community/${fixture.publicPostSlug}`);
            await expectProBadgeMeaning(page.locator('[data-social-pro-badge="post-author"]'));
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'badge-post-author', viewportLabel);

            await page.goto('/community');
            await expectProBadgeMeaning(page.locator('[data-badge-copy="Pro: acesso aos recursos premium do Sens PUBG"]').first());
            await expect(page.getByText(/nao indica autoridade tecnica/i).first()).toBeVisible();
            await capturePhase11Screenshot(page, 'badge-creator-card', viewportLabel);

            await page.context().clearCookies();
            await signInAsSeededUser(page, fixture.canceledUser);
            await page.goto(`/community/reports/${fixture.publicReportSlug}`);
            await expect(page.getByRole('heading', { name: fixture.publicReportTitle })).toBeVisible();
            await expectRequiredHonestyText(page);
            await page.goto('/community');
            await expect(page.getByText(/Free mantem|criar|Gerar Relatorio Pro/i).first()).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'cancellation-behavior', viewportLabel);
        });
    });
}
