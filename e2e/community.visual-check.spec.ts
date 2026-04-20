import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import { config as loadEnv } from 'dotenv';
import { expect, test, type Page } from '@playwright/test';

loadEnv({ path: '.env.local' });

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

async function seedCommunityVisualFixture() {
    const [{ db }, schema] = await Promise.all([import('../src/db'), import('../src/db/schema')]);
    const {
        analysisSessions,
        communityPostAnalysisSnapshots,
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
        {
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
        },
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
            slug: berylPostSlug,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: `Beryl anchor fundamentals ${suffix}`,
            excerpt: 'Segundo seed publico para manter o board vivo e com tendencias.',
            bodyMarkdown: 'Second visual verification post',
            sourceAnalysisSessionId: berylAnalysisSessionId,
            primaryWeaponId: 'beryl-m762',
            primaryPatchVersion: '35.1',
            primaryDiagnosisKey: 'horizontal_instability',
            copySensPreset: copySensPreset as never,
            publishedAt: new Date('2026-04-18T14:00:00.000Z'),
        },
    ]);

    await db.insert(communityPostAnalysisSnapshots).values([
        {
            postId: acePostId,
            analysisSessionId: aceAnalysisSessionId,
            analysisResultId: `visual-analysis-ace-${suffix}`,
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
            analysisResultId: `visual-analysis-beryl-${suffix}`,
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
    ]);

    return {
        aceAuthor,
        async cleanup() {
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, acePostId));
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.postId, berylPostId));
            await db.delete(communityPosts).where(eq(communityPosts.id, acePostId));
            await db.delete(communityPosts).where(eq(communityPosts.id, berylPostId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, aceAnalysisSessionId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, berylAnalysisSessionId));
            await db.delete(playerProfiles).where(eq(playerProfiles.userId, aceAuthor.userId));
            await db.delete(communityProfiles).where(eq(communityProfiles.id, aceAuthor.profileId));
            await db.delete(communityProfiles).where(eq(communityProfiles.id, berylAuthor.profileId));
            await db.delete(users).where(eq(users.id, aceAuthor.userId));
            await db.delete(users).where(eq(users.id, berylAuthor.userId));
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

test.describe('Community visual verification', () => {
    test.describe.configure({ mode: 'serial' });

    test('captures desktop and mobile community screenshots without console errors or overflow', async ({
        page,
    }) => {
        const fixture = await seedCommunityVisualFixture();
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

            for (const viewport of viewports) {
                await page.setViewportSize(viewport.size);

                await page.goto('/community');
                await page.waitForLoadState('networkidle');
                await expect(page.locator('[data-community-section="squad-board"]')).toBeVisible();
                await expect(page.locator('#community-feed')).toBeVisible();
                await expect(
                    page.locator('#community-feed').getByRole('link', { name: /Spray Doctor/i }).first(),
                ).toBeVisible();
                await expectNoHorizontalOverflow(page, `/community ${viewport.name}`);
                await page.screenshot({
                    fullPage: true,
                    path: path.join(screenshotDir, `community-${viewport.name}.png`),
                });

                await page.goto(`/community/users/${fixture.aceAuthor.slug}`);
                await page.waitForLoadState('networkidle');
                await expect(
                    page.getByRole('heading', { level: 1, name: fixture.aceAuthor.displayName }),
                ).toBeVisible();
                await expect(page.getByText('Meu Perfil bio with real setup context.')).toBeVisible();
                await expect(page.getByRole('heading', { name: 'Aim setup' })).toBeVisible();
                await expect(page.getByRole('heading', { name: 'Surface/grip' })).toBeVisible();
                await expect(page.getByRole('heading', { name: 'PUBG core' })).toBeVisible();
                await expect(page.getByText('Razer Viper V3 Pro')).toBeVisible();
                await expect(page.getByText('Zowie G-SR-SE')).toBeVisible();
                await expectNoHorizontalOverflow(page, `/community/users/[slug] ${viewport.name}`);
                await page.screenshot({
                    fullPage: true,
                    path: path.join(screenshotDir, `community-profile-${viewport.name}.png`),
                });
            }

            expect(consoleErrors, 'community visual pass should have no console errors').toEqual([]);
        } finally {
            await fixture.cleanup();
        }
    });
});
