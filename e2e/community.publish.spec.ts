/**
 * E2E: Publish analysis into the community flow
 * Confirma que o usuario consegue criar o rascunho da comunidade
 * a partir do historico e seguir para abrir o post criado.
 */

import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { and, eq } from 'drizzle-orm';

import type { AnalysisResult } from '../src/types/engine';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run community publish e2e tests.');
}

interface SeededUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
}

function createStoredAnalysisResult(): AnalysisResult {
    return {
        id: `analysis-${randomUUID().slice(0, 8)}`,
        timestamp: new Date('2026-04-19T18:45:00.000Z'),
        patchVersion: '36.1',
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.93,
            framesTracked: 28,
            framesLost: 2,
            visibleFrames: 28,
            framesProcessed: 30,
            statusCounts: {
                tracked: 28,
                occluded: 0,
                lost: 2,
                uncertain: 0,
            },
        },
        loadout: {
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'heavy_stock',
        },
        metrics: {
            stabilityScore: 84 as never,
            verticalControlIndex: 1.04,
            horizontalNoiseIndex: 1.92,
            angularErrorDegrees: 0.5,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 35,
            initialRecoilResponseMs: 148 as never,
            driftDirectionBias: { direction: 'left', magnitude: 0.12 },
            consistencyScore: 81 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.07,
            fatigueVCI: 1.11,
            burstHNI: 1.8,
            sustainedHNI: 1.95,
            fatigueHNI: 2.05,
            sprayScore: 86,
        },
        diagnoses: [
            {
                type: 'horizontal_drift',
                severity: 3,
                description: 'A linha de spray esta desviando para a esquerda.',
                cause: 'Compensacao lateral excessiva.',
                remediation: 'Reduzir a forca lateral e validar novo bloco.',
                confidence: 0.82,
                bias: {
                    direction: 'left',
                    magnitude: 0.12,
                },
            },
        ],
        sensitivity: {
            profiles: [
                {
                    type: 'balanced',
                    label: 'Balanced',
                    description: 'Balanced recommendation',
                    general: 50 as never,
                    ads: 47 as never,
                    scopes: [
                        {
                            scopeName: '1x',
                            current: 48,
                            recommended: 46,
                            changePercent: -4.16,
                        },
                    ],
                    cmPer360: 41 as never,
                },
            ],
            recommended: 'balanced',
            tier: 'apply_ready',
            evidenceTier: 'strong',
            confidenceScore: 0.84,
            reasoning: 'Stable sample',
            suggestedVSM: 1.02,
        },
        coaching: [],
        coachPlan: {
            warmup: [],
            drills: [],
            focusPoints: [],
        } as never,
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
            picture: null,
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

async function seedCommunityPublishFixture() {
    const [{ db }, schema] = await Promise.all([import('../src/db'), import('../src/db/schema')]);
    const { analysisSessions, communityProfiles, communityPostAnalysisSnapshots, communityPosts, users } =
        schema;

    const suffix = randomUUID().slice(0, 8);
    const user: SeededUser = {
        id: randomUUID(),
        email: `community-publish-${suffix}@example.com`,
        name: `Community Publish ${suffix}`,
    };
    const analysisSessionId = randomUUID();
    const profileId = randomUUID();
    const profileSlug = `community-publisher-${suffix}`;
    const expectedSlug = `${profileSlug}-${analysisSessionId}`;

    await db.insert(users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
    });

    await db.insert(communityProfiles).values({
        id: profileId,
        userId: user.id,
        slug: profileSlug,
        displayName: `Coach ${suffix}`,
        links: [],
        visibility: 'public',
        creatorProgramStatus: 'none',
    });

    await db.insert(analysisSessions).values({
        id: analysisSessionId,
        userId: user.id,
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        patchVersion: '36.1',
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
        diagnoses: ['horizontal_drift'],
        fullResult: createStoredAnalysisResult() as unknown as Record<string, unknown>,
        sprayScore: 86,
    });

    return {
        user,
        analysisSessionId,
        expectedSlug,
        async cleanup() {
            await db.delete(communityPosts).where(eq(communityPosts.authorId, user.id));
            await db
                .delete(communityPostAnalysisSnapshots)
                .where(eq(communityPostAnalysisSnapshots.analysisSessionId, analysisSessionId));
            await db.delete(analysisSessions).where(eq(analysisSessions.id, analysisSessionId));
            await db.delete(users).where(eq(users.id, user.id));
        },
    };
}

test.describe('Community publish flow', () => {
    test('creates a draft from history detail and lets the author open the created post', async ({
        page,
    }) => {
        const fixture = await seedCommunityPublishFixture();

        try {
            await signInAsSeededUser(page, fixture.user);
            await page.goto(`/history/${fixture.analysisSessionId}`);

            await page.getByRole('button', { name: /publicar na comunidade/i }).click();

            await expect(page.getByText(/rascunho criado na comunidade/i)).toBeVisible();
            await expect(page.getByRole('button', { name: /rascunho criado/i })).toBeDisabled();

            await expect
                .poll(async () => {
                    const [{ db }, { communityPosts }] = await Promise.all([
                        import('../src/db'),
                        import('../src/db/schema'),
                    ]);

                    const [storedPost] = await db
                        .select({
                            id: communityPosts.id,
                            slug: communityPosts.slug,
                            status: communityPosts.status,
                            title: communityPosts.title,
                        })
                        .from(communityPosts)
                        .where(
                            and(
                                eq(communityPosts.authorId, fixture.user.id),
                                eq(communityPosts.sourceAnalysisSessionId, fixture.analysisSessionId),
                            ),
                        )
                        .limit(1);

                    return storedPost ?? null;
                })
                .toEqual(
                    expect.objectContaining({
                        slug: fixture.expectedSlug,
                        status: 'draft',
                        title: 'beryl-m762 - analise de spray',
                    }),
                );

            await expect(page.getByRole('link', { name: /abrir rascunho/i })).toBeVisible();
            await page.getByRole('link', { name: /abrir rascunho/i }).click();

            await expect(page).toHaveURL(`/community/${fixture.expectedSlug}`);
            await expect(page.getByRole('heading', { level: 1, name: /beryl-m762 - analise de spray/i })).toBeVisible();
            await expect(page.getByText(/rascunho/i)).toBeVisible();
            await expect(
                page.getByText(/comentarios liberados apenas quando o post estiver publicado/i),
            ).toBeVisible();
        } finally {
            await fixture.cleanup();
        }
    });
});
