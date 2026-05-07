import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

import type { AnalysisResult, CoachPlan } from '../src/types/engine';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

function createCoachPlan(): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Plano salvo para validar controle vertical.',
        primaryFocus: {
            id: 'vertical-focus',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Sustain vertical ainda decide o spray.',
            priorityScore: 0.84,
            severity: 4,
            confidence: 0.82,
            coverage: 0.84,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [{
            id: 'vertical-control-drill-protocol',
            kind: 'drill',
            instruction: 'Faca tres sprays comparaveis.',
            expectedEffect: 'Reduzir erro vertical sem trocar variavel.',
            risk: 'low',
            applyWhen: 'Quando cobertura e confianca ficarem acima de 80%.',
        }],
        nextBlock: {
            title: 'Bloco vertical curto',
            durationMinutes: 12,
            steps: ['Faca 3 sprays comparaveis.', 'Mantenha variaveis fixas.'],
            checks: [{
                label: 'Validacao vertical',
                target: 'reduzir erro vertical',
                minimumCoverage: 0.8,
                minimumConfidence: 0.75,
                successCondition: 'Controle melhora sem piorar ruido.',
                failCondition: 'Controle nao melhora ou captura cai.',
            }],
        },
        stopConditions: ['Pare se a captura cair.'],
        adaptationWindowDays: 3,
        llmRewriteAllowed: false,
    };
}

