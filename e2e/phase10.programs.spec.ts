import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

import { buildCoachPlan } from '../src/core/coach-plan-builder';
import { createAnalysisResultFixture } from '../src/core/coach-test-fixtures';
import {
    createTrainingProgramCycle,
    trainingProgramReasonCopy,
} from '../src/core/training-programs';
import type {
    AnalysisResult,
    CompleteTrainingProtocol,
    PrecisionTrendSummary,
    SprayLabValidationLink,
    SprayLabValidationStatus,
} from '../src/types/engine';
import type {
    TrainingProgramCheckpoint,
    TrainingProgramCheckpointOutcome,
    TrainingProgramCycleSnapshot,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
    TrainingProgramTransitionEvent,
} from '../src/types/training-programs';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

test.setTimeout(120_000);

interface SeededUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: 'user' | 'admin';
}

interface ProgramStateFixture {
    readonly slug: string;
    readonly expectedText: RegExp;
    readonly cycle: TrainingProgramCycleSnapshot;
}

function precisionTrend(label: PrecisionTrendSummary['label'] = 'in_validation'): PrecisionTrendSummary {
    return {
        label,
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: null,
        current: null,
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.88,
        nextValidationHint: 'Grave validacao compativel mantendo contexto, arma, mira, distancia e sensibilidade.',
    };
}

function createStoredAnalysisResult(id: string): AnalysisResult {
    const base = createAnalysisResultFixture({
        id,
        timestamp: new Date('2026-05-08T13:00:00.000Z'),
        patchVersion: '41.1',
        mastery: {
            actionState: 'testable',
            actionLabel: 'Testavel',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: 78,
            mechanicalScore: 80,
            pillars: {
                control: 75,
                consistency: 81,
                confidence: 84,
                clipQuality: 86,
            },
            evidence: {
                coverage: 0.86,
                confidence: 0.88,
                visibleFrames: 30,
                lostFrames: 2,
                framesProcessed: 32,
                sampleSize: 24,
                qualityScore: 86,
                usableForAnalysis: true,
            },
            reasons: ['Leitura suficiente para Ciclo Pro controlado.'],
            blockedRecommendations: [],
        },
        precisionTrend: precisionTrend(),
    });
    const coachPlan = buildCoachPlan({ analysisResult: base });

    return {
        ...base,
        historySessionId: id,
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
            createdAt: '2026-05-08T13:00:00.000Z',
        },
    };
}

function validationLink(
    cycle: TrainingProgramCycleSnapshot,
    status: SprayLabValidationStatus,
): SprayLabValidationLink {
    return {
        version: 'spray-lab-v1',
        id: randomUUID(),
        labSessionId: randomUUID(),
        baseAnalysisId: cycle.baseAnalysisId ?? 'analysis',
        validationAnalysisId: randomUUID(),
        contextKey: cycle.strictContextKey,
        targetCopy: cycle.strictContextLabel,
        status,
        confirmedVariables: true,
        blockers: [],
        precisionTrend: precisionTrend(status === 'regressao_validada'
            ? 'validated_regression'
            : status === 'sem_mudanca_clara'
                ? 'oscillation'
                : 'validated_progress'),
        createdAt: '2026-05-08T13:30:00.000Z',
        updatedAt: '2026-05-08T13:30:00.000Z',
    };
}

function checkpointFor(
    cycle: TrainingProgramCycleSnapshot,
    status: SprayLabValidationStatus,
    outcome: TrainingProgramCheckpointOutcome,
    state: TrainingProgramState,
    summary: string,
): TrainingProgramCheckpoint {
    const validation = validationLink(cycle, status);
    const evidenceSummary = {
        ...cycle.evidenceSummary,
        validationLink: validation,
        validationStatus: status,
        precisionTrend: validation.precisionTrend,
        confidence: 0.91,
        coverage: 0.9,
        blockers: [],
        summary,
    };

    return {
        id: `${cycle.id}:checkpoint:${outcome}`,
        layer: 'technical_validated',
        weekNumber: 1,
        state,
        outcome,
        createdAt: '2026-05-08T13:35:00.000Z',
        evidenceSummary,
        reasonCodes: [],
        canIncreaseDifficulty: outcome === 'progress_validated',
        nextRecommendation: outcome === 'progress_validated'
            ? 'consolidar'
            : outcome === 'regression_validated'
                ? 'reiniciar_linha'
                : 'consolidar',
        summary,
    };
}

