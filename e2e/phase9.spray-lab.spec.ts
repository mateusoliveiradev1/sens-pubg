import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

import { buildCoachPlan } from '../src/core/coach-plan-builder';
import { createAnalysisResultFixture } from '../src/core/coach-test-fixtures';
import { calculateSprayLabFidelity } from '../src/core/spray-lab-fidelity';
import { buildSprayLabBenchmarkSnapshot, buildSprayLabIndexSnapshot } from '../src/core/spray-lab-scoring';
import { createSprayLabSessionFromProtocol } from '../src/core/spray-lab-session';
import type {
    AnalysisResult,
    PrecisionTrendSummary,
    SprayLabSessionEvent,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
} from '../src/types/engine';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

function precisionTrend(): PrecisionTrendSummary {
    return {
        label: 'in_validation',
        evidenceLevel: 'moderate',
        compatibleCount: 1,
        baseline: null as never,
        current: null as never,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.82,
        coverage: 0.84,
        nextValidationHint: 'Grave validacao compativel mantendo arma, mira, distancia, postura e sensibilidade.',
    };
}

function createStoredAnalysisResult(id: string): AnalysisResult {
    const base = createAnalysisResultFixture({
        id,
        timestamp: new Date('2026-05-08T12:00:00.000Z'),
        patchVersion: '41.1',
        mastery: {
            actionState: 'testable',
            actionLabel: 'Testavel',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: 76,
            mechanicalScore: 78,
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
            reasons: ['Leitura testavel para bloco controlado.'],
            blockedRecommendations: [],
        },
        precisionTrend: precisionTrend(),
    });
    const coachPlan = buildCoachPlan({ analysisResult: base });

    return {
        ...base,
        coachPlan,
        coachDecisionSnapshot: {
            tier: coachPlan.tier,
            primaryFocusArea: coachPlan.primaryFocus.area,
            primaryFocusTitle: coachPlan.primaryFocus.title,
            secondaryFocusAreas: coachPlan.secondaryFocuses.map((focus) => focus.area),
            protocolId: coachPlan.completeProtocol?.id ?? coachPlan.actionProtocols[0]?.id ?? 'protocol',
            validationTarget: coachPlan.nextBlock.checks[0]?.target ?? 'validar contexto compativel',
            memorySummary: 'Memoria em validacao controlada.',
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
                    summary: 'Sem outcome tecnico confirmado.',
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
                    summary: 'Sem fallback global.',
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
            createdAt: '2026-05-08T12:00:00.000Z',
        },
    };
}

