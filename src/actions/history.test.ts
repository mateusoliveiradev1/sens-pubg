import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    analysisSessions,
    coachProtocolOutcomes,
    completeTrainingProtocolRevisions,
    precisionCheckpoints,
    precisionEvolutionLines,
    sensitivityHistory,
    trainingProtocolTransferRecords,
} from '@/db/schema';
import { createAnalysisContext } from '@/app/analyze/analysis-context';
import { resolveAnalysisDecision } from '@/core/analysis-decision';
import { buildCompatibleValidationChecklistFromProtocol } from '@/core/complete-training-protocol-validation';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type { AnalysisResult, CoachPlan, CompleteTrainingProtocol, PrecisionTrendSummary } from '@/types/engine';
import type { TrainingProgramCycleSnapshot } from '@/types/training-programs';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const leftJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const orderBy = vi.fn();
    const insert = vi.fn();
    const sessionValues = vi.fn();
    const returning = vi.fn();
    const lineValues = vi.fn();
    const onConflictDoUpdate = vi.fn();
    const lineReturning = vi.fn();
    const checkpointValues = vi.fn();
    const outcomeValues = vi.fn();
    const revisionValues = vi.fn();
    const transferValues = vi.fn();
    const historyValues = vi.fn();
    const update = vi.fn();
    const updateSet = vi.fn();
    const updateWhere = vi.fn();
    const revalidatePath = vi.fn();
    const enrichAnalysisResultCoaching = vi.fn();
    const createGroqCoachClient = vi.fn();
    const createDrizzleQuotaLedgerRepository = vi.fn();
    const resolveAnalysisSaveAccessWithResolution = vi.fn();
    const reserveAnalysisQuota = vi.fn();
    const finalizeAnalysisQuota = vi.fn();
    const voidAnalysisQuota = vi.fn();

    return {
        auth,
        select,
        from,
        leftJoin,
        where,
        limit,
        orderBy,
        insert,
        sessionValues,
        returning,
        lineValues,
        onConflictDoUpdate,
        lineReturning,
        checkpointValues,
        outcomeValues,
        revisionValues,
        transferValues,
        historyValues,
        update,
        updateSet,
        updateWhere,
        revalidatePath,
        enrichAnalysisResultCoaching,
        createGroqCoachClient,
        createDrizzleQuotaLedgerRepository,
        resolveAnalysisSaveAccessWithResolution,
        reserveAnalysisQuota,
        finalizeAnalysisQuota,
        voidAnalysisQuota,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
        update: mocks.update,
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/core/analysis-result-coach-enrichment', () => ({
    enrichAnalysisResultCoaching: mocks.enrichAnalysisResultCoaching,
}));

vi.mock('@/server/coach/groq-coach-client', () => ({
    createGroqCoachClient: mocks.createGroqCoachClient,
}));

vi.mock('@/lib/quota-ledger', () => ({
    createAnalysisSaveAttemptId: (input: { readonly userId: string; readonly analysisResultId?: string | null }) => (
        `analysis-save:${input.userId}:${input.analysisResultId ?? 'generated'}`
    ),
    createDrizzleQuotaLedgerRepository: mocks.createDrizzleQuotaLedgerRepository,
    resolveAnalysisSaveAccessWithResolution: mocks.resolveAnalysisSaveAccessWithResolution,
    reserveAnalysisQuota: mocks.reserveAnalysisQuota,
    finalizeAnalysisQuota: mocks.finalizeAnalysisQuota,
    voidAnalysisQuota: mocks.voidAnalysisQuota,
}));

import {
    getCoachProtocolOutcomesForSession,
    getAnalysisSaveAccess,
    getHistorySessions,
    getPrecisionHistoryLines,
    recordCompleteTrainingProtocolRevision,
    recordCoachProtocolOutcome,
    recordTrainingProtocolTransfer,
    recordSensitivityAcceptance,
    saveAnalysisResult,
} from './history';

function createQuotaSummary(overrides: Record<string, unknown> = {}) {
    return {
        tier: 'free',
        limit: 3,
        used: 1,
        remaining: 2,
        state: 'available',
        periodStart: new Date('2026-05-01T00:00:00.000Z'),
        periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        warningAt: 2,
        reason: 'billable',
        ...overrides,
    };
}

function createQuotaReservation(overrides: Record<string, unknown> = {}) {
    const quota = createQuotaSummary();

    return {
        ledgerEntryId: 'ledger-1',
        analysisSaveAttemptId: 'analysis-save:user-1:analysis-1',
        idempotencyKey: 'analysis-save:user-1:analysis-1:2026-05',
        period: {
            tier: quota.tier,
            source: 'server_utc_month',
            start: quota.periodStart,
            end: quota.periodEnd,
            limit: quota.limit,
            warningAt: quota.warningAt,
        },
        quota,
        reasonCode: 'billable',
        ...overrides,
    };
}

function createProductAccessResolution(overrides: Record<string, unknown> = {}) {
    const quota = createQuotaSummary();

    return {
        userId: 'user-1',
        effectiveTier: quota.tier,
        accessState: 'free',
        source: 'default_free',
        billingStatus: 'none',
        quota,
        features: {},
        blockers: [],
        periodStart: null,
        periodEnd: null,
        expiresAt: null,
        auditRefs: [],
        ...overrides,
    };
}

function createSaveAccessState(overrides: Record<string, unknown> = {}) {
    const quota = createQuotaSummary();

    return {
        authenticated: true,
        canSave: true,
        accessState: 'free',
        billingStatus: 'none',
        quota,
        blocker: null,
        message: 'Analises salvas usadas neste periodo: 1/3.',
        ctaHref: null,
        ...overrides,
    };
}

function resetQuotaMocks() {
    const quota = createQuotaSummary();
    const reservation = createQuotaReservation({ quota });

    mocks.createDrizzleQuotaLedgerRepository.mockReturnValue({ name: 'quota-repository' });
    mocks.resolveAnalysisSaveAccessWithResolution.mockResolvedValue({
        state: createSaveAccessState({ quota }),
        access: createProductAccessResolution({ quota }),
    });
    mocks.reserveAnalysisQuota.mockResolvedValue({
        status: 'reserved',
        reservation,
        quota,
        reasonCode: 'billable',
    });
    mocks.finalizeAnalysisQuota.mockResolvedValue(null);
    mocks.voidAnalysisQuota.mockResolvedValue(null);
}

function createAnalysisResult(): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-13T12:00:00.000Z'),
        patchVersion: CURRENT_PUBG_PATCH_VERSION,
        trajectory: {
            points: [],
            trackingFrames: [],
            displacements: [],
            totalFrames: 30,
            durationMs: 1000 as never,
            weaponId: 'beryl-m762',
            trackingQuality: 0.92,
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
            stock: 'none',
        },
        metrics: {
            stabilityScore: 78 as never,
            verticalControlIndex: 1.02,
            horizontalNoiseIndex: 2.1,
            angularErrorDegrees: 0.4,
            linearErrorCm: 18,
            linearErrorSeverity: 2,
            targetDistanceMeters: 30,
            initialRecoilResponseMs: 145 as never,
            driftDirectionBias: { direction: 'neutral', magnitude: 0 },
            consistencyScore: 82 as never,
            burstVCI: 1.01,
            sustainedVCI: 1.03,
            fatigueVCI: 1.04,
            burstHNI: 1.9,
            sustainedHNI: 2.1,
            fatigueHNI: 2.3,
            sprayScore: 81,
        },
        diagnoses: [],
        sensitivity: {
            profiles: [
                {
                    type: 'low',
                    label: 'Low',
                    description: 'Low sens',
                    general: 45 as never,
                    ads: 43 as never,
                    scopes: [],
                    cmPer360: 48 as never,
                },
                {
                    type: 'balanced',
                    label: 'Balanced',
                    description: 'Balanced sens',
                    general: 50 as never,
                    ads: 48 as never,
                    scopes: [],
                    cmPer360: 41 as never,
                },
                {
                    type: 'high',
                    label: 'High',
                    description: 'High sens',
                    general: 55 as never,
                    ads: 53 as never,
                    scopes: [],
                    cmPer360: 35 as never,
                },
            ],
            recommended: 'balanced',
            tier: 'test_profiles',
            evidenceTier: 'moderate',
            confidenceScore: 0.72,
            reasoning: 'Patch-aware recommendation',
            suggestedVSM: 1.05,
        },
        coaching: [],
    };
}