function transitionEvent(
    cycle: TrainingProgramCycleSnapshot,
    toState: TrainingProgramState,
    reasonCodes: readonly TrainingProgramReasonCode[],
): TrainingProgramTransitionEvent {
    return {
        id: randomUUID(),
        cycleId: cycle.id,
        type: reasonCodes.includes('line_restart')
            ? 'line_restarted'
            : reasonCodes.includes('missed_day_reentry')
                ? 'missed_day_reentered'
                : reasonCodes.includes('stale_context')
                    ? 'context_marked_stale'
                    : reasonCodes.includes('discomfort_stop')
                        ? 'discomfort_reported'
                        : reasonCodes.includes('fatigue_reduced_dose')
                            ? 'fatigue_reported'
                            : 'checkpoint_recorded',
        occurredAt: '2026-05-08T13:40:00.000Z',
        fromState: cycle.state,
        toState,
        reasonCodes,
        userVisibleReason: reasonCodes[0]
            ? trainingProgramReasonCopy(reasonCodes[0])
            : 'Ciclo atualizado com evidencia preservada.',
        evidenceRefs: [],
    };
}

function patchCycle(input: {
    readonly base: TrainingProgramCycleSnapshot;
    readonly state: TrainingProgramState;
    readonly slug: string;
    readonly reasonCodes?: readonly TrainingProgramReasonCode[];
    readonly kind?: TrainingProgramCycleSnapshot['kind'];
    readonly recoveryAction?: TrainingProgramRecoveryAction;
    readonly checkpoint?: TrainingProgramCheckpoint;
    readonly completed?: boolean;
    readonly archivedLine?: boolean;
}): TrainingProgramCycleSnapshot {
    const reasonCodes = input.reasonCodes ?? [];
    const updatedAt = `2026-05-08T14:${input.slug.padStart(2, '0').slice(0, 2)}:00.000Z`;
    const nextState = input.state;
    const currentMissionId = input.completed ? null : input.base.currentMissionId;
    const activeLine = input.archivedLine ? {
        lineId: `${input.base.activeLine?.lineId ?? 'line'}:${input.slug}`,
        contextKey: `${input.base.strictContextKey}:${input.slug}`,
        label: `${input.base.strictContextLabel} linha nova`,
        active: true,
        startedAt: updatedAt,
        restartReasonCodes: ['line_restart'] as const,
    } : input.base.activeLine;
    const archivedLines = input.archivedLine ? [
        ...input.base.archivedLines,
        {
            lineId: input.base.activeLine?.lineId ?? 'line:old',
            contextKey: input.base.activeLine?.contextKey ?? input.base.strictContextKey,
            label: `${input.base.strictContextLabel} linha anterior`,
            active: false,
            startedAt: input.base.createdAt,
            archivedAt: updatedAt,
            restartReasonCodes: ['line_restart'] as const,
        },
    ] : input.base.archivedLines;
    const patchedBase = {
        ...input.base,
        kind: input.kind ?? input.base.kind,
        state: nextState,
        updatedAt,
        currentMissionId,
        activeLine,
        archivedLines,
        reasonCodes,
        recoveryAction: input.recoveryAction ?? input.base.recoveryAction,
        nextCta: nextState === 'validacao_pendente'
            ? {
                label: 'Gravar validacao compativel',
                href: '/analyze?mode=validation',
                target: 'analyze_validation' as const,
            }
            : input.base.nextCta,
        weeks: input.base.weeks.map((week, index) => index === 0
            ? {
                ...week,
                state: nextState,
                reasonCodes,
                recoveryAction: input.recoveryAction ?? week.recoveryAction,
                canIncreaseDifficulty: nextState === 'progresso_validado',
                ...(input.completed ? { closedAt: updatedAt } : {}),
            }
            : week),
        checkpoints: input.checkpoint ? [input.checkpoint] : input.base.checkpoints,
    } satisfies TrainingProgramCycleSnapshot;

    return {
        ...patchedBase,
        transitionEvents: reasonCodes.length > 0 || input.checkpoint
            ? [transitionEvent(patchedBase, nextState, reasonCodes)]
            : input.base.transitionEvents,
        ...(input.completed ? { updatedAt } : {}),
    };
}

function createProgramCycle(
    analysisResult: AnalysisResult,
    protocol: CompleteTrainingProtocol,
    now: string,
): TrainingProgramCycleSnapshot {
    return createTrainingProgramCycle({
        analysisResult,
        protocol,
        now,
    });
}

