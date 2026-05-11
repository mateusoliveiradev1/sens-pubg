import { describe, expect, it } from 'vitest';

import {
    resolveProductAccess,
    type ProductAccessResolution,
    type ProductFeatureAccess,
} from './product-entitlements';
import {
    createPremiumProjectionSummary,
    isPremiumFeatureGranted,
    projectCompleteTrainingProtocolForAccess,
    projectAnalysisForAccess,
} from './premium-projection';
import type { AnalysisResult, CoachPlan, CompleteTrainingProtocol, SprayMastery } from '@/types/engine';
import type { ProductEntitlementKey, ProductQuotaSummary } from '@/types/monetization';

const now = new Date('2026-05-06T12:00:00.000Z');

const socialProActionFeatureKeys = [
    'community.premium_report_share',
    'community.pro_library',
    'community.private_report_links',
    'community.creator_analytics',
    'community.advanced_context',
    'community.pro_badge',
] as const satisfies readonly ProductEntitlementKey[];

const teamCoachFeatureKeys = [
    'team.player_review',
    'team.seats',
] as const satisfies readonly ProductEntitlementKey[];

function normalizeCopy(copy: string): string {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function quota(overrides: Partial<ProductQuotaSummary> = {}): ProductQuotaSummary {
    return {
        tier: 'free',
        limit: 3,
        used: 1,
        remaining: 2,
        state: 'available',
        periodStart: new Date('2026-05-01T00:00:00.000Z'),
        periodEnd: new Date('2026-06-01T00:00:00.000Z'),
        warningAt: 2,
        reason: null,
        ...overrides,
    };
}

function coachPlan(): CoachPlan {
    return {
        tier: 'test_protocol',
        sessionSummary: 'Plano completo para validar um bloco curto.',
        primaryFocus: {
            id: 'vertical',
            area: 'vertical_control',
            title: 'Controle vertical',
            whyNow: 'Vertical ainda decide o bloco.',
            priorityScore: 0.8,
            severity: 0.8,
            confidence: 0.84,
            coverage: 0.86,
            dependencies: [],
            blockedBy: [],
            signals: [],
        },
        secondaryFocuses: [{
            id: 'timing',
            area: 'timing',
            title: 'Timing',
            whyNow: 'Entrada inicial oscilou.',
            priorityScore: 0.4,
            severity: 0.4,
            confidence: 0.7,
            coverage: 0.8,
            dependencies: [],
            blockedBy: [],
            signals: [],
        }],
        actionProtocols: [{
            id: 'drill-1',
            kind: 'drill',
            instruction: 'Faca tres sprays comparaveis.',
            expectedEffect: 'Validar controle vertical.',
            risk: 'low',
            applyWhen: 'Quando a captura estiver usavel.',
        }],
        nextBlock: {
            title: 'Bloco vertical curto',
            durationMinutes: 12,
            steps: ['Spray 1', 'Spray 2', 'Spray 3'],
            checks: [{
                label: 'Validacao',
                target: 'vertical_control',
                minimumCoverage: 0.75,
                minimumConfidence: 0.75,
                successCondition: 'Melhora sem perder cobertura.',
                failCondition: 'Sem melhora.',
            }],
        },
        stopConditions: ['Pare se a captura cair.'],
        adaptationWindowDays: 3,
        llmRewriteAllowed: false,
        completeProtocol: completeProtocol(),
    };
}

function completeProtocol(overrides: Partial<CompleteTrainingProtocol> = {}): CompleteTrainingProtocol {
    return {
        version: 'complete-protocol-v1',
        id: 'complete-protocol-1',
        drillId: 'vertical_recoil_lane',
        tier: 'test_protocol',
        title: 'Ficha vertical',
        summary: 'Bloco completo para controle vertical.',
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
            patchVersion: '36.1',
            supportStatus: 'full',
            personalizationLimited: false,
            limitationReasons: [],
        },
        objective: 'Treinar pull vertical sem trocar variaveis.',
        dose: {
            durationMinutes: 12,
            sprayReps: 6,
            spraysPerRep: 3,
            restBetweenSpraysSeconds: 20,
            restBetweenRepsSeconds: 60,
            stopAfterMinutes: 12,
        },
        target: 'Training Mode 30m',
        executionSteps: ['Passo 1', 'Passo 2', 'Passo 3', 'Passo 4'],
        preparation: [
            { id: 'space', label: 'Espaco livre', reason: 'Controle do pull.', required: true, safetyKind: 'setup_control' },
            { id: 'grip', label: 'Grip repetivel', reason: 'Controla variavel.', required: true, safetyKind: 'variable_control' },
            { id: 'rest', label: 'Pausa curta', reason: 'Evita fadiga.', required: true, safetyKind: 'rest' },
            { id: 'stop', label: 'Parar com dor', reason: 'Seguranca.', required: true, safetyKind: 'stop_rule' },
        ],
        validation: {
            compatibleClipChecklist: ['Mesma arma', 'Mesma mira', 'Mesma distancia'],
            minimumConfidence: 0.75,
            minimumCoverage: 0.8,
            successCriteria: ['VCI melhora'],
            failCriteria: ['Cobertura cai'],
            variableControlChecklist: ['Nao trocar grip', 'Nao trocar sens'],
            nextClipCopy: 'Grave o proximo clip igual.',
        },
        transfer: {
            situationChecklist: ['TDM curta', 'Mesma arma/mira'],
            conservativeConfidenceCopy: 'Transferencia nao substitui validacao compativel.',
            countsAsTechnicalValidation: false,
        },
        downgrade: {
            tierBefore: 'test_protocol',
            tierAfter: 'test_protocol',
            reasons: ['missing_distance'],
            blockedFields: ['distance'],
            repairCtas: ['Confirmar distancia'],
            userCopy: 'Distancia limita criterio exato.',
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
        stopConditions: ['Pare se a execucao degradar.', 'Pare se houver dor.'],
        continueCriteria: ['Cobertura acima do minimo.'],
        antiMixingNotes: ['Nao misture sens e grip.'],
        freeSummary: ['Foco e duracao visiveis.'],
        proSections: ['Reps completas', 'Auditoria completa'],
        llmRewriteAllowed: false,
        ...overrides,
    };
}

function mastery(overrides: Partial<SprayMastery> = {}): SprayMastery {
    return {
        actionState: 'testable',
        actionLabel: 'Testavel',
        mechanicalLevel: 'advanced',
        mechanicalLevelLabel: 'Avancado',
        actionableScore: 74,
        mechanicalScore: 78,
        pillars: {
            control: 80,
            consistency: 70,
            confidence: 84,
            clipQuality: 82,
        },
        evidence: {
            coverage: 0.86,
            confidence: 0.84,
            visibleFrames: 86,
            lostFrames: 14,
            framesProcessed: 100,
            sampleSize: 24,
            qualityScore: 82,
            usableForAnalysis: true,
        },
        reasons: ['Leitura testavel.'],
        blockedRecommendations: [],
        ...overrides,
    };
}

function analysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
        id: 'analysis-1',
        timestamp: now,
        patchVersion: '36.1',
        trajectory: {} as AnalysisResult['trajectory'],
        loadout: {} as AnalysisResult['loadout'],
        metrics: {} as AnalysisResult['metrics'],
        diagnoses: [],
        sensitivity: {} as AnalysisResult['sensitivity'],
        coaching: [],
        coachPlan: coachPlan(),
        mastery: mastery(),
        ...overrides,
    };
}