function createPrecisionReadyAnalysisResult(input: {
    readonly id: string;
    readonly timestamp: string;
    readonly sprayScore: number;
    readonly consistencyScore?: number;
    readonly confidence?: number;
    readonly qualityScore?: number;
}): AnalysisResult {
    const confidence = input.confidence ?? 0.9;
    const qualityScore = input.qualityScore ?? 86;
    const base = createAnalysisResult();

    return {
        ...base,
        id: input.id,
        timestamp: new Date(input.timestamp),
        analysisContext: createAnalysisContext({
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            scopeId: 'red-dot',
            distanceMeters: 30,
            distanceMode: 'exact',
        }),
        videoQualityReport: {
            overallScore: qualityScore as never,
            sharpness: 82 as never,
            compressionBurden: 15 as never,
            reticleContrast: 84 as never,
            roiStability: 88 as never,
            fpsStability: 90 as never,
            usableForAnalysis: true,
            blockingReasons: [],
            diagnostic: {
                tier: 'analysis_ready',
                summary: 'Clip bom para validar linha precisa.',
                recommendations: [],
                preprocessing: {
                    normalizationApplied: true,
                    sampledFrames: 32,
                    selectedFrames: 30,
                    sprayWindow: {
                        startMs: 120 as never,
                        endMs: 2800 as never,
                        confidence: 0.9,
                        shotLikeEvents: 30,
                        rejectedLeadingMs: 80 as never,
                        rejectedTrailingMs: 100 as never,
                    },
                },
            },
        },
        trajectory: {
            ...base.trajectory,
            durationMs: 2800 as never,
            displacements: Array.from({ length: 30 }, (_, index) => ({
                dx: 0,
                dy: 1,
                timestamp: (index * 90) as never,
                shotIndex: index,
            })),
        },
        metrics: {
            ...base.metrics,
            sprayScore: input.sprayScore,
            consistencyScore: (input.consistencyScore ?? input.sprayScore) as never,
            metricQuality: {
                sprayScore: {
                    coverage: 0.92,
                    confidence,
                    sampleSize: 30,
                    framesTracked: 30,
                    framesLost: 2,
                    framesProcessed: 32,
                },
            } as never,
        },
    };
}

function createStoredPrecisionTrend(overrides: Partial<PrecisionTrendSummary> = {}): PrecisionTrendSummary {
    return {
        label: 'validated_progress',
        evidenceLevel: 'strong',
        compatibleCount: 3,
        baseline: {
            resultId: 'baseline-result',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 62,
            mechanicalScore: 66,
            coverage: 0.9,
            confidence: 0.88,
            clipQuality: 84,
        },
        current: {
            resultId: 'current-result',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 82,
            mechanicalScore: 80,
            coverage: 0.92,
            confidence: 0.9,
            clipQuality: 86,
        },
        recentWindow: {
            count: 3,
            resultIds: ['baseline-result', 'prior-result', 'current-result'],
            actionableAverage: 72,
            mechanicalAverage: 73,
            coverageAverage: 0.9,
            confidenceAverage: 0.88,
            clipQualityAverage: 84,
        },
        actionableDelta: {
            baseline: 62,
            current: 82,
            delta: 20,
            recentWindowAverage: 72,
            recentWindowDelta: 10,
        },
        mechanicalDelta: {
            baseline: 66,
            current: 80,
            delta: 14,
            recentWindowAverage: 73,
            recentWindowDelta: 7,
        },
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.9,
        coverage: 0.92,
        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
        ...overrides,
    };
}

function createStoredCoachPlan(): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Plano salvo para validar um bloco curto.',
        primaryFocus: {
            id: 'vertical-focus',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'O sustain vertical ainda decide o bloco.',
            priorityScore: 0.86,
            severity: 0.8,
            confidence: 0.84,
            coverage: 0.88,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [
            {
                id: 'vertical-drill',
                kind: 'technique',
                instruction: 'Faca tres sprays mantendo o mesmo alvo.',
                expectedEffect: 'Reduzir erro vertical sem mexer na sens.',
                risk: 'low',
                applyWhen: 'Use com cobertura acima de 80%.',
            },
        ],
        nextBlock: {
            title: 'Bloco vertical curto',
            durationMinutes: 12,
            steps: ['Grave tres sprays comparaveis.'],
            checks: [
                {
                    label: 'Validacao vertical',
                    target: 'vertical_control',
                    minimumCoverage: 0.8,
                    minimumConfidence: 0.75,
                    successCondition: 'VCI melhora sem piorar ruido.',
                    failCondition: 'VCI nao melhora ou captura cai.',
                },
            ],
        },
        stopConditions: ['Pare se a captura cair.'],
        adaptationWindowDays: 3,
        llmRewriteAllowed: true,
    };
}

function createCompleteProtocol(overrides: Partial<CompleteTrainingProtocol> = {}): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'complete-protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'test_protocol',
        title: 'Ficha de controle vertical',
        summary: 'Bloco controlado para validar pull vertical.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl-m762',
            weaponName: 'Beryl M762',
            opticId: 'red-dot',
            opticName: 'Red Dot',
            distanceMeters: 30,
            distanceMode: 'exact',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Controlar recoil vertical sem misturar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Parede do Training Mode a 30m',
        executionSteps: [
            'Faça tres sprays mantendo a mira no mesmo alvo.',
            'Descanse entre sprays.',
            'Grave o ultimo spray para comparacao.',
        ],
        preparation: [
            {
                id: 'mousepad-space',
                label: 'Liberar espaco do mousepad',
                reason: 'Evita travar o pull vertical.',
                required: true,
                safetyKind: 'setup_control',
            },
        ],
        validation: {
            compatibleClipChecklist: [
                'Mesma arma',
                'Mesma mira',
                'Mesma distancia',
                'Mesma postura',
                'Mesma sensibilidade',
            ],
            minimumConfidence: 0.75,
            minimumCoverage: 0.8,
            successCriteria: ['VCI melhora sem piorar ruido horizontal.'],
            failCriteria: ['Captura perde cobertura.'],
            variableControlChecklist: ['Nao trocar grip', 'Nao trocar sensibilidade'],
            nextClipCopy: 'Grave o proximo clip igual para validar.',
        },
        transfer: {
            situationChecklist: ['TDM curta', 'Mesma arma/mira', 'Pressao moderada'],
            conservativeConfidenceCopy: 'Transferencia em partida e pratica; nao substitui clip compativel.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'test_protocol',
            tierAfter: 'test_protocol',
            reasons: [],
            blockedFields: [],
            repairCtas: [],
            userCopy: 'Sem downgrade ativo.',
        },
        audit: {
            createdAt: '2026-05-07T12:00:00.000Z',
            analysisDecisionLevel: 'usable_analysis',
            primaryFocusArea: 'vertical_control',
            secondaryFocusAreas: [],
            confidence: 0.84,
            coverage: 0.86,
            source: 'deterministic_coach',
        },
        stopConditions: ['Parar se houver dor ou formigamento.'],
        continueCriteria: ['Continuar se cobertura e confianca ficarem acima do minimo.'],
        antiMixingNotes: ['Nao misturar sensibilidade e grip no mesmo bloco.'],
        freeSummary: ['Foco, duracao e passos essenciais ficam visiveis.'],
        proSections: ['Reps completas', 'Auditoria completa'],
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function createTrainingProgramCycleSnapshot(
    overrides: Partial<TrainingProgramCycleSnapshot> = {},
): TrainingProgramCycleSnapshot {
    const mission = {
        id: 'program-mission-2',
        weekNumber: 2 as const,
        slot: 'main_2' as const,
        category: 'validation' as const,
        status: 'active' as const,
        title: 'Validar controle vertical no contexto Beryl',
        anatomy: {
            agora: 'Grave validacao compativel mantendo as mesmas variaveis.',
            porQueImporta: 'Sem clip compativel, execucao do ciclo nao vira prova tecnica.',
            oQueInvalida: 'Trocar mira, distancia, grip ou sensibilidade invalida a comparacao.',
            evidenciaGerada: 'Clip compativel para checkpoint tecnico.',
            proximoCta: {
                label: 'Gravar validacao compativel',
                href: '/analyze?mode=validation',
                target: 'analyze_validation' as const,
            },
        },
        stateAfterCompletion: 'validacao_pendente' as const,
        reasonCodes: ['compatible_proof_missing'] as const,
        evidenceRefs: [],
    };
    const checkpoint = {
        id: 'program-checkpoint-week-1',
        layer: 'weekly_operational' as const,
        weekNumber: 1 as const,
        state: 'validacao_pendente' as const,
        outcome: 'validation_pending' as const,
        createdAt: '2026-05-06T12:00:00.000Z',
        evidenceSummary: {
            savedAnalysisId: 'session-1',
            analysisDecisionLevel: 'usable_analysis' as const,
            context: createCompleteProtocol().context,
            fidelityReasonCodes: [],
            confidence: 0.78,
            coverage: 0.8,
            blockers: ['compatible_proof_missing'] as const,
            summary: 'Semana executada; validacao compativel ainda pendente.',
        },
        reasonCodes: ['compatible_proof_missing'] as const,
        canIncreaseDifficulty: false,
        nextRecommendation: 'consolidar' as const,
        summary: 'Checkpoint semanal operacional: manter validacao compativel pendente.',
    };

    return {
        version: 'ciclo-pro-v1',
        id: 'program-cycle-1',
        kind: 'ciclo_pro',
        state: 'validacao_pendente',
        label: 'Ciclo Pro Beryl 3x 50m',
        createdAt: '2026-05-05T12:00:00.000Z',
        updatedAt: '2026-05-06T12:00:00.000Z',
        baseAnalysisId: 'session-1',
        activeLine: {
            lineId: 'line-1',
            contextKey: 'beryl:red-dot:50m',
            label: 'Beryl / Red Dot / 50m',
            active: true,
            startedAt: '2026-05-05T12:00:00.000Z',
            restartReasonCodes: [],
        },
        archivedLines: [],
        strictContextKey: 'beryl:red-dot:50m',
        strictContextLabel: 'Beryl M762 / Red Dot / 50m',
        evidenceSummary: {
            savedAnalysisId: 'session-1',
            analysisDecisionLevel: 'usable_analysis',
            protocol: createCompleteProtocol(),
            protocolId: 'complete-protocol-1',
            context: createCompleteProtocol().context,
            fidelityReasonCodes: [],
            confidence: 0.78,
            coverage: 0.8,
            blockers: ['compatible_proof_missing'],
            summary: 'Base suficiente para ciclo, mas progresso tecnico ainda precisa de clip compativel.',
        },
        weeks: [
            {
                id: 'program-week-1',
                weekNumber: 1,
                label: 'Semana 1',
                state: 'validacao_pendente',
                startedAt: '2026-05-05T12:00:00.000Z',
                closedAt: '2026-05-06T12:00:00.000Z',
                missions: [
                    {
                        ...mission,
                        id: 'program-mission-1',
                        weekNumber: 1,
                        slot: 'main_1',
                        status: 'completed',
                        title: 'Executar lane base Beryl',
                    },
                ],
                checkpointIds: ['program-checkpoint-week-1'],
                reasonCodes: ['compatible_proof_missing'],
                canIncreaseDifficulty: false,
                recoveryAction: 'consolidar',
            },
            {
                id: 'program-week-2',
                weekNumber: 2,
                label: 'Semana 2',
                state: 'validacao_pendente',
                missions: [mission],
                checkpointIds: [],
                reasonCodes: ['compatible_proof_missing'],
                canIncreaseDifficulty: false,
                recoveryAction: 'consolidar',
            },
        ],
        checkpoints: [checkpoint],
        transitionEvents: [],
        currentWeekNumber: 2,
        currentMissionId: 'program-mission-2',
        reasonCodes: ['compatible_proof_missing'],
        recoveryAction: 'consolidar',
        nextCta: {
            label: 'Gravar validacao compativel',
            href: '/analyze?mode=validation',
            target: 'analyze_validation',
        },
        ...overrides,
    };
}

function createStoredCoachOutcomeRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 'outcome-1',
        userId: 'user-1',
        analysisSessionId: 'history-outcome-1',
        coachPlanId: 'plan-1',
        protocolId: 'vertical-control-drill-protocol',
        focusArea: 'vertical_control',
        status: 'improved',
        reasonCodes: [],
        note: null,
        revisionOfId: null,
        evidenceStrength: 'conflict',
        conflictPayload: {
            userOutcomeId: 'outcome-1',
            precisionTrendLabel: 'validated_regression',
            reason: 'Self-report improved, but strict compatible precision validated regression.',
            nextValidationCopy: 'Grave uma validacao curta antes de avancar.',
        },
        payload: {
            coachSnapshot: {
                tier: 'test_protocol',
                primaryFocusArea: 'vertical_control',
                primaryFocusTitle: 'Controle vertical',
                protocolId: 'vertical-control-drill-protocol',
                validationTarget: 'reduzir erro vertical',
                precisionTrendLabel: 'validated_regression',
            },
        },
        createdAt: new Date('2026-04-12T12:30:00.000Z'),
        updatedAt: new Date('2026-04-12T12:30:00.000Z'),
        ...overrides,
    };
}

describe('saveAnalysisResult', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.limit.mockReset();
        mocks.orderBy.mockReset();
        mocks.insert.mockReset();
        mocks.outcomeValues.mockReset();
        mocks.revisionValues.mockReset();
        mocks.transferValues.mockReset();
        mocks.update.mockReset();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
        mocks.limit.mockResolvedValue([{ id: 'profile-1' }]);
        mocks.orderBy.mockResolvedValue([]);

        mocks.insert.mockImplementation((table) => {
            if (table === analysisSessions) {
                return {
                    values: mocks.sessionValues,
                };
            }

            if (table === precisionEvolutionLines) {
                return {
                    values: mocks.lineValues,
                };
            }

            if (table === precisionCheckpoints) {
                return {
                    values: mocks.checkpointValues,
                };
            }

            if (table === coachProtocolOutcomes) {
                return {
                    values: mocks.outcomeValues,
                };
            }

            if (table === completeTrainingProtocolRevisions) {
                return {
                    values: mocks.revisionValues,
                };
            }

            if (table === trainingProtocolTransferRecords) {
                return {
                    values: mocks.transferValues,
                };
            }

            if (table === sensitivityHistory) {
                return {
                    values: mocks.historyValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.sessionValues.mockReturnValue({
            returning: mocks.returning,
        });
        mocks.returning.mockResolvedValue([{ id: 'session-1' }]);
        mocks.lineValues.mockReturnValue({
            onConflictDoUpdate: mocks.onConflictDoUpdate,
        });
        mocks.onConflictDoUpdate.mockReturnValue({
            returning: mocks.lineReturning,
        });
        mocks.lineReturning.mockResolvedValue([{ id: 'precision-line-1' }]);
        mocks.checkpointValues.mockResolvedValue(undefined);
        mocks.outcomeValues.mockResolvedValue(undefined);
        mocks.revisionValues.mockResolvedValue(undefined);
        mocks.transferValues.mockResolvedValue(undefined);
        mocks.limit.mockResolvedValueOnce([{ id: 'profile-1' }]).mockResolvedValue([]);
        mocks.historyValues.mockResolvedValue(undefined);
        mocks.update.mockReturnValue({
            set: mocks.updateSet,
        });
        mocks.updateSet.mockReturnValue({
            where: mocks.updateWhere,
        });
        mocks.updateWhere.mockResolvedValue(undefined);
        mocks.createGroqCoachClient.mockReturnValue(undefined);
        mocks.enrichAnalysisResultCoaching.mockImplementation(async (result) => result);
        resetQuotaMocks();
    });

    it('persists patchVersion with the saved session and full result payload', async () => {
        const result = createAnalysisResult();

        const saved = await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            patchVersion: CURRENT_PUBG_PATCH_VERSION,
            fullResult: expect.objectContaining({
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
            }),
        }));
        expect(saved).toMatchObject({
            success: true,
            sessionId: 'session-1',
            result: {
                historySessionId: 'session-1',
            },
        });
        expect(mocks.reserveAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            analysisSaveAttemptId: 'analysis-save:user-1:analysis-1',
            billable: true,
        }));
        expect(mocks.finalizeAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            analysisSessionId: 'session-1',
        }));
    });

    it('persists a versioned complete protocol snapshot inside the saved full result', async () => {
        await saveAnalysisResult(createAnalysisResult(), 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                coachPlan: expect.objectContaining({
                    completeProtocol: expect.objectContaining({
                        version: 'complete-protocol-v1',
                    }),
                }),
            }),
        }));
    });

    it('returns save access from the server quota resolver', async () => {
        const access = await getAnalysisSaveAccess();

        expect(access).toMatchObject({
            authenticated: true,
            canSave: true,
            quota: {
                used: 1,
                remaining: 2,
            },
        });
        expect(mocks.resolveAnalysisSaveAccessWithResolution).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
        }));
    });

    it('returns unauthenticated save access without touching the quota repository', async () => {
        mocks.auth.mockResolvedValueOnce(null);

        const access = await getAnalysisSaveAccess();

        expect(access).toMatchObject({
            authenticated: false,
            canSave: false,
            blocker: 'entitlement_blocked',
        });
        expect(mocks.resolveAnalysisSaveAccessWithResolution).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated save attempts before reserving quota', async () => {
        mocks.auth.mockResolvedValueOnce(null);

        await expect(saveAnalysisResult(createAnalysisResult(), 'beryl-m762', 'red-dot', 30))
            .rejects.toThrow('Nao autenticado.');
        expect(mocks.reserveAnalysisQuota).not.toHaveBeenCalled();
    });

    it('blocks exhausted free users before persisting a new billable save', async () => {
        const exhaustedQuota = createQuotaSummary({
            used: 3,
            remaining: 0,
            state: 'limit_reached',
            reason: 'limit_blocked',
        });
        mocks.resolveAnalysisSaveAccessWithResolution.mockResolvedValueOnce({
            state: createSaveAccessState({
                canSave: false,
                quota: exhaustedQuota,
                blocker: 'limit_blocked',
                message: 'Limite Free atingido (3/3).',
                ctaHref: '/pricing',
            }),
            access: createProductAccessResolution({
                quota: exhaustedQuota,
                accessState: 'free_limit_reached',
            }),
        });
        mocks.reserveAnalysisQuota.mockResolvedValueOnce({
            status: 'blocked',
            reservation: null,
            quota: exhaustedQuota,
            reasonCode: 'limit_blocked',
        });

        const saved = await saveAnalysisResult(createAnalysisResult(), 'beryl-m762', 'red-dot', 30);

        expect(saved).toMatchObject({
            success: false,
            code: 'limit_reached',
            quota: {
                status: 'limit_reached',
                ctaHref: '/pricing',
                quota: {
                    used: 3,
                    remaining: 0,
                },
            },
        });
        expect(mocks.sessionValues).not.toHaveBeenCalled();
        expect(mocks.finalizeAnalysisQuota).not.toHaveBeenCalled();
    });

    it('blocks exhausted Pro users against the trusted cycle limit', async () => {
        const exhaustedQuota = createQuotaSummary({
            tier: 'pro',
            limit: 100,
            used: 100,
            remaining: 0,
            warningAt: 80,
            state: 'limit_reached',
            reason: 'limit_blocked',
        });
        mocks.resolveAnalysisSaveAccessWithResolution.mockResolvedValueOnce({
            state: createSaveAccessState({
                accessState: 'pro_active',
                billingStatus: 'active',
                canSave: false,
                quota: exhaustedQuota,
                blocker: 'limit_blocked',
                ctaHref: '/billing',
            }),
            access: createProductAccessResolution({
                effectiveTier: 'pro',
                accessState: 'pro_active',
                source: 'stripe_subscription',
                billingStatus: 'active',
                quota: exhaustedQuota,
                periodStart: exhaustedQuota.periodStart,
                periodEnd: exhaustedQuota.periodEnd,
            }),
        });
        mocks.reserveAnalysisQuota.mockResolvedValueOnce({
            status: 'blocked',
            reservation: null,
            quota: exhaustedQuota,
            reasonCode: 'limit_blocked',
        });

        const saved = await saveAnalysisResult(createAnalysisResult(), 'beryl-m762', 'red-dot', 30);

        expect(saved).toMatchObject({
            success: false,
            code: 'limit_reached',
            quota: {
                status: 'limit_reached',
                ctaHref: '/billing',
                quota: {
                    tier: 'pro',
                    used: 100,
                    remaining: 0,
                },
            },
        });
        expect(mocks.sessionValues).not.toHaveBeenCalled();
    });

    it('enriches coaching through the server helper and returns the enriched payload', async () => {
        const result = createAnalysisResult();
        const enrichedResult = {
            ...result,
            coaching: [{ problem: 'Coach IA' }] as unknown as AnalysisResult['coaching'],
        };

        mocks.enrichAnalysisResultCoaching.mockResolvedValue(enrichedResult);

        const saved = await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.createGroqCoachClient).toHaveBeenCalledTimes(1);
        expect(mocks.enrichAnalysisResultCoaching).toHaveBeenCalledWith(expect.objectContaining({
            id: result.id,
            analysisContext: expect.objectContaining({
                targetDistanceMeters: 30,
                distanceMode: 'exact',
            }),
        }), undefined);
        expect(saved).toMatchObject({
            success: true,
            result: enrichedResult,
        });
        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            coachingData: enrichedResult.coaching,
            fullResult: expect.objectContaining({
                coaching: enrichedResult.coaching,
            }),
        }));
    });

    it('strengthens sensitivity confidence when compatible history converges on the same recommendation', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'history-1',
                    createdAt: new Date('2026-04-16T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'apply_ready',
                            evidenceTier: 'strong',
                            confidenceScore: 0.9,
                        },
                    },
                },
                {
                    id: 'history-2',
                    createdAt: new Date('2026-04-15T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 35,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'strong',
                            confidenceScore: 0.84,
                        },
                    },
                },
                {
                    id: 'history-3',
                    createdAt: new Date('2026-04-14T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 28,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        sensitivity: {
                            recommended: 'balanced',
                            tier: 'test_profiles',
                            evidenceTier: 'moderate',
                            confidenceScore: 0.78,
                        },
                    },
                },
            ]);

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    tier: 'apply_ready',
                    evidenceTier: 'strong',
                    historyConvergence: expect.objectContaining({
                        matchingSessions: 3,
                        consideredSessions: 3,
                        consensusProfile: 'balanced',
                        agreement: 'aligned',
                    }),
                }),
            }),
        }));
    });

    it('uses prior coach protocol outcomes for save-time memory and stores an auditable decision snapshot', async () => {
        const result: AnalysisResult = {
            ...createAnalysisResult(),
            diagnoses: [
                {
                    type: 'underpull',
                    severity: 4,
                    verticalControlIndex: 0.58,
                    deficitPercent: 42,
                    confidence: 0.9,
                    evidence: {
                        confidence: 0.9,
                        coverage: 0.91,
                        angularErrorDegrees: 1.6,
                        linearErrorCm: 64,
                        linearErrorSeverity: 4,
                    },
                    description: 'Controle vertical ainda sobe demais no sustain.',
                    cause: 'O bloco anterior conflitou com a validacao compativel.',
                    remediation: 'Revisar hipotese antes de repetir o mesmo protocolo.',
                },
            ],
        };

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'history-outcome-1',
                    createdAt: new Date('2026-04-12T12:00:00.000Z'),
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: {
                        coachPlan: createStoredCoachPlan(),
                    },
                },
            ]);
        mocks.orderBy.mockResolvedValueOnce([
            createStoredCoachOutcomeRow(),
        ]);

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                coachPlan: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocus: expect.objectContaining({
                        area: 'validation',
                    }),
                    secondaryFocuses: expect.arrayContaining([
                        expect.objectContaining({
                            area: 'vertical_control',
                            blockedBy: expect.arrayContaining(['outcome_conflict']),
                        }),
                    ]),
                }),
                coachDecisionSnapshot: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocusArea: 'validation',
                    protocolId: expect.any(String),
                    outcomeEvidenceState: 'conflict',
                    outcomeMemory: expect.objectContaining({
                        activeLayer: 'strict_compatible',
                        conflictCount: 1,
                    }),
                    conflicts: [
                        expect.objectContaining({
                            precisionTrendLabel: 'validated_regression',
                        }),
                    ],
                    blockerReasons: expect.arrayContaining([
                        'outcome_conflict',
                        'memory_conflict:vertical_control',
                    ]),
                }),
            }),
        }));
    });

    it('persists a baseline precision trend and checkpoint for the first compatible clip', async () => {
        const result = createPrecisionReadyAnalysisResult({
            id: 'precision-current-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 72,
        });

        await saveAnalysisResult(result, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'baseline',
                    compatibleCount: 1,
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'baseline_created',
            variableInTest: 'validation',
            validClipCount: 1,
            blockedClipCount: 0,
            payload: expect.objectContaining({
                trend: expect.objectContaining({ label: 'baseline' }),
            }),
        }));
        expect(mocks.checkpointValues).toHaveBeenCalledWith(expect.objectContaining({
            lineId: 'precision-line-1',
            analysisSessionId: 'session-1',
            state: 'baseline_created',
        }));
    });

    it('persists an initial precision signal for the second strict compatible clip', async () => {
        const prior = createPrecisionReadyAnalysisResult({
            id: 'precision-prior-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 70,
        });
        const current = createPrecisionReadyAnalysisResult({
            id: 'precision-current-2',
            timestamp: '2026-04-19T12:00:00.000Z',
            sprayScore: 78,
        });

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([{
                id: 'session-prior-1',
                createdAt: prior.timestamp,
                weaponId: 'beryl-m762',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                distance: 30,
                stance: 'standing',
                attachments: {
                    muzzle: 'compensator',
                    grip: 'vertical',
                    stock: 'none',
                },
                fullResult: prior as unknown as Record<string, unknown>,
            }]);

        await saveAnalysisResult(current, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'initial_signal',
                    compatibleCount: 2,
                    actionableDelta: expect.objectContaining({
                        delta: expect.any(Number),
                    }),
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'initial_signal',
            validClipCount: 2,
            baselineSessionId: 'session-prior-1',
        }));
    });

    it('persists validated progress only after three strong compatible clips', async () => {
        const baseline = createPrecisionReadyAnalysisResult({
            id: 'precision-baseline',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 62,
        });
        const prior = createPrecisionReadyAnalysisResult({
            id: 'precision-prior-progress',
            timestamp: '2026-04-19T12:00:00.000Z',
            sprayScore: 70,
        });
        const current = createPrecisionReadyAnalysisResult({
            id: 'precision-current-progress',
            timestamp: '2026-04-20T12:00:00.000Z',
            sprayScore: 82,
        });

        mocks.limit.mockReset();
        mocks.limit
            .mockResolvedValueOnce([{ id: 'profile-1' }])
            .mockResolvedValueOnce([
                {
                    id: 'session-prior-progress',
                    createdAt: prior.timestamp,
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: prior as unknown as Record<string, unknown>,
                },
                {
                    id: 'session-baseline',
                    createdAt: baseline.timestamp,
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    distance: 30,
                    stance: 'standing',
                    attachments: {
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                    },
                    fullResult: baseline as unknown as Record<string, unknown>,
                },
            ]);

        await saveAnalysisResult(current, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'validated_progress',
                    compatibleCount: 3,
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'validated_progress',
            validClipCount: 3,
            baselineSessionId: 'session-baseline',
        }));
    });

    it('records non-comparable clips as blocked checkpoints without incrementing valid count', async () => {
        const result = createPrecisionReadyAnalysisResult({
            id: 'precision-blocked',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 72,
            qualityScore: 40,
        });

        await saveAnalysisResult({
            ...result,
            videoQualityReport: {
                ...result.videoQualityReport!,
                usableForAnalysis: false,
            },
        }, 'beryl-m762', 'red-dot', 30);

        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                precisionTrend: expect.objectContaining({
                    label: 'not_comparable',
                    evidenceLevel: 'blocked',
                }),
            }),
        }));
        expect(mocks.lineValues).toHaveBeenCalledWith(expect.objectContaining({
            status: 'not_comparable',
            validClipCount: 0,
            blockedClipCount: expect.any(Number),
        }));
        expect(mocks.checkpointValues).toHaveBeenCalledWith(expect.objectContaining({
            state: 'not_comparable',
        }));
    });

    it('voids quota as non-billable for unusable weak-capture saves', async () => {
        const result = createPrecisionReadyAnalysisResult({
            id: 'precision-weak-capture',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 72,
            qualityScore: 40,
        });

        const saved = await saveAnalysisResult({
            ...result,
            videoQualityReport: {
                ...result.videoQualityReport!,
                usableForAnalysis: false,
            },
        }, 'beryl-m762', 'red-dot', 30);

        expect(saved).toMatchObject({
            success: true,
            quota: {
                status: 'non_billable',
                quota: {
                    used: 0,
                    remaining: 3,
                },
            },
        });
        expect(mocks.voidAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            reasonCode: 'non_billable_weak_capture',
            analysisSessionId: 'session-1',
        }));
        expect(mocks.finalizeAnalysisQuota).not.toHaveBeenCalled();
    });

    it('voids quota and preserves audit payload when decision does not count as useful analysis', async () => {
        const analysisDecision = resolveAnalysisDecision({
            blockerReasons: ['low_confidence'],
            confidence: 0.55,
            coverage: 0.7,
        });
        const result = createPrecisionReadyAnalysisResult({
            id: 'decision-partial-capture',
            timestamp: '2026-04-18T12:00:00.000Z',
            sprayScore: 76,
        });

        const saved = await saveAnalysisResult({
            ...result,
            analysisDecision,
        }, 'beryl-m762', 'red-dot', 30);

        expect(mocks.reserveAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            billable: false,
            nonBillableReason: 'non_billable_weak_capture',
        }));
        expect(mocks.sessionValues).toHaveBeenCalledWith(expect.objectContaining({
            fullResult: expect.objectContaining({
                analysisDecision: expect.objectContaining({
                    level: 'partial_safe_read',
                    recommendedNextStep: analysisDecision.recommendedNextStep,
                }),
            }),
        }));
        expect(saved.quota?.status).toBe('non_billable');
        expect(mocks.voidAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            reasonCode: 'non_billable_weak_capture',
            analysisSessionId: 'session-1',
        }));
    });

    it('voids quota as technical failure when persistence fails after reservation', async () => {
        mocks.returning.mockRejectedValueOnce(new Error('database unavailable'));

        const saved = await saveAnalysisResult(createAnalysisResult(), 'beryl-m762', 'red-dot', 30);

        expect(saved).toMatchObject({
            success: false,
            code: 'save_failed',
            quota: {
                status: 'technical_failure',
                quota: {
                    used: 0,
                    remaining: 3,
                },
            },
        });
        expect(mocks.voidAnalysisQuota).toHaveBeenCalledWith(expect.objectContaining({
            reasonCode: 'technical_failure',
        }));
        expect(mocks.finalizeAnalysisQuota).not.toHaveBeenCalled();
    });

    it('records real-world acceptance feedback for the recommended profile and syncs applied history', async () => {
        const result = createAnalysisResult();

        mocks.limit.mockReset();
        mocks.limit.mockResolvedValueOnce([
            {
                id: 'session-1',
                fullResult: result as unknown as Record<string, unknown>,
            },
        ]);

        const saved = await recordSensitivityAcceptance('session-1', 'improved');

        expect(saved).toMatchObject({
            success: true,
            acceptanceFeedback: {
                outcome: 'improved',
                testedProfile: 'balanced',
            },
        });
        expect(mocks.update).toHaveBeenNthCalledWith(1, analysisSessions);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(1, expect.objectContaining({
            fullResult: expect.objectContaining({
                sensitivity: expect.objectContaining({
                    acceptanceFeedback: expect.objectContaining({
                        outcome: 'improved',
                        testedProfile: 'balanced',
                    }),
                }),
            }),
        }));
        expect(mocks.update).toHaveBeenNthCalledWith(2, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(2, { applied: false });
        expect(mocks.update).toHaveBeenNthCalledWith(3, sensitivityHistory);
        expect(mocks.updateSet).toHaveBeenNthCalledWith(3, { applied: true });
    });
});