function isoAt(seedOffsetMs: number, minute: number): string {
    return new Date(Date.UTC(2026, 4, 8, 14, 0, 0) + seedOffsetMs + minute * 60_000).toISOString();
}

function createProgramStateFixtures(
    analysisResult: AnalysisResult,
    protocol: CompleteTrainingProtocol,
    seedOffsetMs: number,
): readonly ProgramStateFixture[] {
    const active = createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 30));
    const repairBase = createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 1));
    const progressBase = createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 4));
    const noClearBase = createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 5));
    const regressionBase = createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 6));
    const progressCheckpoint = checkpointFor(
        progressBase,
        'validacao_confirmada',
        'progress_validated',
        'progresso_validado',
        'Checkpoint tecnico com validacao compativel confirmou sinal de progresso sem garantir melhora futura.',
    );
    const noClearCheckpoint = checkpointFor(
        noClearBase,
        'sem_mudanca_clara',
        'no_clear_change',
        'sem_mudanca_clara',
        'Validacao compativel nao mostrou mudanca clara; consolidar antes de trocar variavel.',
    );
    const regressionCheckpoint = checkpointFor(
        regressionBase,
        'regressao_validada',
        'regression_validated',
        'regressao_validada',
        'Validacao compativel confirmou regressao neste contexto; voltar ao baseline confiavel.',
    );

    return [
        {
            slug: 'active',
            expectedText: /linha ativa/i,
            cycle: active,
        },
        {
            slug: 'repair',
            expectedText: /reparo ativo|ciclo de reparo/i,
            cycle: patchCycle({
                base: repairBase,
                state: 'reparando',
                slug: '01',
                kind: 'ciclo_reparo',
                reasonCodes: ['weak_base_evidence'],
                recoveryAction: 'reparar',
            }),
        },
        {
            slug: 'consolidation',
            expectedText: /consolidacao/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 2)),
                state: 'consolidando',
                slug: '02',
                reasonCodes: ['compatible_proof_missing'],
                recoveryAction: 'consolidar',
            }),
        },
        {
            slug: 'validation-pending',
            expectedText: /validacao pendente/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 3)),
                state: 'validacao_pendente',
                slug: '03',
                reasonCodes: ['compatible_proof_missing'],
                recoveryAction: 'consolidar',
            }),
        },
        {
            slug: 'progress',
            expectedText: /progresso validado/i,
            cycle: patchCycle({
                base: progressBase,
                state: 'progresso_validado',
                slug: '04',
                checkpoint: progressCheckpoint,
                recoveryAction: 'consolidar',
            }),
        },
        {
            slug: 'no-clear-change',
            expectedText: /sem mudanca clara/i,
            cycle: patchCycle({
                base: noClearBase,
                state: 'sem_mudanca_clara',
                slug: '05',
                checkpoint: noClearCheckpoint,
                recoveryAction: 'consolidar',
            }),
        },
        {
            slug: 'regression',
            expectedText: /regressao validada/i,
            cycle: patchCycle({
                base: regressionBase,
                state: 'regressao_validada',
                slug: '06',
                checkpoint: regressionCheckpoint,
                recoveryAction: 'reiniciar_linha',
            }),
        },
        {
            slug: 'fatigue',
            expectedText: /fadiga/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 7)),
                state: 'reparando',
                slug: '07',
                reasonCodes: ['fatigue_reduced_dose'],
                recoveryAction: 'reparar',
            }),
        },
        {
            slug: 'discomfort',
            expectedText: /desconforto|bloco pausado/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 8)),
                state: 'pausado',
                slug: '08',
                reasonCodes: ['discomfort_stop'],
                recoveryAction: 'pausar_bloco',
            }),
        },
        {
            slug: 'variable-changed',
            expectedText: /variavel central mudou|linha reiniciada/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 9)),
                state: 'linha_reiniciada',
                slug: '09',
                reasonCodes: ['variable_changed', 'line_restart'],
                recoveryAction: 'reiniciar_linha',
                archivedLine: true,
            }),
        },
        {
            slug: 'stale-context',
            expectedText: /contexto desatualizado|contexto ficou antigo/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 10)),
                state: 'contexto_desatualizado',
                slug: '10',
                reasonCodes: ['stale_context'],
                recoveryAction: 'reparar',
            }),
        },
        {
            slug: 'missed-days',
            expectedText: /reencaixado|linha ativa/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 11)),
                state: 'ativo',
                slug: '11',
                reasonCodes: ['missed_day_reentry'],
                recoveryAction: 'reencaixar',
            }),
        },
        {
            slug: 'line-restarted',
            expectedText: /linha reiniciada/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 12)),
                state: 'linha_reiniciada',
                slug: '12',
                reasonCodes: ['line_restart'],
                recoveryAction: 'reiniciar_linha',
                archivedLine: true,
            }),
        },
        {
            slug: 'completed',
            expectedText: /ciclo concluido/i,
            cycle: patchCycle({
                base: createProgramCycle(analysisResult, protocol, isoAt(seedOffsetMs, 13)),
                state: 'concluido',
                slug: '13',
                completed: true,
                recoveryAction: 'reencaixar',
            }),
        },
    ];
}

