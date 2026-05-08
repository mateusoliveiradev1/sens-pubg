import { describe, expect, it } from 'vitest';
import type { AnalysisResult, CoachFeedback, CoachPlan, CompleteTrainingProtocol, Diagnosis, PrecisionTrendSummary, SensitivityRecommendation, SprayMastery, SprayMetrics } from '@/types/engine';
import { resolveAnalysisDecision } from '@/core/analysis-decision';
import {
    buildAdaptiveCoachLoopModel,
    buildAnalysisQuotaNoticeModel,
    buildEvidenceBadges,
    buildMasteryPillarCards,
    buildPremiumLockCards,
    buildPrecisionTrendBlockModel,
    buildResultMetricCards,
    buildResultVerdictModel,
    buildTrainingProgramEntryModel,
    buildTrainingProgramHref,
    groupCoachFeedbackByDiagnosis,
    splitDiagnosesBySeverity,
} from './results-dashboard-view-model';
import { buildCompleteTrainingProtocolViewModel } from './complete-training-protocol-view-model';

const baseMetrics = {
    verticalControlIndex: 0.59,
    horizontalNoiseIndex: 2.8,
    linearErrorCm: 57.4,
    linearErrorSeverity: 128,
    initialRecoilResponseMs: 83,
} as SprayMetrics;

const baseTrackingOverview = {
    coverage: 0.88,
    confidence: 0.86,
    visibleFrames: 88,
    framesLost: 12,
    framesProcessed: 100,
};

const baseSensitivity = {
    tier: 'test_profiles',
    evidenceTier: 'moderate',
    confidenceScore: 0.72,
} as SensitivityRecommendation;

function createMastery(overrides: Partial<SprayMastery> = {}): SprayMastery {
    return {
        actionState: 'testable',
        actionLabel: 'Testavel',
        mechanicalLevel: 'advanced',
        mechanicalLevelLabel: 'Avancado',
        actionableScore: 74,
        mechanicalScore: 79,
        pillars: {
            control: 82,
            consistency: 68,
            confidence: 86,
            clipQuality: 81,
        },
        evidence: {
            coverage: 0.88,
            confidence: 0.86,
            visibleFrames: 88,
            lostFrames: 12,
            framesProcessed: 100,
            sampleSize: 24,
            qualityScore: 81,
            usableForAnalysis: true,
        },
        reasons: ['Nivel mecanico observado: Avancado.'],
        blockedRecommendations: [],
        ...overrides,
    };
}