describe('recordCoachProtocolOutcome', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.limit.mockReset();
        mocks.orderBy.mockReset();
        mocks.insert.mockReset();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
        mocks.insert.mockImplementation((table) => {
            if (table === coachProtocolOutcomes) {
                return {
                    values: mocks.outcomeValues,
                };
            }

            throw new Error('Unexpected table');
        });
        mocks.outcomeValues.mockResolvedValue(undefined);
    });

    it('rejects unauthenticated users', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'started',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects attempts to write outcomes for another user session', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'other-session',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'completed',
        });

        expect(result).toEqual({
            success: false,
            error: 'Sessao nao encontrada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects invalid_capture without a structured reason code before writing', async () => {
        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'invalid_capture',
            reasonCodes: [],
        });

        expect(result).toEqual({
            success: false,
            error: 'invalid_capture requires at least one reason code.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('records a protocol outcome with evidence strength, snapshot payload, and dashboard revalidation', async () => {
        mocks.limit.mockResolvedValueOnce([{
            id: 'session-1',
            fullResult: {
                coachPlan: createStoredCoachPlan(),
                precisionTrend: createStoredPrecisionTrend(),
            },
        }]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'improved',
            note: '  bloco controlado  ',
        });

        expect(result).toEqual({
            success: true,
            outcome: expect.objectContaining({
                id: expect.any(String),
                sessionId: 'session-1',
                status: 'improved',
                evidenceStrength: 'confirmed_by_compatible_clip',
                note: 'bloco controlado',
                coachSnapshot: expect.objectContaining({
                    tier: 'test_protocol',
                    primaryFocusArea: 'vertical_control',
                    protocolId: 'vertical-drill',
                    validationTarget: 'vertical_control',
                    precisionTrendLabel: 'validated_progress',
                }),
            }),
        });
        expect(mocks.outcomeValues).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            analysisSessionId: 'session-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'improved',
            reasonCodes: [],
            note: 'bloco controlado',
            evidenceStrength: 'confirmed_by_compatible_clip',
            payload: expect.objectContaining({
                validationTarget: 'vertical_control',
                recordedBy: 'user',
            }),
        }));
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/history');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/history/session-1');
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('creates a new linked row when correcting a prior outcome', async () => {
        mocks.limit
            .mockResolvedValueOnce([{
                id: 'session-1',
                fullResult: {
                    coachPlan: createStoredCoachPlan(),
                },
            }])
            .mockResolvedValueOnce([{ id: 'outcome-original' }]);

        const result = await recordCoachProtocolOutcome({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'worse',
            reasonCodes: ['poor_execution'],
            revisionOfOutcomeId: 'outcome-original',
        });

        expect(result).toEqual({
            success: true,
            outcome: expect.objectContaining({
                revisionOfOutcomeId: 'outcome-original',
                evidenceStrength: 'invalid',
            }),
        });
        expect(mocks.outcomeValues).toHaveBeenCalledWith(expect.objectContaining({
            revisionOfId: 'outcome-original',
            evidenceStrength: 'invalid',
            payload: expect.objectContaining({
                metadata: expect.objectContaining({
                    invalidBecauseOfExecutionOrCapture: true,
                }),
            }),
        }));
        expect(mocks.update).not.toHaveBeenCalled();
    });
});