function blockerSummary(reasonCodes: readonly TrainingProgramReasonCode[]): string {
    return reasonCodes.length === 0
        ? 'Sem blocker ativo no ciclo.'
        : reasonCodes.map(trainingProgramReasonCopy).join(' ');
}

function visibleReason(cycle: TrainingProgramCycleSnapshot): string {
    return cycle.reasonCodes[0]
        ? trainingProgramReasonCopy(cycle.reasonCodes[0])
        : cycle.evidenceSummary.summary;
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

async function insertUserAndProfile(schema: typeof import('../src/db/schema'), db: typeof import('../src/db').db, user: SeededUser) {
    await db.insert(schema.users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
        role: user.role,
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
        updatedAt: new Date('2026-05-08T13:00:00.000Z'),
    });
}

async function insertAnalysis(
    schema: typeof import('../src/db/schema'),
    db: typeof import('../src/db').db,
    user: SeededUser,
    analysisSessionId: string,
    result: AnalysisResult,
) {
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
        stabilityScore: 78,
        verticalControl: 0.72,
        horizontalNoise: 2.2,
        recoilResponseMs: 140,
        driftBias: { direction: 'neutral', magnitude: 0.2 },
        consistencyScore: 76,
        diagnoses: ['underpull'],
        fullResult: result as unknown as Record<string, unknown>,
        sprayScore: 74,
        createdAt: new Date('2026-05-08T13:00:00.000Z'),
    });
}

async function insertCycle(
    schema: typeof import('../src/db/schema'),
    db: typeof import('../src/db').db,
    user: SeededUser,
    analysisSessionId: string,
    cycle: TrainingProgramCycleSnapshot,
) {
    await db.insert(schema.trainingProgramCycles).values({
        id: cycle.id,
        userId: user.id,
        baseAnalysisSessionId: analysisSessionId,
        protocolId: cycle.evidenceSummary.protocolId ?? null,
        activeLineId: cycle.activeLine?.lineId ?? null,
        activeLineContextKey: cycle.activeLine?.contextKey ?? cycle.strictContextKey,
        strictContextKey: cycle.strictContextKey,
        kind: cycle.kind,
        state: cycle.state,
        currentWeekNumber: cycle.currentWeekNumber,
        currentMissionId: cycle.currentMissionId,
        recoveryAction: cycle.recoveryAction,
        reasonCodes: cycle.reasonCodes,
        visibleReason: visibleReason(cycle),
        blockerSummary: blockerSummary(cycle.reasonCodes),
        snapshot: cycle,
        payload: { snapshot: cycle },
        createdAt: new Date(cycle.createdAt),
        updatedAt: new Date(cycle.updatedAt),
        archivedAt: cycle.state === 'linha_reiniciada' ? new Date(cycle.updatedAt) : null,
        completedAt: cycle.state === 'concluido' ? new Date(cycle.updatedAt) : null,
    });
}