function createStoredAnalysisResult(): AnalysisResult {
    const coachPlan = createCoachPlan();

    const storedResult: AnalysisResult = {
        id: 'phase7-analysis',
        timestamp: new Date('2026-05-06T12:00:00.000Z'),
        patchVersion: '36.1',
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 32,
            durationMs: 2800 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.9,
            framesTracked: 30,
            framesLost: 2,
            visibleFrames: 30,
            framesProcessed: 32,
            statusCounts: {
                tracked: 30,
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
            stabilityScore: 82 as never,
            verticalControlIndex: 1.04,
            horizontalNoiseIndex: 1.8,
            angularErrorDegrees: 0.42,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 35,
            initialRecoilResponseMs: 148 as never,
            driftDirectionBias: { direction: 'left', magnitude: 0.1 },
            consistencyScore: 80 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.04,
            fatigueVCI: 1.07,
            burstHNI: 1.7,
            sustainedHNI: 1.8,
            fatigueHNI: 1.95,
            sprayScore: 84,
        },
        diagnoses: [],
        sensitivity: {
            profiles: [{
                type: 'balanced',
                label: 'Balanced',
                description: 'Balanced recommendation',
                general: 50 as never,
                ads: 47 as never,
                scopes: [],
                cmPer360: 41 as never,
            }],
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'strong',
            confidenceScore: 0.84,
            reasoning: 'Stable sample',
            suggestedVSM: 1.02,
        },
        coaching: [],
        mastery: {
            actionState: 'testable',
            actionLabel: 'Testavel',
            actionableScore: 74,
            mechanicalScore: 78,
            mechanicalLevelLabel: 'Avancado',
            pillars: {
                control: 74,
                consistency: 80,
                confidence: 84,
                clipQuality: 86,
            },
            evidence: {
                coverage: 0.84,
                confidence: 0.86,
                visibleFrames: 30,
                lostFrames: 2,
                framesProcessed: 32,
                sampleSize: 24,
                qualityScore: 86,
                usableForAnalysis: true,
            },
            reasons: ['Leitura testavel.'],
            blockedRecommendations: [],
        },
        coachPlan,
        coachDecisionSnapshot: {
            tier: 'test_protocol',
            primaryFocusArea: 'vertical_control',
            primaryFocusTitle: 'Controle vertical',
            secondaryFocusAreas: [],
            protocolId: 'vertical-control-drill-protocol',
            validationTarget: 'reduzir erro vertical',
            memorySummary: 'Memoria compativel curta.',
            outcomeMemory: {
                activeLayer: 'none',
                strictCompatible: {
                    source: 'strict_compatible',
                    outcomeCount: 0,
                    pendingCount: 0,
                    neutralCount: 0,
                    weakSelfReportCount: 0,
                    confirmedCount: 0,
                    invalidCount: 0,
                    conflictCount: 0,
                    repeatedFailureCount: 0,
                    staleOutcomeCount: 0,
                    technicalEvidenceCount: 0,
                    focusAreas: [],
                    confidence: 0,
                    summary: 'Sem outcome compativel.',
                },
                globalFallback: {
                    source: 'global_fallback',
                    outcomeCount: 0,
                    pendingCount: 0,
                    neutralCount: 0,
                    weakSelfReportCount: 0,
                    confirmedCount: 0,
                    invalidCount: 0,
                    conflictCount: 0,
                    repeatedFailureCount: 0,
                    staleOutcomeCount: 0,
                    technicalEvidenceCount: 0,
                    focusAreas: [],
                    confidence: 0,
                    summary: 'Sem outcome global.',
                },
                pendingCount: 0,
                neutralCount: 0,
                confirmedCount: 0,
                invalidCount: 0,
                conflictCount: 0,
                repeatedFailureCount: 0,
                staleOutcomeCount: 0,
                confidence: 0,
                summary: 'Sem outcome compativel.',
            },
            outcomeEvidenceState: 'none',
            conflicts: [],
            blockerReasons: [],
            createdAt: '2026-05-06T12:00:00.000Z',
        },
    };

    return {
        ...storedResult,
        subSessions: [{
            ...storedResult,
            id: 'phase7-analysis-sub-1',
            trajectory: {
                ...storedResult.trajectory,
                durationMs: 1200 as never,
            },
        }],
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

async function seedHistoryFixture() {
    const [{ db }, { users, analysisSessions }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const suffix = randomUUID();
    const userId = randomUUID();
    const sessionId = randomUUID();
    const user = {
        id: userId,
        email: `phase7-history-${suffix}@example.com`,
        name: `Phase 7 ${suffix.slice(0, 8)}`,
    };

    await db.insert(users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
    });

    await db.insert(analysisSessions).values({
        id: sessionId,
        userId,
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
        stabilityScore: 82,
        verticalControl: 1.04,
        horizontalNoise: 0.18,
        recoilResponseMs: 148,
        driftBias: { direction: 'left', magnitude: 0.1 },
        consistencyScore: 80,
        diagnoses: [],
        fullResult: createStoredAnalysisResult() as unknown as Record<string, unknown>,
        sprayScore: 84,
    });

    return {
        user,
        sessionId,
        async cleanup() {
            await db.delete(analysisSessions).where(eq(analysisSessions.id, sessionId));
            await db.delete(users).where(eq(users.id, user.id));
        },
    };
}

async function signInAsSeededUser(page: Page, user: { id: string; email: string; name: string }) {
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

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 7 dashboard/history ${label}`, () => {
        test.use({ viewport });

        test('dashboard command surface renders without horizontal overflow', async ({ page }) => {
            await page.goto('/dashboard');
            await expect(
                page.getByRole('heading', { name: /Dashboard de performance|Nenhuma linha ativa ainda/i })
            ).toBeVisible();
            await expect(page.getByLabel('Loop Sens PUBG')).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-dashboard-${label}.png`,
            });
        });

        test('history audit timeline renders without horizontal overflow', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated history fixture.');
            const fixture = await seedHistoryFixture();

            try {
                await signInAsSeededUser(page, fixture.user);
                await page.goto('/history');
                await expect(page.getByRole('heading', { name: /Historico de Analises/i })).toBeVisible();
                await expect(page.getByLabel('Loop Sens PUBG')).toBeVisible();
                await expect(page.getByText(/Beryl M762|beryl-m762/i).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase7-history-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });

        test('history detail audit route renders without horizontal overflow', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated history detail fixture.');
            const fixture = await seedHistoryFixture();

            try {
                await signInAsSeededUser(page, fixture.user);
                await page.goto(`/history/${fixture.sessionId}`);
                await expect(page.getByRole('heading', { level: 1, name: /beryl-m762/i })).toBeVisible();
                await expect(page.getByText('Analise salva', { exact: true })).toBeVisible();
                await expect(page.getByRole('banner')).toBeVisible();
                const analysisNav = page.getByRole('navigation', { name: /Navegacao da analise/i });
                await expect(analysisNav).toBeVisible();
                await expect(analysisNav.getByRole('link', { name: /Historico/i })).toBeVisible();
                await expect(page.getByRole('button', { name: /Publicar analise/i })).toBeVisible();
                await expect(analysisNav.getByRole('link', { name: /^Comunidade$/i })).toBeVisible();
                await expect(page.getByRole('heading', { name: /Auditoria do coach/i })).toBeVisible();
                await expect(page.getByText('Relatorio de spray')).toHaveCount(0);
                await expect(page.getByLabel('Guia de captura e estado Pro')).toHaveCount(0);
                await expect(page.getByRole('heading', { name: /Sprays analisados/i })).toHaveCount(0);
                await expectNoHorizontalOverflow(page);
            } finally {
                await fixture.cleanup();
            }
        });
    });
}