describe('complete training protocol revision and transfer actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.limit.mockReset();
        mocks.insert.mockReset();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });
        mocks.insert.mockImplementation((table) => {
            if (table === completeTrainingProtocolRevisions) {
                return {
                    values: mocks.revisionValues,
                };
            }

            if (table === trainingProtocolTransferRecords) {
                return {
                    values: mocks.transferValues,
                };
            }

            throw new Error('Unexpected table');
        });
        mocks.revisionValues.mockResolvedValue(undefined);
        mocks.transferValues.mockResolvedValue(undefined);
    });

    it('rejects unauthenticated protocol revision attempts', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await recordCompleteTrainingProtocolRevision({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            revisionReason: 'Nova validacao compativel.',
            changedFields: ['tier'],
            revisedProtocol: createCompleteProtocol(),
            evidencePayload: { source: 'compatible_clip' },
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects protocol revisions for sessions the user does not own', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await recordCompleteTrainingProtocolRevision({
            sessionId: 'other-session',
            coachPlanId: 'plan-1',
            revisionReason: 'Nova validacao compativel.',
            changedFields: ['tier'],
            revisedProtocol: createCompleteProtocol(),
            evidencePayload: { source: 'compatible_clip' },
        });

        expect(result).toEqual({
            success: false,
            error: 'Sessao nao encontrada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('records protocol revision direction as more conservative when the revised tier is weaker', async () => {
        const previousProtocol = createCompleteProtocol({ tier: 'stabilize_block' });
        const revisedProtocol = createCompleteProtocol({ tier: 'test_protocol' });

        mocks.limit.mockResolvedValueOnce([{
            id: 'session-1',
            fullResult: {
                coachPlan: {
                    ...createStoredCoachPlan(),
                    completeProtocol: previousProtocol,
                },
            },
        }]);

        const result = await recordCompleteTrainingProtocolRevision({
            sessionId: 'session-1',
            coachPlanId: 'plan-1',
            revisionReason: 'Fadiga no bloco anterior.',
            changedFields: ['tier', 'dose.durationMinutes'],
            revisedProtocol,
            evidencePayload: { source: 'outcome', status: 'fatigue_or_pain' },
        });

        expect(result).toEqual({
            success: true,
            revision: expect.objectContaining({
                sessionId: 'session-1',
                protocolId: 'complete-protocol-1',
                tierDirection: 'more_conservative',
                previousProtocol,
                revisedProtocol,
            }),
        });
        expect(mocks.revisionValues).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            analysisSessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'complete-protocol-1',
            revisionReason: 'Fadiga no bloco anterior.',
            tierDirection: 'more_conservative',
            previousProtocol,
            revisedProtocol,
        }));
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/history/session-1');
    });

    it('records real-match transfer as practical evidence, never technical validation', async () => {
        mocks.limit.mockResolvedValueOnce([{ id: 'session-1' }]);

        const result = await recordTrainingProtocolTransfer({
            sessionId: 'session-1',
            protocolId: 'complete-protocol-1',
            situation: 'TDM em pressao media',
            weaponId: 'beryl-m762',
            opticId: 'red-dot',
            approximateDistanceMeters: 32,
            pressureLevel: 'media',
            feltControl: 'melhor',
            result: 'improved',
            note: 'controle sustentou no primeiro spray',
        });

        expect(result).toEqual({
            success: true,
            transfer: expect.objectContaining({
                sessionId: 'session-1',
                protocolId: 'complete-protocol-1',
                result: 'improved',
                countsAsTechnicalValidation: false,
            }),
        });
        expect(mocks.transferValues).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            analysisSessionId: 'session-1',
            protocolId: 'complete-protocol-1',
            result: 'improved',
            countsAsTechnicalValidation: false,
        }));
    });
});

