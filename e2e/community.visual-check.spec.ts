import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';

loadEnv({ path: '.env.local' });

type CommunityVisualFixtureMode = 'active' | 'sparse';

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

async function seedCommunityVisualFixture(mode: CommunityVisualFixtureMode = 'active') {
    const [{ db }, schema] = await Promise.all([import('../src/db'), import('../src/db/schema')]);
    const {
        analysisSessions,
        communityPostAnalysisSnapshots,
        communityPostSaves,
        communityProfiles,
        communityPosts,
        playerProfiles,
        users,
    } = schema;

    const suffix = randomUUID().slice(0, 8);
    const aceAuthor = {
        userId: randomUUID(),
        profileId: randomUUID(),
        slug: `visual-ace-${suffix}`,
        displayName: 'Spray Doctor',
        email: `visual-ace-${suffix}@example.com`,
    };
    const berylAuthor = {
        userId: randomUUID(),
        profileId: randomUUID(),
        slug: `visual-beryl-${suffix}`,
        displayName: 'Anchor Coach',
        email: `visual-beryl-${suffix}@example.com`,
    };
    const aceAnalysisSessionId = randomUUID();
    const berylAnalysisSessionId = randomUUID();
    const acePostId = randomUUID();
    const berylPostId = randomUUID();
    const acePostSlug = `visual-ace32-laser-${suffix}`;
    const berylPostSlug = `visual-beryl-anchor-${suffix}`;
    const acePatchVersion = `visual-patch-${suffix}`;
    const berylPatchVersion = `visual-secondary-${suffix}`;
    const copySensPreset = createPersistedCopySensPreset();
    const includeSecondaryOperator = mode === 'active';

    await db.insert(users).values([
        {
            id: aceAuthor.userId,
            name: aceAuthor.displayName,
            email: aceAuthor.email,
            image: '',
        },
        ...(includeSecondaryOperator
            ? [{
                id: berylAuthor.userId,
                name: berylAuthor.displayName,
                email: berylAuthor.email,
                image: '',
            }]
            : []),
    ]);

    await db.insert(communityProfiles).values([
        {
            id: aceAuthor.profileId,
            userId: aceAuthor.userId,
            slug: aceAuthor.slug,
            displayName: aceAuthor.displayName,
            headline: null,
            bio: null,
            avatarUrl: null,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'approved',
        },
        ...(includeSecondaryOperator
            ? [{
                id: berylAuthor.profileId,
                userId: berylAuthor.userId,
                slug: berylAuthor.slug,
                displayName: berylAuthor.displayName,
                headline: 'Anchor control notes',
                bio: 'Perfil publico secundario para manter o hub com dois operadores ativos.',
                avatarUrl: null,
                links: [],
                visibility: 'public',
                creatorProgramStatus: 'none',
            }]
            : []),
    ]);

    await db.insert(playerProfiles).values({
        userId: aceAuthor.userId,
        mouseModel: 'Razer Viper V3 Pro',
        mouseSensor: 'Focus Pro',
        mouseDpi: 400,
        mousePollingRate: 1000,
        mouseWeight: 54,
        mouseLod: 1,
        mousepadModel: 'Zowie G-SR-SE',
        mousepadWidth: 47,
        mousepadHeight: 39,
        mousepadType: 'control',
        mousepadMaterial: 'cloth',
        gripStyle: 'claw',
        playStyle: 'hybrid',
        monitorResolution: '1728x1080',
        monitorRefreshRate: 360,
        monitorPanel: 'tn',
        generalSens: 44,
        adsSens: 39,
        scopeSens: {
            '1x': 39,
            '2x': 37,
            '3x': 35,
        },
        fov: 103,
        verticalMultiplier: 1.1,
        mouseAcceleration: false,
        armLength: 'medium',
        deskSpace: 70,
        bio: 'Meu Perfil bio with real setup context.',
        twitter: 'https://x.com/spraydoctor',
        twitch: 'https://twitch.tv/spraydoctor',
    });

    await db.insert(analysisSessions).values([
        {
            id: aceAnalysisSessionId,
            userId: aceAuthor.userId,
            weaponId: 'ace32',
            scopeId: 'red-dot',
            patchVersion: acePatchVersion,
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
        ...(includeSecondaryOperator
            ? [{
                id: berylAnalysisSessionId,
                userId: berylAuthor.userId,
                weaponId: 'beryl-m762',
                scopeId: '3x',
                patchVersion: berylPatchVersion,
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
                diagnoses: ['vertical_control'],
                fullResult: {} as never,
                sprayScore: 84,
            }]
            : []),
    ]);

    await db.insert(communityPosts).values([
        {
            id: acePostId,
            authorId: aceAuthor.userId,
            communityProfileId: aceAuthor.profileId,
            slug: acePostSlug,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: `Ace32 laser reset ${suffix}`,
            excerpt: 'Seed publico com bio real e setup allowlisted no perfil.',
            bodyMarkdown: 'Public visual verification post',
            sourceAnalysisSessionId: aceAnalysisSessionId,
            primaryWeaponId: 'ace32',
            primaryPatchVersion: acePatchVersion,
            primaryDiagnosisKey: 'vertical_control',
            copySensPreset: copySensPreset as never,
            featuredUntil: new Date('2026-05-01T00:00:00.000Z'),
            publishedAt: new Date('2026-04-18T15:30:00.000Z'),
        },
        ...(includeSecondaryOperator
            ? [{
                id: berylPostId,
                authorId: berylAuthor.userId,
                communityProfileId: berylAuthor.profileId,
                slug: berylPostSlug,
                type: 'analysis_snapshot',
                status: 'published',
                visibility: 'public',
                title: `Beryl anchor fundamentals ${suffix}`,
                excerpt: 'Segundo seed publico para manter o board vivo e com tendencias.',
                bodyMarkdown: 'Second visual verification post',
                sourceAnalysisSessionId: berylAnalysisSessionId,
                primaryWeaponId: 'beryl-m762',
                primaryPatchVersion: berylPatchVersion,
                primaryDiagnosisKey: 'vertical_control',
                copySensPreset: copySensPreset as never,
                publishedAt: new Date('2026-04-18T14:00:00.000Z'),
            }]
            : []),
    ]);

    await db.insert(communityPostAnalysisSnapshots).values([
        {
            postId: acePostId,
            analysisSessionId: aceAnalysisSessionId,
            analysisResultId: `visual-analysis-ace-${suffix}`,
            analysisTimestamp: '2026-04-18T15:20:00.000Z',
            analysisResultSchemaVersion: 1,
            patchVersion: acePatchVersion,
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
        ...(includeSecondaryOperator
            ? [{
                postId: berylPostId,
                analysisSessionId: berylAnalysisSessionId,
                analysisResultId: `visual-analysis-beryl-${suffix}`,
                analysisTimestamp: '2026-04-18T13:50:00.000Z',
                analysisResultSchemaVersion: 1,
                patchVersion: berylPatchVersion,
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
                        type: 'vertical_control',
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
            }]
            : []),
    ]);

    if (includeSecondaryOperator) {
        await db.insert(communityPostSaves).values({
            postId: acePostId,
            userId: berylAuthor.userId,
        });
    }

    return {
        aceAuthor,
        sparseHubHref: `/community?patchVersion=${encodeURIComponent(acePatchVersion)}`,
        async cleanup() {
            if (includeSecondaryOperator) {
                await db
                    .delete(communityPostSaves)
                    .where(eq(communityPostSaves.postId, acePostId));
            }
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, acePostId));
            if (includeSecondaryOperator) {
                await db
                    .delete(communityPostAnalysisSnapshots)
                    .where(eq(communityPostAnalysisSnapshots.postId, berylPostId));
            }
            await db.delete(communityPosts).where(eq(communityPosts.id, acePostId));
            if (includeSecondaryOperator) {
                await db.delete(communityPosts).where(eq(communityPosts.id, berylPostId));
            }
            await db.delete(analysisSessions).where(eq(analysisSessions.id, aceAnalysisSessionId));
            if (includeSecondaryOperator) {
                await db.delete(analysisSessions).where(eq(analysisSessions.id, berylAnalysisSessionId));
            }
            await db.delete(playerProfiles).where(eq(playerProfiles.userId, aceAuthor.userId));
            await db.delete(communityProfiles).where(eq(communityProfiles.id, aceAuthor.profileId));
            if (includeSecondaryOperator) {
                await db.delete(communityProfiles).where(eq(communityProfiles.id, berylAuthor.profileId));
            }
            await db.delete(users).where(eq(users.id, aceAuthor.userId));
            if (includeSecondaryOperator) {
                await db.delete(users).where(eq(users.id, berylAuthor.userId));
            }
        },
    };
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
    const offenders = await page.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((element) => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();

                if (style.display === 'none' || style.visibility === 'hidden') {
                    return false;
                }

                if (rect.width === 0 || rect.height === 0) {
                    return false;
                }

                return rect.left < -1 || rect.right > window.innerWidth + 1;
            })
            .slice(0, 10)
            .map((element) => ({
                tag: element.tagName.toLowerCase(),
                text: (element.textContent ?? '').trim().slice(0, 120),
                right: Math.round(element.getBoundingClientRect().right),
                left: Math.round(element.getBoundingClientRect().left),
                width: Math.round(element.getBoundingClientRect().width),
            }));
    });

    expect(offenders, `${label} should not have horizontal overflow`).toEqual([]);
}