function completeLabSession(
    base: SprayLabSessionSnapshot,
): {
    readonly session: SprayLabSessionSnapshot;
    readonly events: readonly SprayLabSessionEvent[];
} {
    const eventBase = '2026-05-08T12';
    const events: readonly SprayLabSessionEvent[] = [
        { id: `${base.id}:start`, sessionId: base.id, type: 'start', occurredAt: `${eventBase}:01:00.000Z` },
        { id: `${base.id}:ready`, sessionId: base.id, type: 'ready', occurredAt: `${eventBase}:02:00.000Z` },
    ];
    const completed: SprayLabSessionSnapshot = {
        ...base,
        status: 'completed',
        act: 'validar_clip_compativel',
        stepState: 'validar_clip',
        completedReps: base.totalReps,
        completedSprays: base.totalSprays,
        blocks: base.blocks.map((block) => ({
            ...block,
            completedReps: block.repCount,
            completedSprays: block.repCount * block.spraysPerRep,
        })),
        eventIds: events.map((event) => event.id),
        validationStatus: 'pending',
        updatedAt: '2026-05-08T12:20:00.000Z',
    };
    const fidelity = calculateSprayLabFidelity(completed, events);
    const index = buildSprayLabIndexSnapshot({
        session: completed,
        fidelity,
        validationStatus: 'pending',
        precisionTrend: precisionTrend(),
        createdAt: '2026-05-08T12:20:00.000Z',
    });
    const validationLink: SprayLabValidationLink = {
        version: 'spray-lab-v1',
        id: randomUUID(),
        labSessionId: completed.id,
        baseAnalysisId: completed.baseAnalysisId,
        contextKey: completed.contextKey,
        targetCopy: completed.protocol.validation.nextClipCopy,
        status: 'pending',
        confirmedVariables: true,
        blockers: [],
        createdAt: '2026-05-08T12:21:00.000Z',
        updatedAt: '2026-05-08T12:21:00.000Z',
    };

    return {
        events,
        session: {
            ...completed,
            fidelity,
            index,
            validationLink,
        },
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

async function seedPhase9Fixture() {
    const [{ db }, schema] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const suffix = randomUUID();
    const user = {
        id: randomUUID(),
        email: `phase9-spray-lab-${suffix}@example.com`,
        name: `Phase 9 ${suffix.slice(0, 8)}`,
    };
    const analysisSessionId = randomUUID();
    const result = createStoredAnalysisResult(analysisSessionId);
    const protocol = result.coachPlan?.completeProtocol;

    if (!protocol) {
        throw new Error('Phase 9 fixture needs a complete protocol.');
    }

    const labBase = createSprayLabSessionFromProtocol({
        protocol,
        sessionId: randomUUID(),
        baseAnalysisId: analysisSessionId,
        createdAt: '2026-05-08T12:00:00.000Z',
    });
    const { session: labSession, events } = completeLabSession(labBase);
    const benchmark = buildSprayLabBenchmarkSnapshot({
        session: labSession,
        index: labSession.index!,
        createdAt: '2026-05-08T12:22:00.000Z',
    });

    await db.insert(schema.users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
    });
    await db.insert(schema.playerProfiles).values({
        userId: user.id,
        mouseModel: 'Logitech G Pro',
        mouseSensor: 'Hero',
        mouseDpi: 800,
        mousePollingRate: 1000,
        mouseWeight: 63,
        mouseLod: 1,
        mousepadModel: 'Control Pad',
        mousepadWidth: 45,
        mousepadHeight: 40,
        mousepadType: 'control',
        mousepadMaterial: 'cloth',
        gripStyle: 'claw',
        playStyle: 'arm',
        monitorResolution: '1920x1080',
        monitorRefreshRate: 240,
        monitorPanel: 'ips',
        generalSens: 50,
        adsSens: 47,
        scopeSens: { 'red-dot': 47, '3x': 45, '4x': 43 },
        fov: 103,
        verticalMultiplier: 1,
        mouseAcceleration: false,
        armLength: 'medium',
        deskSpace: 55,
        bio: null,
        twitter: null,
        twitch: null,
        updatedAt: new Date('2026-05-08T12:00:00.000Z'),
    });
    await db.insert(schema.analysisSessions).values({
        id: analysisSessionId,
        userId: user.id,
        weaponId: 'beryl-m762',
        scopeId: 'red-dot',
        patchVersion: '41.1',
        stance: 'standing',
        attachments: {
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'none',
        },
        distance: 30,
        stabilityScore: 76,
        verticalControl: 0.68,
        horizontalNoise: 2.4,
        recoilResponseMs: 144,
        driftBias: { direction: 'neutral', magnitude: 0.2 },
        consistencyScore: 74,
        diagnoses: ['underpull'],
        fullResult: result as unknown as Record<string, unknown>,
        sprayScore: 72,
        createdAt: new Date('2026-05-08T12:00:00.000Z'),
    });
    await db.insert(schema.sprayLabSessions).values({
        id: labSession.id,
        userId: user.id,
        baseAnalysisSessionId: analysisSessionId,
        protocolRevisionId: null,
        protocolId: labSession.protocolId,
        laneId: labSession.lane.id,
        contextKey: labSession.contextKey,
        status: labSession.status,
        act: labSession.act,
        stepState: labSession.stepState,
        evidenceLevel: labSession.index!.evidenceLevel,
        fidelityTier: labSession.fidelity!.tier,
        validationStatus: labSession.validationStatus,
        snapshot: labSession,
        payload: {},
        createdAt: new Date(labSession.createdAt),
        updatedAt: new Date(labSession.updatedAt),
        completedAt: new Date(labSession.updatedAt),
    });
    for (const event of events) {
        await db.insert(schema.sprayLabSessionEvents).values({
            userId: user.id,
            labSessionId: labSession.id,
            eventId: event.id,
            eventType: event.type,
            act: labSession.act,
            stepState: labSession.stepState,
            occurredAt: new Date(event.occurredAt),
            payload: { event },
        });
    }
    await db.insert(schema.sprayLabBenchmarkSnapshots).values({
        userId: user.id,
        labSessionId: labSession.id,
        baseAnalysisSessionId: analysisSessionId,
        protocolRevisionId: null,
        protocolId: benchmark.protocolId,
        laneId: benchmark.laneId,
        contextKey: benchmark.contextKey,
        evidenceLevel: benchmark.evidenceLevel,
        fidelityTier: benchmark.fidelityTier,
        validationStatus: benchmark.validationStatus,
        eligibleForReleaseBenchmark: benchmark.eligibleForReleaseBenchmark,
        snapshot: benchmark,
        createdAt: new Date(benchmark.createdAt),
    });
    await db.insert(schema.sprayLabValidationLinks).values({
        id: labSession.validationLink!.id,
        userId: user.id,
        labSessionId: labSession.id,
        baseAnalysisSessionId: analysisSessionId,
        validationAnalysisSessionId: null,
        contextKey: labSession.contextKey,
        status: labSession.validationLink!.status,
        confirmedVariables: labSession.validationLink!.confirmedVariables,
        payload: labSession.validationLink!,
        createdAt: new Date(labSession.validationLink!.createdAt),
        updatedAt: new Date(labSession.validationLink!.updatedAt),
    });

    return {
        user,
        analysisSessionId,
        labSessionId: labSession.id,
        async cleanup() {
            await db.delete(schema.sprayLabValidationLinks).where(eq(schema.sprayLabValidationLinks.labSessionId, labSession.id));
            await db.delete(schema.sprayLabBenchmarkSnapshots).where(eq(schema.sprayLabBenchmarkSnapshots.labSessionId, labSession.id));
            await db.delete(schema.sprayLabSessionEvents).where(eq(schema.sprayLabSessionEvents.labSessionId, labSession.id));
            await db.delete(schema.sprayLabSessions).where(eq(schema.sprayLabSessions.id, labSession.id));
            await db.delete(schema.analysisSessions).where(eq(schema.analysisSessions.id, analysisSessionId));
            await db.delete(schema.playerProfiles).where(eq(schema.playerProfiles.userId, user.id));
            await db.delete(schema.users).where(eq(schema.users.id, user.id));
        },
    };
}

async function expectNoHorizontalOverflow(page: Page) {
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

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 9 Spray Lab browser proof ${label}`, () => {
        test.use({ viewport });

        test('shows Lab runner continuity across Analyze, dashboard and history', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated Phase 9 fixture.');
            const fixture = await seedPhase9Fixture();

            try {
                await signInAsSeededUser(page, fixture.user);

                await page.goto(`/spray-lab?labSessionId=${fixture.labSessionId}`);
                await expect(page.getByRole('heading', { name: /validar clip/i }).first()).toBeVisible();
                await expect(page.getByLabel('Cockpit Spray Lab')).toBeVisible();
                await expect(page.getByRole('button', { name: /abrir validacao/i })).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-spray-lab-runner-${label}.png`,
                });

                await page.goto(`/analyze?mode=validation&labSessionId=${fixture.labSessionId}&baseSessionId=${fixture.analysisSessionId}`);
                await expect(page.getByText('Validacao Spray Lab')).toBeVisible();
                await expect(page.getByText(/Contexto carregado/)).toBeVisible();
                await expect(page.getByLabel(/Confirmo que as variaveis/)).toBeChecked();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-analyze-validation-${label}.png`,
                });

                await page.goto('/dashboard');
                await expect(page.getByRole('heading', { name: /Dashboard de performance/i }).first()).toBeVisible();
                await expect(page.getByText(/forte \/ benchmark provisorio/i)).toBeVisible();
                await expect(page.getByText(/Validacao compativel pendente/i)).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-dashboard-${label}.png`,
                });

                await page.goto('/history');
                await expect(page.getByRole('heading', { name: /Historico de Analises/i })).toBeVisible();
                await expect(page.getByText(/Spray Lab:/).first()).toBeVisible();
                await expect(page.getByText('Indice Lab')).toBeVisible();
                await expect(page.getByText('Validacao Lab')).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-history-${label}.png`,
                });

                await page.goto(`/history/${fixture.analysisSessionId}`);
                await expect(page.locator('#history-spray-lab-audit')).toBeVisible();
                await expect(page.locator('#history-spray-lab-audit').getByText(/provisorio 100\/100/i)).toBeVisible();
                await expect(page.locator('#history-spray-lab-audit').getByText(/Validacao compativel pendente/i)).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-history-detail-${label}.png`,
                });

                await page.goto(`/spray-lab?labSessionId=${randomUUID()}`);
                await expect(page.getByLabel('Reparo do Spray Lab')).toBeVisible();
                await expect(page.getByRole('heading', { name: /Spray Lab indisponivel/i })).toBeVisible();
                await expect(page.getByRole('heading', { name: /Sessao nao encontrada/i })).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase9-repair-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });
    });
}