function grantTeamEntitlements(
    access: ProductAccessResolution,
    keys: readonly ProductEntitlementKey[],
): ProductAccessResolution {
    const features = { ...access.features };

    for (const key of keys) {
        const existing = features[key];
        features[key] = {
            key,
            granted: true,
            source: 'manual_grant',
            tier: 'team',
            gatingMode: existing?.gatingMode ?? 'requires_team',
        } satisfies ProductFeatureAccess;
    }

    return {
        ...access,
        features,
    };
}

describe('premium projection policy', () => {
    it('keeps Free useful with truth evidence while locking full Pro loop features', () => {
        const access = resolveProductAccess({ now, quota: quota() });
        const projected = projectAnalysisForAccess(analysisResult(), access);

        expect(projected.mastery?.evidence).toMatchObject({
            coverage: 0.86,
            confidence: 0.84,
            usableForAnalysis: true,
        });
        expect(projected.coachPlan?.primaryFocus.title).toBe('Controle vertical');
        expect(projected.coachPlan?.actionProtocols).toEqual([]);
        expect(projected.coachPlan?.nextBlock.steps).toHaveLength(1);
        expect(projected.coachPlan?.completeProtocol?.dose.durationMinutes).toBe(12);
        expect(projected.coachPlan?.completeProtocol?.dose.sprayReps).toBeLessThan(6);
        expect(projected.coachPlan?.completeProtocol?.proSections).toEqual([]);
        expect(projected.premiumProjection?.canSeeFullCoachPlan).toBe(false);
        expect(projected.premiumProjection?.locks).toContainEqual(expect.objectContaining({
            featureKey: 'coach.full_plan',
            reason: 'pro_feature',
        }));
        expect(projected.premiumProjection?.locks).toContainEqual(expect.objectContaining({
            featureKey: 'programs.guided_monthly',
            reason: 'pro_feature',
            body: expect.stringContaining('Ciclo Pro de 30 dias'),
        }));
    });

    it('returns the full coach and advanced loop when Pro entitlement exists', () => {
        const access = resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
            quota: quota({
                tier: 'pro',
                limit: 100,
                used: 4,
                remaining: 96,
                warningAt: 80,
            }),
        });
        const projected = projectAnalysisForAccess(analysisResult(), access);

        expect(projected.coachPlan?.actionProtocols).toHaveLength(1);
        expect(projected.coachPlan?.nextBlock.steps).toHaveLength(3);
        expect(projected.coachPlan?.completeProtocol).toEqual(coachPlan().completeProtocol);
        expect(projected.premiumProjection?.canSeeFullCoachPlan).toBe(true);
        expect(projected.premiumProjection?.canSeeAdvancedMetrics).toBe(true);
        expect(projected.premiumProjection?.visibleFeatureKeys).toEqual(expect.arrayContaining([
            'programs.guided_weekly',
            'programs.guided_monthly',
        ]));
    });

    it('projects complete protocols directly for Free and Pro access', () => {
        const protocol = completeProtocol();
        const freeProjection = createPremiumProjectionSummary(resolveProductAccess({ now }), analysisResult());
        const proProjection = createPremiumProjectionSummary(resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
        }), analysisResult());

        expect(projectCompleteTrainingProtocolForAccess(protocol, freeProjection)).toEqual(expect.objectContaining({
            version: 'complete-protocol-v1',
            dose: expect.objectContaining({ durationMinutes: 12, sprayReps: 3 }),
            executionSteps: ['Passo 1', 'Passo 2', 'Passo 3'],
            proSections: [],
        }));
        expect(projectCompleteTrainingProtocolForAccess(protocol, proProjection)).toBe(protocol);
    });

    it('uses payment issue and limit reasons instead of fake blurred values', () => {
        const pastDue = resolveProductAccess({
            now,
            subscription: {
                status: 'past_due',
                tier: 'pro',
                currentPeriodEnd: new Date('2026-04-30T00:00:00.000Z'),
                graceEndsAt: new Date('2026-05-01T00:00:00.000Z'),
            },
        });
        const limited = resolveProductAccess({
            now,
            quota: quota({
                used: 3,
                remaining: 0,
                state: 'limit_reached',
                reason: 'limit_blocked',
            }),
        });

        expect(createPremiumProjectionSummary(pastDue).locks).toContainEqual(expect.objectContaining({
            featureKey: 'coach.full_plan',
            reason: 'payment_issue',
            ctaHref: '/billing',
            body: expect.stringContaining('billing voltar para um estado confiavel'),
        }));
        expect(createPremiumProjectionSummary(limited).locks).toContainEqual(expect.objectContaining({
            featureKey: 'coach.full_plan',
            reason: 'limit_reached',
            ctaHref: '/pricing',
            body: expect.stringContaining('limite atual atingido'),
        }));
    });

    it('marks not enough compatible history as a data blocker, not a paywall claim', () => {
        const projection = createPremiumProjectionSummary(
            resolveProductAccess({ now }),
            analysisResult({
                precisionTrend: {
                    label: 'baseline',
                    evidenceLevel: 'baseline',
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
                    confidence: 0.8,
                    coverage: 0.8,
                    nextValidationHint: 'Grave outro clip compativel.',
                },
            }),
        );

        expect(projection.locks).toContainEqual(expect.objectContaining({
            featureKey: 'trends.compatible_full',
            reason: 'not_enough_history',
            ctaHref: null,
            body: expect.stringContaining('faltam clips compativeis'),
        }));
        expect(isPremiumFeatureGranted(projection, 'coach.summary')).toBe(true);
    });

    it('explains every lock as visible now, Pro value, and the immediate blocker reason', () => {
        const freeProjection = createPremiumProjectionSummary(resolveProductAccess({ now }), analysisResult());
        const weakProjection = createPremiumProjectionSummary(
            resolveProductAccess({ now }),
            analysisResult({
                mastery: mastery({
                    evidence: {
                        ...mastery().evidence,
                        usableForAnalysis: false,
                    },
                }),
            }),
        );
        const proFeatureLock = freeProjection.locks.find((lock) => lock.reason === 'pro_feature');
        const weakEvidenceLock = weakProjection.locks.find((lock) => lock.reason === 'weak_evidence');

        expect(proFeatureLock?.body).toContain('Visivel agora');
        expect(proFeatureLock?.body).toContain('Com Pro');
        expect(proFeatureLock?.body).toContain('continuidade Pro');
        expect(freeProjection.locks.find((lock) => lock.featureKey === 'training.next_block_protocol')?.body)
            .toContain('Pro adiciona reps');
        expect(weakEvidenceLock?.body).toContain('confianca, cobertura, bloqueios e estado inconclusivo');
        expect(weakEvidenceLock?.ctaHref).toBeNull();
    });

    it('adds contextual Social Pro locks without changing public community reading', () => {
        const projection = createPremiumProjectionSummary(resolveProductAccess({ now }), analysisResult());
        const socialLocks = socialProActionFeatureKeys.map((featureKey) => {
            const lock = projection.locks.find((candidate) => candidate.featureKey === featureKey);

            expect(lock, `${featureKey} should have a contextual Social Pro lock`).toBeDefined();
            expect(lock?.reason).toBe('pro_feature');
            expect(lock?.ctaHref).toBe('/pricing');

            return lock;
        });
        const combinedCopy = normalizeCopy(socialLocks.map((lock) => lock?.body ?? '').join(' '));

        expect(combinedCopy).toContain('free mantem a leitura publica');
        expect(combinedCopy).toContain('relatorio');
        expect(combinedCopy).toContain('biblioteca');
        expect(combinedCopy).toContain('auditoria');
        expect(combinedCopy).toContain('spray lab');
        expect(combinedCopy).toContain('ciclo pro');
        expect(combinedCopy).toContain('historico');
        expect(combinedCopy).toContain('coach');
        expect(combinedCopy).toContain('protocolos');
        expect(combinedCopy).toContain('validacao compativel');
        expect(combinedCopy).not.toContain('banner generico');
        expect(combinedCopy).not.toContain('feed passivo');
        expect(combinedCopy).not.toContain('melhora garantida');
        expect(combinedCopy).not.toContain('sensibilidade perfeita');
        expect(combinedCopy).not.toContain('api pubg exclusiva');

        expect(projection.canGenerateSocialProReport).toBe(false);
        expect(projection.canUseSocialProLibrary).toBe(false);
        expect(projection.canManageSocialProPrivateLinks).toBe(false);
        expect(projection.canReadCreatorAnalytics).toBe(false);
        expect(projection.canUseAdvancedSocialContext).toBe(false);
        expect(projection.canDisplaySocialProBadge).toBe(false);
    });

    it('marks Social Pro capabilities visible only for trusted Pro access', () => {
        const projection = createPremiumProjectionSummary(resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
        }), analysisResult());

        for (const featureKey of socialProActionFeatureKeys) {
            expect(projection.visibleFeatureKeys).toContain(featureKey);
            expect(projection.hiddenFeatureKeys).not.toContain(featureKey);
            expect(projection.locks).not.toContainEqual(expect.objectContaining({ featureKey }));
        }
        expect(projection.canGenerateSocialProReport).toBe(true);
        expect(projection.canUseSocialProLibrary).toBe(true);
        expect(projection.canManageSocialProPrivateLinks).toBe(true);
        expect(projection.canReadCreatorAnalytics).toBe(true);
        expect(projection.canUseAdvancedSocialContext).toBe(true);
        expect(projection.canDisplaySocialProBadge).toBe(true);
    });

    it('shows Team Coach locks without implying solo Pro or Social Pro grants coach authority', () => {
        const projection = createPremiumProjectionSummary(resolveProductAccess({ now }), analysisResult());
        const proProjection = createPremiumProjectionSummary(resolveProductAccess({
            now,
            subscription: {
                status: 'active',
                tier: 'pro',
                currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
            },
        }), analysisResult());

        for (const featureKey of teamCoachFeatureKeys) {
            const lock = projection.locks.find((candidate) => candidate.featureKey === featureKey);
            const proLock = proProjection.locks.find((candidate) => candidate.featureKey === featureKey);

            expect(lock, `${featureKey} should have a Team lock`).toBeDefined();
            expect(proLock, `${featureKey} should stay locked for solo Pro`).toBeDefined();
            expect(lock?.body).toContain('Com Team');
            expect(lock?.body).toContain('acesso Team separado');
            expect(lock?.body).toContain('solo Pro e Social Pro nao concedem autoridade de coach');
            expect(normalizeCopy(lock?.body ?? '')).not.toContain('rank garantido');
            expect(normalizeCopy(lock?.body ?? '')).not.toContain('certificacao');
        }
        expect(projection.canUseTeamPlayerReview).toBe(false);
        expect(projection.canManageTeamSeats).toBe(false);
        expect(proProjection.canUseTeamPlayerReview).toBe(false);
        expect(proProjection.canManageTeamSeats).toBe(false);
    });

    it('marks Team Coach capabilities visible only when server-owned Team entitlements are present', () => {
        const projection = createPremiumProjectionSummary(
            grantTeamEntitlements(resolveProductAccess({
                now,
                subscription: {
                    status: 'active',
                    tier: 'pro',
                    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
                    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
                },
            }), teamCoachFeatureKeys),
            analysisResult(),
        );

        for (const featureKey of teamCoachFeatureKeys) {
            expect(projection.visibleFeatureKeys).toContain(featureKey);
            expect(projection.hiddenFeatureKeys).not.toContain(featureKey);
            expect(projection.locks).not.toContainEqual(expect.objectContaining({ featureKey }));
        }
        expect(projection.canUseTeamPlayerReview).toBe(true);
        expect(projection.canManageTeamSeats).toBe(true);
    });
});