async function expectCommunityFeedOrder(
    page: Page,
    mode: CommunityVisualFixtureMode,
    label: string,
) {
    const order = await page.evaluate((currentMode) => {
        const feed = document.querySelector('#community-feed');
        const pulseBand = document.querySelector('[data-community-section="community-pulse-band"]');
        const exploreBand = document.querySelector('[data-community-section="community-explore-band"]');
        const nowBand = document.querySelector('[data-community-section="community-now-band"]');

        if (!feed) {
            return {
                feedExists: false,
                pulseExists: Boolean(pulseBand),
                exploreExists: Boolean(exploreBand),
                nowExists: Boolean(nowBand),
                feedBeforePulse: false,
                feedBeforeExplore: false,
                pulseBeforeFeed: false,
                feedInsideExplore: false,
            };
        }

        const isBefore = (left: Element, right: Element | null) => !right
            || Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
        const isAfter = (left: Element | null, right: Element) => Boolean(
            left && left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING,
        );

        return {
            feedExists: true,
            pulseExists: Boolean(pulseBand),
            exploreExists: Boolean(exploreBand),
            nowExists: Boolean(nowBand),
            feedBeforePulse: isBefore(feed, pulseBand),
            feedBeforeExplore: isBefore(feed, exploreBand),
            pulseBeforeFeed: isAfter(pulseBand, feed),
            feedInsideExplore: Boolean(exploreBand?.contains(feed)),
            expectedMode: currentMode,
        };
    }, mode);

    expect(order.feedExists, `${label} should render the main community feed`).toBe(true);

    if (mode === 'sparse') {
        expect(order.feedBeforePulse, `${label} should keep the feed ahead of pulse rails in sparse mode`).toBe(true);
        expect(order.feedBeforeExplore, `${label} should keep the feed ahead of explore rails in sparse mode`).toBe(true);
    } else {
        expect(order.pulseExists, `${label} should expose a pulse band in active mode`).toBe(true);
        expect(order.exploreExists, `${label} should expose an explore band in active mode`).toBe(true);
        expect(order.pulseBeforeFeed, `${label} should place the pulse band before the main feed in active mode`).toBe(true);
        expect(order.feedInsideExplore, `${label} should keep the feed inside the explore band in active mode`).toBe(true);
    }
}