describe('buildCompatibleValidationChecklistFromProtocol', () => {
    it('returns the strict fields needed to record the next compatible clip', () => {
        const checklist = buildCompatibleValidationChecklistFromProtocol(createCompleteProtocol());

        expect(checklist).toEqual(expect.objectContaining({
            weapon: 'Beryl M762',
            optic: 'Red Dot',
            distance: '30m',
            stance: 'standing',
            sensitivity: 'balanced',
            duration: '12 min',
            successCriterion: 'VCI melhora sem piorar ruido horizontal.',
        }));
        expect(checklist.checklist.join(' ')).toContain('Arma');
        expect(checklist.checklist.join(' ')).toContain('Mira');
        expect(checklist.checklist.join(' ')).toContain('Distancia');
    });
});

describe('getCoachProtocolOutcomesForSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });
        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
    });

    it('returns owned session outcomes as typed audit records', async () => {
        mocks.limit.mockResolvedValueOnce([{ id: 'session-1' }]);
        mocks.orderBy.mockResolvedValueOnce([{
            id: 'outcome-1',
            userId: 'user-1',
            analysisSessionId: 'session-1',
            coachPlanId: 'plan-1',
            protocolId: 'vertical-drill',
            focusArea: 'vertical_control',
            status: 'started',
            reasonCodes: [],
            note: null,
            revisionOfId: null,
            evidenceStrength: 'neutral',
            conflictPayload: null,
            payload: {
                coachSnapshot: {
                    tier: 'test_protocol',
                    primaryFocusArea: 'vertical_control',
                    primaryFocusTitle: 'Controle vertical',
                    protocolId: 'vertical-drill',
                    validationTarget: 'vertical_control',
                },
            },
            createdAt: new Date('2026-05-06T00:00:00.000Z'),
            updatedAt: new Date('2026-05-06T00:00:00.000Z'),
        }]);

        const outcomes = await getCoachProtocolOutcomesForSession('session-1');

        expect(outcomes).toEqual([
            expect.objectContaining({
                id: 'outcome-1',
                sessionId: 'session-1',
                status: 'started',
                evidenceStrength: 'neutral',
                coachSnapshot: expect.objectContaining({
                    protocolId: 'vertical-drill',
                }),
            }),
        ]);
    });
});