async function seedPhase10ProgramFixture(role: SeededUser['role']) {
    const [{ db }, schema] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const suffix = randomUUID();
    const user: SeededUser = {
        id: randomUUID(),
        email: `phase10-program-${role}-${suffix}@example.com`,
        name: `Phase 10 ${role} ${suffix.slice(0, 8)}`,
        role,
    };
    const analysisSessionId = randomUUID();
    const result = createStoredAnalysisResult(analysisSessionId);
    const protocol = result.coachPlan?.completeProtocol;
    const seedOffsetMs = Number.parseInt(suffix.replace(/\D/g, '').slice(0, 6) || '0', 10) % 900_000;

    if (!protocol) {
        throw new Error('Phase 10 fixture needs a complete protocol.');
    }

    const stateFixtures = createProgramStateFixtures(result, protocol, seedOffsetMs);

    await insertUserAndProfile(schema, db, user);
    await insertAnalysis(schema, db, user, analysisSessionId, result);
    for (const fixture of stateFixtures) {
        await insertCycle(schema, db, user, analysisSessionId, fixture.cycle);
    }

    return {
        user,
        analysisSessionId,
        stateFixtures,
        activeCycle: stateFixtures.find((fixture) => fixture.slug === 'active')!.cycle,
        async cleanup() {
            await db.delete(schema.trainingProgramCycles).where(eq(schema.trainingProgramCycles.baseAnalysisSessionId, analysisSessionId));
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
    test.describe(`Phase 10 Ciclo Pro browser proof ${label}`, () => {
        test.use({ viewport });

        test('shows no-analysis and Free locked states without fake program depth', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated Phase 10 fixture.');

            await page.goto('/ciclo-pro');
            await expect(page.getByRole('heading', { name: /Nenhum Ciclo Pro ativo/i })).toBeVisible();
            await expect(page.getByText(/Sem base salva, a rota nao inventa programa/i).first()).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase10-no-analysis-${label}.png`,
            });

            const fixture = await seedPhase10ProgramFixture('user');
            try {
                await signInAsSeededUser(page, fixture.user);
                await page.goto(`/ciclo-pro?cycleId=${encodeURIComponent(fixture.activeCycle.id)}`);
                await expect(page.getByRole('heading', { name: /Desbloqueie o Ciclo Pro de 30 dias/i }).first()).toBeVisible();
                await expect(page.getByLabel('Missao Free do Ciclo Pro')).toBeVisible();
                await expect(page.getByText(/O mapa completo continua no Pro/i)).toBeVisible();
                await expect(page.getByText(/Proximo passo Free/i)).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-free-locked-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });

        test('covers Pro state matrix and surface handoffs', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed an authenticated Phase 10 fixture.');
            const fixture = await seedPhase10ProgramFixture('admin');

            try {
                await signInAsSeededUser(page, fixture.user);

                for (const stateFixture of fixture.stateFixtures) {
                    await page.goto(`/ciclo-pro?cycleId=${encodeURIComponent(stateFixture.cycle.id)}`);
                    await expect(page.getByRole('heading', { name: /Ciclo Pro|Ciclo de Reparo/i }).first()).toBeVisible();
                    await expect(page.getByText(stateFixture.expectedText).first()).toBeVisible();
                    await expect(page.getByText(/validacao compativel|sem prova compativel|sem nota global/i).first()).toBeVisible();
                    await expectNoHorizontalOverflow(page);
                    await page.screenshot({
                        fullPage: true,
                        path: `test-results/phase10-state-${stateFixture.slug}-${label}.png`,
                    });
                }

                await page.goto('/dashboard');
                await expect(page.getByRole('heading', { name: /Dashboard de performance/i }).first()).toBeVisible();
                await expect(page.locator('main').getByText(/Ciclo Pro: cockpit de agora/i).first()).toBeVisible();
                await expect(page.getByRole('link', { name: /Abrir Ciclo Pro/i }).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-dashboard-${label}.png`,
                });

                await page.goto('/history');
                await expect(page.getByRole('heading', { name: /Historico de Analises/i })).toBeVisible();
                await expect(page.getByText(/Ciclo Pro:/i).first()).toBeVisible();
                await expect(page.getByText(/Semana/i).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-history-${label}.png`,
                });

                await page.goto(`/history/${fixture.analysisSessionId}`);
                await expect(page.locator('#history-training-program-audit')).toBeVisible();
                await expect(page.locator('#history-training-program-audit').getByText(/Historico preserva o motivo/i)).toBeVisible();
                await expect(page.locator('#history-training-program-audit').getByText(/Checkpoint tecnico validado|Checkpoint tecnico/i).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-history-detail-${label}.png`,
                });

                await page.goto(`/spray-lab?programMissionId=${encodeURIComponent(fixture.activeCycle.currentMissionId ?? '')}`);
                await expect(page.getByRole('heading', { name: /Abrir pelo resultado salvo|Sessao indisponivel/i }).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-spray-lab-handoff-${label}.png`,
                });

                await page.goto(`/analyze?mode=validation&programMissionId=${encodeURIComponent(fixture.activeCycle.currentMissionId ?? '')}`);
                await expect(page.getByRole('heading', { name: /Analisar Clip/i })).toBeVisible();
                await expect(page.getByText(/Validacao indisponivel|Upload guiado de clip de spray/i).first()).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase10-analyze-validation-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });
    });
}