async function captureCommunityScenario(
    page: Page,
    fixture: Awaited<ReturnType<typeof seedCommunityVisualFixture>>,
    mode: CommunityVisualFixtureMode,
    viewport: {
        readonly name: string;
        readonly size: {
            readonly width: number;
            readonly height: number;
        };
    },
    screenshotDir: string,
) {
    await page.setViewportSize(viewport.size);
    const hubHref = mode === 'sparse' ? fixture.sparseHubHref : '/community';

    await page.goto(hubHref);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-community-section="squad-board"]')).toBeVisible();
    await expect(page.locator('#community-feed')).toBeVisible();
    await expect(
        page.locator('#community-feed').getByRole('link', { name: /Spray Doctor/i }).first(),
    ).toBeVisible();
    await expectCommunityFeedOrder(page, mode, `/community ${mode} ${viewport.name}`);
    await expectNoHorizontalOverflow(page, `/community ${mode} ${viewport.name}`);
    await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `community-${mode}-${viewport.name}.png`),
    });

    await page.goto(`/community/users/${fixture.aceAuthor.slug}`);
    await page.waitForLoadState('networkidle');
    await expect(
        page.getByRole('heading', { level: 1, name: fixture.aceAuthor.displayName }),
    ).toBeVisible();
    await expect(page.getByText('Meu Perfil bio with real setup context.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Como esse jogador configura o jogo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mouse e sensor' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mousepad e grip' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sens do PUBG' })).toBeVisible();
    await expect(page.getByText('Razer Viper V3 Pro')).toBeVisible();
    await expect(page.getByText('Zowie G-SR-SE')).toBeVisible();
    await expectNoHorizontalOverflow(page, `/community/users/[slug] ${mode} ${viewport.name}`);
    await page.screenshot({
        fullPage: true,
        path: path.join(screenshotDir, `community-profile-${mode}-${viewport.name}.png`),
    });
}

test.describe('Community visual verification', () => {
    test.describe.configure({ mode: 'serial' });

    test('captures desktop and mobile community screenshots without console errors or overflow', async ({
        page,
    }) => {
        const consoleErrors: string[] = [];
        const screenshotDir = path.resolve(process.cwd(), 'output', 'community-visual-check');
        mkdirSync(screenshotDir, { recursive: true });

        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });

        try {
            const viewports = [
                {
                    name: 'desktop',
                    size: { width: 1440, height: 900 },
                },
                {
                    name: 'mobile',
                    size: { width: 390, height: 844 },
                },
            ] as const;
            const scenarios = [
                { mode: 'active' as const },
                { mode: 'sparse' as const },
            ] as const;

            for (const scenario of scenarios) {
                const fixture = await seedCommunityVisualFixture(scenario.mode);

                try {
                    for (const viewport of viewports) {
                        await captureCommunityScenario(
                            page,
                            fixture,
                            scenario.mode,
                            viewport,
                            screenshotDir,
                        );
                    }
                } finally {
                    await fixture.cleanup();
                }
            }

            expect(consoleErrors, 'community visual pass should have no console errors').toEqual([]);
        } finally {
            // no-op: fixtures are cleaned per scenario above
        }
    });
});
