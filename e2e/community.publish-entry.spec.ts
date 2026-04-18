/**
 * E2E: Community publish entry from history detail
 * Confirma que o historico expõe um CTA valido para publicar na comunidade
 * apenas quando o usuario tem acesso valido ao detalhe da analise.
 */

import { randomUUID } from 'node:crypto';

import { test, expect, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

import type { AnalysisResult } from '../src/types/engine';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run community publish entry e2e tests.');
}

function createStoredAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-e2e',
        timestamp: new Date('2026-04-18T18:45:00.000Z'),
        patchVersion: '35.1',
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
                    scopes: [],
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

async function createSessionToken(user: { id: string; email: string; name: string }) {
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

async function seedHistoryDetailFixture() {
    const [{ db }, { users, analysisSessions }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);

    const suffix = randomUUID();
    const userId = randomUUID();
    const sessionId = randomUUID();
    const userEmail = `community-entry-${suffix}@example.com`;
    const userName = `Community Entry ${suffix.slice(0, 8)}`;

    await db.insert(users).values({
        id: userId,
        name: userName,
        email: userEmail,
        image: '',
    });

    await db.insert(analysisSessions).values({
        id: sessionId,
        userId,
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        patchVersion: '35.1',
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
        diagnoses: ['horizontal_instability'],
        fullResult: createStoredAnalysisResult() as unknown as Record<string, unknown>,
        sprayScore: 86,
    });

    return {
        user: {
            id: userId,
            email: userEmail,
            name: userName,
        },
        sessionId,
        async cleanup() {
            await db.delete(users).where(eq(users.id, userId));
        },
    };
}

async function signInAsSeededUser(page: Page, user: { id: string; email: string; name: string }) {
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

test.describe('Community publish entry in history detail', () => {
    test('shows a publish CTA for an authenticated user on the history detail page', async ({ page }) => {
        const fixture = await seedHistoryDetailFixture();

        try {
            await signInAsSeededUser(page, fixture.user);
            await page.goto(`/history/${fixture.sessionId}`);

            await expect(page.getByRole('link', { name: /voltar/i })).toBeVisible();
            await expect(page.getByRole('heading', { level: 1, name: /beryl-m762/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /publicar na comunidade/i })).toBeVisible();
        } finally {
            await fixture.cleanup();
        }
    });

    test('does not expose the publish CTA to a user without access to the history detail page', async ({ page }) => {
        const fixture = await seedHistoryDetailFixture();

        try {
            await page.goto(`/history/${fixture.sessionId}`);

            await page.waitForURL('**/login**');
            await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhistory/);
            await expect(page.getByRole('button', { name: /publicar na comunidade/i })).toHaveCount(0);
        } finally {
            await fixture.cleanup();
        }
    });
});