function createCoachPlan(overrides: Partial<CoachPlan> = {}): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Use o proximo bloco como teste controlado.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Spray subindo e a captura sustenta teste.',
            priorityScore: 0.7,
            severity: 4,
            confidence: 0.82,
            coverage: 0.84,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [],
        actionProtocols: [],
        nextBlock: {
            title: 'Bloco curto de teste de controle vertical',
            durationMinutes: 12,
            steps: [
                'Faca 3 sprays comparaveis focados em controle vertical.',
                'Mantenha arma, mira, distancia, postura e sensibilidade fixos.',
                'Use o proximo video para confirmar se o mesmo sinal se repete.',
            ],
            checks: [{
                label: 'Validacao de controle vertical',
                target: 'reduzir o erro vertical sustentado',
                minimumCoverage: 0.7,
                minimumConfidence: 0.7,
                successCondition: 'Sucesso quando controle vertical melhorar e cobertura/confianca continuarem acima do limite.',
                failCondition: 'Falha se controle vertical nao melhorar.',
            }],
        },
        stopConditions: [],
        adaptationWindowDays: 2,
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function createCompleteProtocol(overrides: Partial<CompleteTrainingProtocol> = {}): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'complete-protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'test_protocol',
        title: 'Ficha de controle vertical',
        summary: 'Treino controlado para pull vertical.',
        environment: 'training_mode',
        context: {
            weaponId: 'beryl-m762',
            weaponName: 'Beryl M762',
            opticId: 'red-dot',
            opticName: 'Red Dot',
            distanceMode: 'unknown',
            stance: 'standing',
            attachments: {
                muzzle: 'compensator',
                grip: 'vertical',
                stock: 'none',
                missing: [],
            },
            sensitivityProfile: 'balanced',
            supportStatus: 'full',
            personalizationLimited: true,
            limitationReasons: ['missing_distance'],
        },
        objective: 'Treinar controle vertical sem misturar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 4,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Parede do Training Mode',
        executionSteps: ['Spray 1', 'Spray 2', 'Spray 3', 'Spray 4'],
        preparation: [
            { id: 'space', label: 'Espaco do mousepad', reason: 'Evita travar o pull.', required: true, safetyKind: 'setup_control' },
            { id: 'grip', label: 'Grip repetivel', reason: 'Mantem variavel fixa.', required: true, safetyKind: 'variable_control' },
            { id: 'rest', label: 'Pausa curta', reason: 'Evita fadiga.', required: true, safetyKind: 'rest' },
            { id: 'stop', label: 'Parar com dor', reason: 'Seguranca do bloco.', required: true, safetyKind: 'stop_rule' },
            { id: 'posture', label: 'Postura repetivel', reason: 'Controla setup.', required: true, safetyKind: 'setup_control' },
            { id: 'extra', label: 'Item extra', reason: 'Nao deve aparecer.', required: false, safetyKind: 'setup_control' },
        ],
        validation: {
            compatibleClipChecklist: ['Mesma arma', 'Mesma mira', 'Mesma distancia', 'Mesma postura'],
            minimumConfidence: 0.75,
            minimumCoverage: 0.8,
            successCriteria: ['VCI melhora sem piorar ruido.'],
            failCriteria: ['Cobertura cai.'],
            variableControlChecklist: ['Nao trocar grip'],
            nextClipCopy: 'Grave o proximo clip igual.',
        },
        transfer: {
            situationChecklist: ['TDM curta', 'Mesma arma/mira', 'Pressao media'],
            conservativeConfidenceCopy: 'Transferencia pratica.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'test_protocol',
            tierAfter: 'test_protocol',
            reasons: ['missing_distance'],
            blockedFields: ['distance'],
            repairCtas: ['Confirmar distancia do clip'],
            userCopy: 'Distancia ausente bloqueia criterio exato.',
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
        stopConditions: ['Parar se houver dor.'],
        continueCriteria: ['Continuar com cobertura suficiente.'],
        antiMixingNotes: ['Nao misturar sens e grip.'],
        freeSummary: ['Foco e duracao visiveis.'],
        proSections: ['Auditoria completa'],
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function createPrecisionTrend(overrides: Partial<PrecisionTrendSummary> = {}): PrecisionTrendSummary {
    return {
        label: 'baseline',
        evidenceLevel: 'baseline',
        compatibleCount: 1,
        baseline: {
            resultId: 'clip-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 72,
            mechanicalScore: 75,
            coverage: 0.9,
            confidence: 0.88,
            clipQuality: 84,
        },
        current: {
            resultId: 'clip-1',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 72,
            mechanicalScore: 75,
            coverage: 0.9,
            confidence: 0.88,
            clipQuality: 84,
        },
        recentWindow: null,
        actionableDelta: null,
        mechanicalDelta: null,
        pillarDeltas: [],
        recurringDiagnoses: [],
        blockerSummaries: [],
        blockedClips: [],
        confidence: 0.88,
        coverage: 0.9,
        nextValidationHint: 'Grave outro clip compativel.',
        ...overrides,
    };
}

function createAnalysisResultForCoachLoop(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: new Date('2026-04-18T12:00:00.000Z'),
        patchVersion: '36.1',
        trajectory: {} as AnalysisResult['trajectory'],
        loadout: {} as AnalysisResult['loadout'],
        metrics: baseMetrics,
        diagnoses: [],
        sensitivity: baseSensitivity,
        coaching: [],
        coachPlan: createCoachPlan({
            secondaryFocuses: [
                {
                    ...createCoachPlan().primaryFocus,
                    id: 'timing',
                    area: 'timing',
                    title: 'Tempo de resposta',
                },
                {
                    ...createCoachPlan().primaryFocus,
                    id: 'consistency',
                    area: 'consistency',
                    title: 'Consistencia',
                },
                {
                    ...createCoachPlan().primaryFocus,
                    id: 'sensitivity',
                    area: 'sensitivity',
                    title: 'Sensibilidade',
                },
            ],
        }),
        ...overrides,
    };
}