describe('getHistorySessions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
            orderBy: mocks.orderBy,
        });
    });

    it('returns normalized recommended profile and acceptance feedback for history cards', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-1',
                weaponId: 'beryl-m762',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 78,
                verticalControl: 1.02,
                horizontalNoise: 0.18,
                createdAt: new Date('2026-04-17T12:00:00.000Z'),
                weaponName: 'Beryl M762',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'same',
                            testedProfile: 'balanced',
                            recordedAt: '2026-04-17T12:30:00.000Z',
                        },
                    },
                    mastery: {
                        actionState: 'testable',
                        actionLabel: 'Testavel',
                        blockedRecommendations: ['Validar mais um clip antes de consolidar.'],
                        evidence: {
                            confidence: 0.84,
                            coverage: 0.82,
                            sampleSize: 24,
                            usableForAnalysis: true,
                        },
                    },
                },
            },
        ]);

        const sessions = await getHistorySessions();

        expect(sessions).toEqual([
            expect.objectContaining({
                id: 'session-1',
                recommendedProfile: 'balanced',
                acceptanceFeedback: expect.objectContaining({
                    outcome: 'same',
                    testedProfile: 'balanced',
                    recordedAt: '2026-04-17T12:30:00.000Z',
                }),
                evidenceSummary: expect.objectContaining({
                    actionState: 'testable',
                    verdictLabel: 'Testavel',
                    confidence: 0.84,
                    coverage: 0.82,
                    sampleSize: 24,
                    blockerReasons: ['Validar mais um clip antes de consolidar.'],
                    usableForAnalysis: true,
                }),
            }),
        ]);
    });

    it('drops malformed acceptance feedback instead of leaking invalid payloads to the page', async () => {
        mocks.orderBy.mockResolvedValue([
            {
                id: 'session-2',
                weaponId: 'm416',
                scopeId: 'red-dot',
                patchVersion: CURRENT_PUBG_PATCH_VERSION,
                stabilityScore: 84,
                verticalControl: 0.98,
                horizontalNoise: 0.14,
                createdAt: new Date('2026-04-17T13:00:00.000Z'),
                weaponName: 'M416',
                weaponCategory: 'ar',
                fullResult: {
                    sensitivity: {
                        recommended: 'balanced',
                        acceptanceFeedback: {
                            outcome: 'broken',
                            testedProfile: 'balanced',
                            recordedAt: 123,
                        },
                    },
                },
            },
        ]);

        const [session] = await getHistorySessions();

        expect(session).toMatchObject({
            id: 'session-2',
            recommendedProfile: 'balanced',
        });
        expect(session).not.toHaveProperty('acceptanceFeedback');
    });

    it('adds the latest coach protocol outcome status to history cards', async () => {
        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'session-1',
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 78,
                    verticalControl: 1.02,
                    horizontalNoise: 0.18,
                    createdAt: new Date('2026-04-17T12:00:00.000Z'),
                    weaponName: 'Beryl M762',
                    weaponCategory: 'ar',
                    fullResult: {
                        coachPlan: createStoredCoachPlan(),
                    },
                },
            ])
            .mockResolvedValueOnce([
                createStoredCoachOutcomeRow({
                    analysisSessionId: 'session-1',
                    status: 'improved',
                    evidenceStrength: 'conflict',
                    conflictPayload: {
                        userOutcomeId: 'outcome-1',
                        precisionTrendLabel: 'validated_regression',
                        reason: 'Self-report improved, but strict compatible precision validated regression.',
                        nextValidationCopy: 'Grave uma validacao curta antes de avancar.',
                    },
                }),
                createStoredCoachOutcomeRow({
                    id: 'outcome-2',
                    analysisSessionId: 'session-1',
                    status: 'worse',
                    evidenceStrength: 'invalid',
                    conflictPayload: null,
                    revisionOfId: 'outcome-1',
                }),
            ]);

        const [session] = await getHistorySessions();

        expect(session).toMatchObject({
            id: 'session-1',
            coachOutcomeStatus: {
                status: 'worse',
                label: 'Piorou no treino',
                evidenceStrength: 'invalid',
                revisionCount: 1,
            },
        });
    });

    it('adds Ciclo Pro continuity without turning pending validation into proof', async () => {
        const cycle = createTrainingProgramCycleSnapshot();

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'session-1',
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 78,
                    verticalControl: 1.02,
                    horizontalNoise: 0.18,
                    createdAt: new Date('2026-05-05T12:00:00.000Z'),
                    weaponName: 'Beryl M762',
                    weaponCategory: 'ar',
                    fullResult: {
                        mastery: {
                            actionState: 'testable',
                            actionLabel: 'Testavel',
                            blockedRecommendations: ['Validar mais um clip antes de consolidar.'],
                            evidence: {
                                confidence: 0.78,
                                coverage: 0.8,
                                sampleSize: 24,
                                usableForAnalysis: true,
                            },
                        },
                    },
                },
            ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    baseAnalysisSessionId: 'session-1',
                    kind: 'ciclo_pro',
                    state: 'validacao_pendente',
                    currentWeekNumber: 2,
                    reasonCodes: ['compatible_proof_missing'],
                    visibleReason: 'Validacao compativel pendente.',
                    blockerSummary: 'Ainda falta validacao compativel.',
                    snapshot: cycle,
                    updatedAt: new Date('2026-05-06T12:00:00.000Z'),
                    archivedAt: null,
                    completedAt: null,
                },
            ]);

        const [session] = await getHistorySessions();

        expect(session.trainingProgramContinuity).toEqual(expect.objectContaining({
            kindLabel: 'Ciclo Pro',
            cycleLabel: 'Ciclo Pro Beryl 3x 50m',
            stateLabel: 'Validacao pendente',
            weekLabel: 'Semana 2/4',
            latestMissionLabel: 'Validar controle vertical no contexto Beryl',
            latestCheckpointLayerLabel: 'Checkpoint semanal operacional',
            nextActionLabel: 'Gravar validacao compativel',
            projectionDepth: 'basic_next_step',
            canSeeProgramAudit: false,
        }));
        expect(session.trainingProgramContinuity?.blockerReasons.join(' ')).toContain('clip compativel');
        expect(session.trainingProgramContinuity?.latestCheckpointLabel).not.toMatch(/progresso validado/i);
    });

    it('keeps restarted program line labels tied to the archived cycle row', async () => {
        const archivedCycle = createTrainingProgramCycleSnapshot({
            id: 'program-cycle-archived',
            state: 'linha_reiniciada',
            label: 'Ciclo Pro Beryl 3x 50m - linha anterior',
            archivedLines: [{
                lineId: 'line-old',
                contextKey: 'beryl:red-dot:50m',
                label: 'Linha antiga Beryl / Red Dot / 50m',
                active: false,
                startedAt: '2026-05-01T12:00:00.000Z',
                archivedAt: '2026-05-06T12:00:00.000Z',
                restartReasonCodes: ['line_restart'],
            }],
            currentWeekNumber: 1,
            reasonCodes: ['line_restart'],
        });

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'session-archived',
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 71,
                    verticalControl: 1.08,
                    horizontalNoise: 0.22,
                    createdAt: new Date('2026-05-01T12:00:00.000Z'),
                    weaponName: 'Beryl M762',
                    weaponCategory: 'ar',
                    fullResult: {},
                },
            ])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    baseAnalysisSessionId: 'session-archived',
                    kind: 'ciclo_pro',
                    state: 'linha_reiniciada',
                    currentWeekNumber: 1,
                    reasonCodes: ['line_restart'],
                    visibleReason: 'Linha reiniciada por contexto novo.',
                    blockerSummary: 'Linha anterior arquivada.',
                    snapshot: archivedCycle,
                    updatedAt: new Date('2026-05-06T12:00:00.000Z'),
                    archivedAt: new Date('2026-05-06T12:00:00.000Z'),
                    completedAt: null,
                },
            ]);

        const [session] = await getHistorySessions();

        expect(session.trainingProgramContinuity).toEqual(expect.objectContaining({
            cycleId: 'program-cycle-archived',
            cycleLabel: 'Ciclo Pro Beryl 3x 50m - linha anterior',
            stateLabel: 'Linha reiniciada',
            archivedLineCount: 1,
        }));
    });

    it('adds owner-scoped Social Pro report and library continuity to history cards', async () => {
        const proQuota = createQuotaSummary({
            tier: 'pro',
            limit: 100,
            used: 12,
            remaining: 88,
            state: 'available',
        });
        mocks.resolveAnalysisSaveAccessWithResolution.mockResolvedValueOnce({
            state: createSaveAccessState({
                accessState: 'pro_active',
                billingStatus: 'active',
                quota: proQuota,
            }),
            access: createProductAccessResolution({
                effectiveTier: 'pro',
                accessState: 'pro_active',
                source: 'stripe_subscription',
                billingStatus: 'active',
                quota: proQuota,
                features: {
                    'community.premium_report_share': {
                        key: 'community.premium_report_share',
                        granted: true,
                    },
                    'community.pro_library': {
                        key: 'community.pro_library',
                        granted: true,
                    },
                    'community.private_report_links': {
                        key: 'community.private_report_links',
                        granted: true,
                    },
                },
            }),
        });

        const orderByResponses = [
            [
                {
                    id: 'session-1',
                    weaponId: 'beryl-m762',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 78,
                    verticalControl: 1.02,
                    horizontalNoise: 0.18,
                    createdAt: new Date('2026-05-08T12:00:00.000Z'),
                    weaponName: 'Beryl M762',
                    weaponCategory: 'ar',
                    fullResult: {
                        mastery: {
                            actionState: 'testable',
                            actionLabel: 'Testavel',
                            blockedRecommendations: [],
                            evidence: {
                                confidence: 0.82,
                                coverage: 0.8,
                                sampleSize: 28,
                                usableForAnalysis: true,
                            },
                        },
                    },
                },
            ],
            [],
            [],
            [],
            [
                {
                    id: 'report-1',
                    sourceAnalysisSessionId: 'session-1',
                    sourceHistorySessionId: null,
                    title: 'Relatorio Pro Beryl 3x',
                    visibility: 'link_private',
                    status: 'published',
                    updatedAt: new Date('2026-05-08T12:10:00.000Z'),
                },
                {
                    id: 'report-other',
                    sourceAnalysisSessionId: 'session-other',
                    sourceHistorySessionId: null,
                    title: 'Outro relatorio',
                    visibility: 'public',
                    status: 'published',
                    updatedAt: new Date('2026-05-08T12:20:00.000Z'),
                },
            ],
            [
                {
                    reportId: 'report-1',
                    id: 'link-1',
                    status: 'active',
                    expiresAt: null,
                    updatedAt: new Date('2026-05-08T12:12:00.000Z'),
                },
            ],
            [
                {
                    reportId: 'report-1',
                    collectionId: 'collection-1',
                    collectionLabel: 'Beryl 3x 50m',
                    collectionMode: 'automatic',
                    contextKey: 'weapon:beryl-m762|optic:red-dot|distance:50m',
                    createdAt: new Date('2026-05-08T12:15:00.000Z'),
                },
            ],
        ];
        let orderByCall = 0;
        mocks.orderBy.mockImplementation(() => Promise.resolve(orderByResponses[orderByCall++] ?? []));

        const [session] = await getHistorySessions();

        expect(session.socialPro).toEqual(expect.objectContaining({
            canGenerateReport: true,
            canSaveToLibrary: true,
            report: expect.objectContaining({
                id: 'report-1',
                title: 'Relatorio Pro Beryl 3x',
                visibilityLabel: 'Link privado',
                statusLabel: 'Publicado',
                discoverableInFeed: false,
            }),
            privateLink: expect.objectContaining({
                id: 'link-1',
                statusLabel: 'Ativo',
            }),
            library: expect.objectContaining({
                saved: true,
                collectionCount: 1,
                collectionLabels: ['Beryl 3x 50m'],
                visibilityLabel: 'Privada',
            }),
            nextAction: expect.objectContaining({
                kind: 'manage_report',
                label: 'Atualizar relatorio Pro',
            }),
        }));
        expect(session.socialPro?.report?.id).not.toBe('report-other');
    });

    it('keeps Free history readable while locking only Social Pro report and library controls', async () => {
        const orderByResponses = [
            [
                {
                    id: 'session-free',
                    weaponId: 'm416',
                    scopeId: 'red-dot',
                    patchVersion: CURRENT_PUBG_PATCH_VERSION,
                    stabilityScore: 70,
                    verticalControl: 1.08,
                    horizontalNoise: 0.22,
                    createdAt: new Date('2026-05-08T13:00:00.000Z'),
                    weaponName: 'M416',
                    weaponCategory: 'ar',
                    fullResult: {
                        mastery: {
                            actionState: 'capture_again',
                            actionLabel: 'Recapturar',
                            blockedRecommendations: ['Cobertura baixa.'],
                            evidence: {
                                confidence: 0.52,
                                coverage: 0.44,
                                sampleSize: 12,
                                usableForAnalysis: false,
                            },
                        },
                    },
                },
            ],
            [],
            [],
            [],
            [],
            [],
            [],
        ];
        let orderByCall = 0;
        mocks.orderBy.mockImplementation(() => Promise.resolve(orderByResponses[orderByCall++] ?? []));

        const [session] = await getHistorySessions();

        expect(session.evidenceSummary).toEqual(expect.objectContaining({
            verdictLabel: 'Recapturar',
            confidence: 0.52,
            coverage: 0.44,
            blockerReasons: ['Cobertura baixa.'],
            usableForAnalysis: false,
        }));
        expect(session.socialPro).toEqual(expect.objectContaining({
            canGenerateReport: false,
            canSaveToLibrary: false,
            report: null,
            library: expect.objectContaining({
                saved: false,
                normalCommunitySaveAllowed: true,
            }),
            reportLock: expect.objectContaining({
                featureKey: 'community.premium_report_share',
            }),
            libraryLock: expect.objectContaining({
                featureKey: 'community.pro_library',
            }),
            nextAction: expect.objectContaining({
                kind: 'upgrade',
                label: 'Organizar no Pro social',
            }),
        }));
    });
});

describe('getPrecisionHistoryLines', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
            leftJoin: mocks.leftJoin,
        });
        mocks.where.mockReturnValue({
            orderBy: mocks.orderBy,
        });
    });

    it('returns compatible precision groups with checkpoint timeline summaries', async () => {
        const trend = createStoredPrecisionTrend();

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'line-1',
                    compatibilityKey: JSON.stringify({
                        patchVersion: CURRENT_PUBG_PATCH_VERSION,
                        weaponId: 'beryl-m762',
                        scopeId: 'red-dot',
                        stance: 'standing',
                        muzzle: 'compensator',
                        grip: 'vertical',
                        stock: 'none',
                        distanceMeters: 30,
                        sprayProtocolKey: 'window:2700:30',
                    }),
                    status: 'validated_progress',
                    variableInTest: 'vertical_control',
                    baselineSessionId: 'session-baseline',
                    currentSessionId: 'session-current',
                    validClipCount: 3,
                    blockedClipCount: 0,
                    payload: {
                        trend,
                        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
                    },
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                    updatedAt: new Date('2026-04-20T12:00:00.000Z'),
                },
            ])
            .mockResolvedValueOnce([
                {
                    id: 'checkpoint-1',
                    lineId: 'line-1',
                    analysisSessionId: 'session-current',
                    state: 'validated_progress',
                    variableInTest: 'vertical_control',
                    payload: {
                        trend,
                        nextValidationHint: 'Consolidar antes de mudar outra variavel.',
                    },
                    createdAt: new Date('2026-04-20T12:00:00.000Z'),
                },
            ]);

        const lines = await getPrecisionHistoryLines();

        expect(lines).toEqual([
            expect.objectContaining({
                id: 'line-1',
                contextLabel: expect.stringContaining('beryl-m762'),
                statusLabel: 'Progresso validado',
                latestTrendLabel: 'validated_progress',
                variableInTest: 'vertical_control',
                validClipCount: 3,
                blockedClipCount: 0,
                nextValidation: 'Consolidar antes de mudar outra variavel.',
                checkpoints: [
                    expect.objectContaining({
                        id: 'checkpoint-1',
                        stateLabel: 'Progresso validado',
                        analysisSessionId: 'session-current',
                    }),
                ],
            }),
        ]);
    });

    it('keeps blocked precision reasons visible for history audit cards', async () => {
        const trend = createStoredPrecisionTrend({
            label: 'not_comparable',
            evidenceLevel: 'blocked',
            compatibleCount: 0,
            blockerSummaries: [{
                code: 'capture_quality_weak',
                count: 1,
                message: 'Qualidade fraca bloqueia trend preciso.',
                resultIds: ['blocked-result'],
            }],
            blockedClips: [{
                resultId: 'blocked-result',
                blockers: [{
                    code: 'capture_quality_weak',
                    field: 'mastery.evidence',
                    message: 'Qualidade fraca bloqueia trend preciso.',
                }],
            }],
        });

        mocks.orderBy
            .mockResolvedValueOnce([
                {
                    id: 'blocked-line',
                    compatibilityKey: 'blocked:session-blocked',
                    status: 'not_comparable',
                    variableInTest: 'capture_quality',
                    baselineSessionId: null,
                    currentSessionId: 'session-blocked',
                    validClipCount: 0,
                    blockedClipCount: 1,
                    payload: {
                        trend,
                        nextValidationHint: 'Grave outro clip com captura limpa.',
                    },
                    createdAt: new Date('2026-04-18T12:00:00.000Z'),
                    updatedAt: new Date('2026-04-18T12:00:00.000Z'),
                },
            ])
            .mockResolvedValueOnce([]);

        const [line] = await getPrecisionHistoryLines();

        expect(line).toMatchObject({
            id: 'blocked-line',
            contextLabel: 'Clip bloqueado sem linha compativel',
            statusLabel: 'Nao comparavel',
            validClipCount: 0,
            blockedClipCount: 1,
            blockerReasons: ['Qualidade fraca bloqueia trend preciso.'],
        });
    });
});