describe('results dashboard view model', () => {
    it('uses diagnosis evidence thresholds when classifying metric cards', () => {
        const diagnoses = [{
            type: 'excessive_jitter',
            severity: 5,
            horizontalNoise: 2.8,
            threshold: 0.18,
            description: 'Jitter critico.',
            cause: 'Micro-ajustes excessivos.',
            remediation: 'Relaxar grip.',
        }] as readonly Diagnosis[];

        const cards = buildResultMetricCards({
            metrics: baseMetrics,
            diagnoses,
            sensitivity: { suggestedVSM: 0.88 },
            linearErrorLabel: 'Erro Linear',
            linearErrorUnit: 'cm @ aprox. 10m',
        });

        expect(cards.find((card) => card.label === 'Ruido Horizontal')).toMatchObject({
            tone: 'error',
            reference: 'Limite 0.18 deg',
            meterPercent: 100,
        });
    });

    it('builds preflight quota blockers without making the client authoritative', () => {
        const model = buildAnalysisQuotaNoticeModel({
            saveAccess: {
                authenticated: true,
                canSave: false,
                accessState: 'free_limit_reached',
                billingStatus: 'none',
                quota: {
                    tier: 'free',
                    limit: 3,
                    used: 3,
                    remaining: 0,
                    state: 'limit_reached',
                    periodStart: new Date('2026-05-01T00:00:00.000Z'),
                    periodEnd: new Date('2026-06-01T00:00:00.000Z'),
                    warningAt: 2,
                    reason: 'limit_blocked',
                },
                blocker: 'limit_blocked',
                message: 'Limite Free atingido (3/3).',
                ctaHref: '/pricing',
            },
        });

        expect(model).toEqual({
            label: 'Salvar vai bater no limite',
            body: 'Limite Free atingido (3/3).',
            usageLabel: '3/3 saves',
            tone: 'error',
            ctaLabel: 'Ver Pro',
            href: '/pricing',
        });
    });

    it('frames non-billable weak capture as guidance instead of blame or quota loss', () => {
        const model = buildAnalysisQuotaNoticeModel({
            quota: {
                status: 'non_billable',
                analysisSaveAttemptId: 'attempt-1',
                quota: {
                    tier: 'free',
                    limit: 3,
                    used: 0,
                    remaining: 3,
                    state: 'available',
                    periodStart: new Date('2026-05-01T00:00:00.000Z'),
                    periodEnd: new Date('2026-06-01T00:00:00.000Z'),
                    warningAt: 2,
                    reason: 'non_billable_weak_capture',
                },
                message: 'Este resultado foi salvo como evidencia de captura, sem consumir quota.',
                ctaHref: null,
            },
        });

        expect(model).toMatchObject({
            label: 'Salvo sem consumir quota',
            usageLabel: '0/3 saves',
            tone: 'info',
            href: null,
        });
        expect(model?.body).toContain('captura mais limpa');
        expect(model?.body.toLowerCase()).not.toMatch(/culpa|ruim demais|inutil/);
    });

    it('splits diagnoses by severity while preserving priority order', () => {
        const diagnoses = [
            { type: 'inconsistency', severity: 2 },
            { type: 'underpull', severity: 5 },
            { type: 'horizontal_drift', severity: 3 },
        ] as readonly Diagnosis[];

        const split = splitDiagnosesBySeverity(diagnoses);

        expect(split.majorDiagnoses.map((diagnosis) => diagnosis.type)).toEqual([
            'underpull',
            'horizontal_drift',
        ]);
        expect(split.minorDiagnoses.map((diagnosis) => diagnosis.type)).toEqual(['inconsistency']);
    });

    it('groups coach feedback by diagnosis type with computed priority labels', () => {
        const coaching = [
            { diagnosis: { type: 'underpull', severity: 5 } },
            { diagnosis: { type: 'underpull', severity: 3 } },
            { diagnosis: { type: 'horizontal_drift', severity: 3 } },
        ] as readonly CoachFeedback[];

        const groups = groupCoachFeedbackByDiagnosis(coaching);

        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({
            key: 'underpull',
            maxSeverity: 5,
            priorityTone: 'error',
            priorityLabel: 'CRITICO',
        });
        expect(groups[0]?.items).toHaveLength(2);
    });

    it('keeps weak evidence conservative with blocked recommendation copy', () => {
        const mastery = createMastery({
            actionState: 'inconclusive',
            actionLabel: 'Incerto',
            actionableScore: 45,
            evidence: {
                ...createMastery().evidence,
                coverage: 0.52,
                confidence: 0.55,
            },
            blockedRecommendations: ['Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.'],
        });

        const verdict = buildResultVerdictModel({
            mastery,
            coachPlan: createCoachPlan(),
            trackingOverview: {
                ...baseTrackingOverview,
                coverage: 0.52,
                confidence: 0.55,
            },
            sensitivity: {
                ...baseSensitivity,
                evidenceTier: 'weak',
            },
            diagnoses: [{ type: 'underpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Incerto');
        expect(verdict.scoreTone).toBe('info');
        expect(verdict.blockedReasons).toContain('Cobertura abaixo de 60% nao sustenta uma recomendacao agressiva.');
        expect(verdict.primaryExplanation).toContain('evidencia ainda nao sustenta protocolo forte');
    });

    it('adds decision-level blocker reasons to the verdict copy', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery({
                actionState: 'inconclusive',
                actionLabel: 'Incerto',
            }),
            coachPlan: createCoachPlan(),
            trackingOverview: baseTrackingOverview,
            sensitivity: {
                ...baseSensitivity,
                evidenceTier: 'weak',
            },
            diagnoses: [],
            analysisDecision: resolveAnalysisDecision({
                blockerReasons: ['low_confidence'],
                confidence: 0.55,
                coverage: 0.7,
            }),
        });

        expect(verdict.blockedReasons).toEqual(expect.arrayContaining([
            expect.stringContaining('partial_safe_read'),
            expect.stringContaining('low_confidence'),
        ]));
    });

    it('summarizes a testable result with the next controlled block', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery(),
            coachPlan: createCoachPlan(),
            trackingOverview: baseTrackingOverview,
            sensitivity: baseSensitivity,
            diagnoses: [{ type: 'underpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Testavel');
        expect(verdict.primaryExplanation).toContain('spray subindo');
        expect(verdict.nextBlock).toMatchObject({
            title: 'Bloco curto de teste de controle vertical',
            durationLabel: '12 min',
            validationLabel: 'Validacao de controle vertical',
        });
        expect(verdict.nextBlock?.steps).toHaveLength(3);
    });

    it('adds the complete training protocol model to usable verdicts', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery(),
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
            historySessionId: 'session-1',
            trackingOverview: baseTrackingOverview,
            sensitivity: baseSensitivity,
            diagnoses: [{ type: 'underpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.completeTrainingProtocol).toEqual(expect.objectContaining({
            headline: 'Ficha de controle vertical',
            durationLabel: '12 min',
            preparationItems: expect.arrayContaining([
                expect.objectContaining({ label: 'Espaco do mousepad' }),
            ]),
            blockerPanel: expect.objectContaining({
                reason: 'Distancia ausente',
            }),
            sprayLabCta: expect.objectContaining({
                label: 'Abrir Spray Lab',
                href: '/spray-lab?sourceSessionId=session-1&protocolId=complete-protocol-1',
            }),
        }));
        expect(verdict.completeTrainingProtocol?.preparationItems).toHaveLength(5);
        expect(verdict.completeTrainingProtocol?.transferCard.technicalProofCopy)
            .toContain('nao substitui a validacao compativel');
    });

    it('builds a standalone complete protocol view model from an analysis result', () => {
        const model = buildCompleteTrainingProtocolViewModel(createAnalysisResultForCoachLoop({
            historySessionId: 'session-1',
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
        }));

        expect(model?.summaryRows.map((row) => row.label)).toEqual([
            'Arma',
            'Mira',
            'Distancia',
            'Foco',
            'Alvo',
        ]);
        expect(model?.sprayLabCta.href).toBe('/spray-lab?sourceSessionId=session-1&protocolId=complete-protocol-1');
        expect(model?.validationCard.checklist.length).toBeLessThanOrEqual(8);
    });

    it('uses validation language for ready verdicts instead of final-skill claims', () => {
        const verdict = buildResultVerdictModel({
            mastery: createMastery({
                actionState: 'ready',
                actionLabel: 'Pronto',
                actionableScore: 88,
                mechanicalScore: 84,
                blockedRecommendations: [],
            }),
            coachPlan: createCoachPlan({ tier: 'apply_protocol' }),
            trackingOverview: baseTrackingOverview,
            sensitivity: {
                ...baseSensitivity,
                tier: 'apply_ready',
                evidenceTier: 'strong',
                confidenceScore: 0.91,
            },
            diagnoses: [{ type: 'overpull', severity: 4 }] as readonly Diagnosis[],
        });

        expect(verdict.actionLabel).toBe('Pronto');
        expect(verdict.scoreTone).toBe('success');
        expect(verdict.primaryExplanation).toContain('validacao curta');
        expect(verdict.primaryExplanation).not.toMatch(/perfeito|garantido|definitivo|verdade final/i);
    });

    it('builds mastery pillars in the exact report order', () => {
        const pillars = buildMasteryPillarCards(createMastery());

        expect(pillars.map((pillar) => pillar.label)).toEqual([
            'Controle',
            'Consistencia',
            'Confianca',
            'Qualidade do clip',
        ]);
    });

    it('builds evidence badges for confidence, coverage, frames, capture state, and clip quality', () => {
        const badges = buildEvidenceBadges({
            mastery: createMastery(),
            trackingOverview: baseTrackingOverview,
        });

        expect(badges.map((badge) => badge.label)).toEqual([
            'Confianca',
            'Cobertura',
            'Frames visiveis',
            'Frames perdidos',
            'Estado da leitura',
            'Qualidade do clip',
        ]);
    });

    it('turns premium projection locks into contextual Free/Pro cards', () => {
        const locks = buildPremiumLockCards({
            tier: 'free',
            accessState: 'free',
            billingStatus: 'none',
            quota: {
                tier: 'free',
                limit: 3,
                used: 1,
                remaining: 2,
                state: 'available',
                periodStart: new Date('2026-05-01T00:00:00.000Z'),
                periodEnd: new Date('2026-06-01T00:00:00.000Z'),
                warningAt: 2,
                reason: null,
            },
            visibleFeatureKeys: ['coach.summary'],
            hiddenFeatureKeys: ['coach.full_plan'],
            canSeeFullCoachPlan: false,
            canSeeFullHistory: false,
            canSeeAdvancedMetrics: false,
            canCaptureCoachOutcome: false,
            locks: [{
                featureKey: 'coach.full_plan',
                reason: 'pro_feature',
                title: 'Plano completo do coach',
                body: 'Visivel agora: resumo e evidencia. Com Pro: plano completo. Motivo: continuidade Pro.',
                ctaHref: '/pricing',
            }],
        });

        expect(locks).toEqual([expect.objectContaining({
            featureKey: 'coach.full_plan',
            reason: 'pro_feature',
            reasonLabel: 'Pro',
            ctaLabel: 'Ver Pro',
            body: expect.stringContaining('Visivel agora'),
        })]);
    });

    it('builds baseline precision trend copy as validation instead of progress', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend());

        expect(model).toMatchObject({
            label: 'Baseline',
            tone: 'warning',
            compatibleCountLabel: '1 clip compativel',
            ctaLabel: 'Gravar validacao compativel',
        });
        expect(model?.body).toContain('precisa de outro clip compativel');
        expect(`${model?.body} ${model?.conservativeReason}`.toLowerCase()).not.toContain('progresso validado');
    });

    it('builds initial precision signal copy as controlled validation', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend({
            label: 'initial_signal',
            evidenceLevel: 'initial',
            compatibleCount: 2,
            actionableDelta: {
                baseline: 70,
                current: 76,
                delta: 6,
                recentWindowAverage: 70,
                recentWindowDelta: 6,
            },
        }));

        expect(model?.label).toBe('Sinal inicial');
        expect(model?.compatibleCountLabel).toBe('2 clips compativeis');
        expect(model?.body).toContain('validar no proximo clip');
        expect(model?.deltaItems[0]).toMatchObject({
            label: 'Score acionavel',
            value: '+6 pts',
            tone: 'success',
        });
        expect(`${model?.body} ${model?.conservativeReason}`.toLowerCase()).not.toContain('progresso validado');
    });

    it('shows validated progress only when the trend label says progress', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend({
            label: 'validated_progress',
            evidenceLevel: 'strong',
            compatibleCount: 3,
            actionableDelta: {
                baseline: 68,
                current: 80,
                delta: 12,
                recentWindowAverage: 74,
                recentWindowDelta: 6,
            },
            mechanicalDelta: {
                baseline: 70,
                current: 78,
                delta: 8,
                recentWindowAverage: 74,
                recentWindowDelta: 4,
            },
            pillarDeltas: [{
                pillar: 'control',
                baseline: 70,
                current: 82,
                delta: 12,
                recentWindowAverage: 76,
                recentWindowDelta: 6,
                status: 'improved',
            }],
        }));

        expect(model?.label).toBe('Progresso validado');
        expect(model?.tone).toBe('success');
        expect(model?.body).toContain('Progresso validado');
        expect(model?.conservativeReason).toBeNull();
        expect(model?.pillarChips[0]).toMatchObject({
            label: 'Controle',
            value: '+12 pts',
            tone: 'success',
        });
    });

    it('turns validated regression into return-to-baseline copy', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend({
            label: 'validated_regression',
            evidenceLevel: 'strong',
            compatibleCount: 3,
            actionableDelta: {
                baseline: 80,
                current: 68,
                delta: -12,
                recentWindowAverage: 76,
                recentWindowDelta: -8,
            },
        }));

        expect(model?.tone).toBe('error');
        expect(model?.body).toContain('Volte para o baseline confiavel');
        expect(model?.conservativeReason).toContain('Regressao validada');
    });

    it('keeps oscillation conservative even with compatible clips', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend({
            label: 'oscillation',
            evidenceLevel: 'strong',
            compatibleCount: 4,
            actionableDelta: {
                baseline: 74,
                current: 76,
                delta: 2,
                recentWindowAverage: 75,
                recentWindowDelta: 1,
            },
        }));

        expect(model?.tone).toBe('warning');
        expect(model?.body).toContain('oscilou dentro da margem');
        expect(model?.conservativeReason).toContain('bloqueia leitura agressiva');
    });

    it('frames not comparable as precision control with blocker reasons', () => {
        const model = buildPrecisionTrendBlockModel(createPrecisionTrend({
            label: 'not_comparable',
            evidenceLevel: 'blocked',
            compatibleCount: 0,
            blockerSummaries: [{
                code: 'distance_ambiguous',
                count: 1,
                message: 'Distancia estimada bloqueia trend preciso.',
                resultIds: ['clip-1'],
            }],
            blockedClips: [{
                resultId: 'clip-1',
                blockers: [{
                    code: 'distance_ambiguous',
                    field: 'distanceMode',
                    message: 'Distancia estimada bloqueia trend preciso.',
                    currentValue: 'estimated',
                }],
            }],
        }));

        expect(model?.label).toBe('Nao comparavel');
        expect(model?.body).toContain('Controle de precisao bloqueou a comparacao');
        expect(model?.blockerReasons).toEqual(['Distancia estimada bloqueia trend preciso.']);
        expect(model?.ctaLabel).toBe('Gravar validacao compativel');
    });

    it('builds the compact adaptive coach loop with unsaved CTA and max two secondary focuses', () => {
        const model = buildAdaptiveCoachLoopModel(createAnalysisResultForCoachLoop());

        expect(model).toMatchObject({
            state: 'unsaved',
            statusLabel: 'Analise ainda sem memoria',
            primaryFocus: {
                title: 'Controle vertical',
            },
            nextBlock: {
                title: 'Bloco curto de teste de controle vertical',
                durationLabel: '12 min',
            },
            cta: {
                label: 'Gravar analise para registrar resultado',
                href: null,
            },
        });
        expect(model?.secondaryFocuses).toHaveLength(2);
        expect(model?.badges.map((badge) => badge.label)).toEqual([
            'Tier',
            'Confianca',
            'Cobertura',
            'Resultado',
        ]);
    });

    it('routes ready adaptive coach loops into the Spray Lab runner', () => {
        const model = buildAdaptiveCoachLoopModel(createAnalysisResultForCoachLoop({
            historySessionId: 'session-1',
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
        }));

        expect(model).toMatchObject({
            state: 'ready',
            cta: {
                label: 'Abrir Spray Lab',
                href: '/spray-lab?sourceSessionId=session-1&protocolId=complete-protocol-1',
                tone: 'info',
            },
        });
    });

    it('blocks Ciclo Pro entry until a result is saved and server-owned', () => {
        const model = buildTrainingProgramEntryModel(createAnalysisResultForCoachLoop({
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
        }));

        expect(buildTrainingProgramHref(createAnalysisResultForCoachLoop())).toBeNull();
        expect(model).toMatchObject({
            state: 'unsaved',
            title: 'Ciclo Pro',
            serverActionName: 'createTrainingProgramCycleAction',
            cta: {
                label: 'Salvar analise para abrir Ciclo Pro',
                href: null,
                disabled: true,
                tone: 'warning',
            },
        });
        expect(model.body).toContain('servidor confirmar propriedade');
    });

    it('routes weak saved analyses to Ciclo de Reparo instead of fake progress', () => {
        const weakResult = createAnalysisResultForCoachLoop({
            historySessionId: 'session-weak',
            mastery: createMastery({
                actionState: 'inconclusive',
                actionLabel: 'Incerto',
                blockedRecommendations: ['Cobertura abaixo de 60% bloqueia ciclo forte.'],
                evidence: {
                    ...createMastery().evidence,
                    coverage: 0.52,
                    confidence: 0.55,
                },
            }),
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
            analysisDecision: resolveAnalysisDecision({
                confidence: 0.55,
                coverage: 0.52,
                blockerReasons: ['low_confidence', 'low_coverage'],
            }),
        });
        const model = buildTrainingProgramEntryModel(weakResult);

        expect(model).toMatchObject({
            state: 'ciclo_reparo',
            title: 'Ciclo de Reparo',
            cta: {
                label: 'Abrir Ciclo de Reparo',
                href: '/ciclo-pro?sourceSessionId=session-weak&intent=repair&protocolId=complete-protocol-1',
                disabled: false,
                tone: 'warning',
            },
        });
        expect(model.body).toContain('nao trata evidencia fraca como progresso tecnico');
        expect(model.blockerReasons.join(' ')).toContain('low_confidence');
    });

    it('opens usable saved analyses into the Ciclo Pro start path with protocol context', () => {
        const model = buildTrainingProgramEntryModel(createAnalysisResultForCoachLoop({
            historySessionId: 'session-strong',
            mastery: createMastery(),
            coachPlan: createCoachPlan({
                completeProtocol: createCompleteProtocol(),
            }),
        }));

        expect(model).toMatchObject({
            state: 'ciclo_pro',
            title: 'Ciclo Pro',
            cta: {
                label: 'Abrir Ciclo Pro',
                href: '/ciclo-pro?sourceSessionId=session-strong&intent=start&protocolId=complete-protocol-1',
                disabled: false,
                tone: 'info',
            },
        });
        expect(`${model.body} ${model.proValueCopy}`.toLowerCase()).not.toMatch(/garant|perfeit|rank/);
    });

    it('routes adaptive coach conflicts to compatible validation instead of stronger action', () => {
        const model = buildAdaptiveCoachLoopModel(createAnalysisResultForCoachLoop({
            historySessionId: 'session-1',
            coachOutcomeSnapshot: {
                latest: null,
                revisions: [],
                pending: false,
                validationCta: 'Gravar validacao compativel',
                conflicts: [{
                    userOutcomeId: 'outcome-1',
                    precisionTrendLabel: 'validated_regression',
                    reason: 'Relato melhorou, trend piorou.',
                    nextValidationCopy: 'Resultado em conflito. O relato foi positivo, mas a validacao compativel piorou; faca uma validacao curta antes de avancar.',
                }],
            },
        }));

        expect(model).toMatchObject({
            state: 'conflict',
            statusLabel: 'Resultado em conflito',
            warningCopy: expect.stringContaining('validacao compativel piorou'),
            cta: {
                label: 'Gravar validacao compativel',
                href: '/spray-lab?sourceSessionId=session-1',
                tone: 'error',
            },
        });
        expect(model?.badges.some((badge) => badge.key === 'conflict')).toBe(true);
    });
});
